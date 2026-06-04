# 技术架构设计

## 1. 总览

```
┌─────────────────────────────────────────────────────────────┐
│                     https://majdata.net                      │
│  ┌──────────────┐    capture click    ┌──────────────────┐  │
│  │ SongCard /   │ ──────────────────► │ Content Script   │  │
│  │ SongPage     │                     │ (intercept.ts)   │  │
│  └──────────────┘                     └────────┬─────────┘  │
└────────────────────────────────────────────────┼────────────┘
                                                 │ chrome.runtime.sendMessage
                                                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Extension Service Worker (background)           │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ queue.ts    │  │ export.ts    │  │ badge.ts          │ │
│  │ storage R/W │  │ build txt    │  │ update icon count │ │
│  └─────────────┘  └──────────────┘  └───────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             │ chrome.storage.local
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      Popup UI (React/Vanilla)                │
│  列表 · 多选 · 导出 · 删除 · 设置                             │
└─────────────────────────────────────────────────────────────┘
```

## 2. 目录结构（拟定）

```
majdata-download-extension/
├── manifest.json
├── package.json
├── vite.config.ts
├── src/
│   ├── background/
│   │   ├── index.ts           # SW 入口，消息路由
│   │   ├── queue.ts           # 队列 CRUD
│   │   └── export.ts          # 生成导出 blob
│   ├── content/
│   │   ├── index.ts           # 注入入口
│   │   ├── intercept.ts       # 点击拦截
│   │   ├── parseSongContext.ts# 从 DOM/URL 解析谱面
│   │   ├── confirmDialog.ts   # 页内模态框（Shadow DOM）
│   │   └── toast.ts           # 轻量提示
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── components/
│   ├── options/               # P1 设置页
│   ├── shared/
│   │   ├── types.ts           # QueueItem, Message 类型
│   │   ├── urls.ts            # buildAssetUrls(songId)
│   │   ├── sanitize.ts        # 标题清洗
│   │   └── constants.ts
│   └── assets/
├── docs/
└── tests/
    ├── parseSongContext.test.ts
    └── export.test.ts
```

## 3. Manifest V3 要点

```json
{
  "manifest_version": 3,
  "name": "Majdata Download Queue",
  "version": "0.1.0",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["https://majdata.net/*"],
  "background": { "service_worker": "background.js", "type": "module" },
  "content_scripts": [{
    "matches": ["https://majdata.net/*"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }],
  "action": { "default_popup": "popup.html" }
}
```

> `host_permissions` 阶段 1 主要用于未来阶段 2 预研；阶段 1 核心逻辑可在 content script 内完成。

## 4. 核心模块设计

### 4.1 点击拦截（`intercept.ts`）

**原则：** 直接下载路径必须与未安装扩展时一致 → **不重写 `downloadSong`**。

```typescript
let bypassNextDownload = false;

document.addEventListener('click', async (e) => {
  if (bypassNextDownload) return;

  const target = findDownloadButton(e.target as Element);
  if (!target) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const ctx = parseSongContext(target);
  if (!ctx) { showToast('无法识别谱面信息'); return; }

  const choice = await showConfirmDialog(ctx.title);

  if (choice === 'direct') {
    bypassNextDownload = true;
    target.click();           // 重放点击，走站点 React handler
    bypassNextDownload = false;
  } else if (choice === 'queue') {
    await chrome.runtime.sendMessage({ type: 'QUEUE_ADD', payload: ctx });
    showToast('已加入下载列表');
  }
}, true); // capture
```

**`findDownloadButton` 启发式：**

1. 详情页：`pathname === '/song'` + button 含下载文案 / `title=Download`
2. 列表页：卡片内 SVG 下载按钮（父级存在 `a[href*="/song?id="]`）

### 4.2 谱面解析（`parseSongContext.ts`）

```typescript
interface SongContext {
  songId: string;
  title: string;
  artist?: string;
  pageUrl: string;
  assets: {
    track: string;
    chart: string;
    image: string;
    video: string;
  };
}

function buildAssetUrls(origin: string, songId: string) {
  const base = `${origin}/api3/api/maichart/${encodeURIComponent(songId)}`;
  return {
    track: `${base}/track`,
    chart: `${base}/chart`,
    image: `${base}/image?fullImage=true`,
    video: `${base}/video`,
  };
}
```

解析优先级：

1. URL `?id=`（详情页）
2. 最近祖先 `a[href*="song?id="]`
3. 可选：fetch summary API 补全 title（异步，P1）

### 4.3 队列存储（`queue.ts`）

```typescript
interface QueueItem {
  songId: string;
  title: string;
  artist?: string;
  pageUrl: string;
  assets: AssetUrls;
  addedAt: string;   // ISO8601
  updatedAt: string;
}

interface QueueState {
  items: QueueItem[];
  version: 1;
}
```

操作：

- `add(item)` — upsert by songId
- `remove(songIds[])`
- `list()` — 按 addedAt 降序
- `clear()`

### 4.4 消息协议

| type | 方向 | payload | 响应 |
|------|------|---------|------|
| `QUEUE_ADD` | CS → BG | `SongContext` | `{ ok, duplicate? }` |
| `QUEUE_LIST` | Popup → BG | — | `QueueItem[]` |
| `QUEUE_REMOVE` | Popup → BG | `{ songIds }` | `{ ok }` |
| `QUEUE_EXPORT` | Popup → BG | `{ songIds, format }` | `{ filename, content }` |
| `QUEUE_COUNT` | Popup → BG | — | `{ count }` |

### 4.5 确认框（`confirmDialog.ts`）

- 使用 **Shadow DOM** 隔离样式，避免与 Tailwind 冲突
- 支持键盘：Esc 取消、Enter 默认选第一项
- z-index 足够高（如 2147483646）
- 不依赖 React，减小 content script 体积

### 4.6 Popup UI

阶段 1 可用 **Preact / 原生 DOM** 减小体积；若团队熟悉 React 且用 WXT，可用 React。

状态：

- `items: QueueItem[]`
- `selected: Set<string>`（songId）

导出流程：

1. Popup 发送 `QUEUE_EXPORT`
2. Background 生成 UTF-8 文本
3. Popup 用 `URL.createObjectURL` + `<a download>` 触发保存

## 5. 直接下载 bypass 的边界情况

| 场景 | 处理 |
|------|------|
| 用户快速连点 | debounce 确认框；bypass  flag 仅单次 click 有效 |
| 确认框打开时站点路由变化 | 关闭对话框 abort |
| React 18+ 事件委托 | capture 阶段仍早于 React root 委托，实测验证 |
| Shadow DOM 内按钮 | 若站点未来 Shadow 化，需扩展选择器 |

## 6. 测试策略

| 层级 | 内容 |
|------|------|
| 单元 | `parseSongContext` fixture HTML、`buildAssetUrls`、`export` 格式 |
| 手动 | 首页卡片 / 详情页 各 3 首：直接下载、入队、导出 |
| 回归 | 对 MajdataNet release tag 记录兼容版本 |

## 7. 构建工具选型

| 方案 | 优点 | 缺点 |
|------|------|------|
| **WXT** | MV3 友好、HMR、多浏览器 | 新依赖 |
| CRXJS + Vite | 灵活 | MV3 HMR 配置稍繁 |

**推荐：WXT + TypeScript**，开发效率更高。

## 8. 安全与隐私

- 数据仅存本地 `chrome.storage.local`
- 不向第三方服务器发送队列
- 导出文件由用户自行保管
- 阶段 2 若需 Cookie，必须用户显式配置远端，扩展不默认上传

## 9. 与阶段 2 的接口预留

Background `export.ts` 输出格式与 [06-export-format.md](./06-export-format.md) 对齐，使阶段 2 的 CLI 可：

```bash
majdata-fetch --input queue.txt --out ./charts/
```

无需修改阶段 1 导出文件即可消费。
