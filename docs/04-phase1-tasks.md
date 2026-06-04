# 子任务拆分（全项目）

> 阶段 1（v0.1）已完成 ✅ · 下一步：阶段 1.5 → 阶段 2  
> 路线图见 [09-roadmap.md](./09-roadmap.md)

---

## 阶段 1 — 已完成（v0.1）

| Epic | 状态 |
|------|------|
| A 脚手架 | ✅ |
| B Content 拦截 | ✅ |
| C 确认框 | ✅ |
| D Background 队列 | ✅ |
| E Popup | ✅ |
| F 导出 TXT | ✅ |
| H QA 发布 | ✅（tag v0.1） |
| G 设置页 | ⏭ 移至阶段 1.5 Epic I |

---

## 阶段 1.5 — 设置 · 导入 · JSON 导出（v0.2）

> PRD：[07-phase1.5-prd.md](./07-phase1.5-prd.md)

### Epic I — Options 设置页

| ID | 任务 | 产出 | 验收 | 预估 |
|----|------|------|------|------|
| I-1 | 设置 storage 模块 | `src/shared/settings.ts`, `ExportFormat` 类型 | 读写 `chrome.storage.sync` | 2h |
| I-2 | Options 页面 | `src/entrypoints/options.html` + `main.ts` | 可配置 exportFormat、importMergeStrategy | 3h |
| I-3 | manifest + 入口 | `options_ui` / action 链接 | 扩展管理页可打开选项 | 1h |
| I-4 | Popup ⚙ 跳转 | popup 顶栏按钮 | 点击打开 options | 0.5h |

### Epic J — 导出格式双轨（TXT / JSON）

| ID | 任务 | 产出 | 验收 | 预估 |
|----|------|------|------|------|
| J-1 | JSON 导出器 | `buildQueueExportJson()` | 符合 06-export-format §3 | 2h |
| J-2 | 统一 export 入口 | `export.ts` 读 settings | txt/json 文件名、内容正确 | 1h |
| J-3 | 导出单测 | snapshot JSON + TXT | round-trip 基础 | 2h |

### Epic K — 导入（TXT + JSON）

| ID | 任务 | 产出 | 验收 | 预估 |
|----|------|------|------|------|
| K-1 | 格式自动检测 | `detectQueueFileFormat()` | 识别 txt/json/jsonl | 2h |
| K-2 | JSON 解析器 | `parseQueueJson()` | 缺 assets 时补全 URL | 2h |
| K-3 | 导入合并逻辑 | `importQueueItems()` merge/replace | AC-11 AC-12 | 2h |
| K-4 | Popup 导入 UI | 文件选择 + 结果提示 | 导入后列表刷新 | 2h |
| K-5 | 消息 `QUEUE_IMPORT` | background 路由 | 大文件不阻塞 UI | 1h |

**阶段 1.5 合计：~17.5h（约 2.5 人日）**

---

## 阶段 2 — 批量下载谱面 · 歌单 ZIP（v0.3）

> PRD：[08-phase2-prd-batch-download.md](./08-phase2-prd-batch-download.md)

### Epic L — 单曲资源下载与目录结构

| ID | 任务 | 产出 | 验收 | 预估 |
|----|------|------|------|------|
| L-1 | 添加 jszip 依赖 | package.json | build 通过 | 0.5h |
| L-2 | 单曲 fetch 模块 | `src/shared/fetchChartAssets.ts` | credentials:include；四文件命名与站点一致 | 4h |
| L-3 | 文件夹名清洗 | `sanitizeFolderName(title)` | 非法字符、重名后缀 | 2h |
| L-4 | 单曲打包单测 | mock fetch | 输出结构 = `Break Through Myself/` 示例 | 3h |

**单曲目录目标：**

```
{曲名}/
  track.mp3
  bg.jpg
  maidata.txt
  pv.mp4   # 可选
```

### Epic M — 批量 Job 与歌单 ZIP

| ID | 任务 | 产出 | 验收 | 预估 |
|----|------|------|------|------|
| M-1 | BatchJob 状态机 | `src/background/batchDownload.ts` | progress、errors、cancel | 4h |
| M-2 | 聚合 ZIP | 多子文件夹 + manifest.json | AC-13 AC-14 | 4h |
| M-3 | 并发与上限 | settings.batchConcurrency；≤50 首提示 | 不 OOM | 2h |
| M-4 | 消息协议 | `BATCH_START` / `BATCH_PROGRESS` / `BATCH_DONE` | Popup 可订阅 | 2h |

### Epic N — Popup 进度与 downloads 权限

| ID | 任务 | 产出 | 验收 | 预估 |
|----|------|------|------|------|
| N-1 | manifest `downloads` 权限 | wxt.config | 可保存 ZIP | 0.5h |
| N-2 | Popup「批量下载」按钮 | 选中/全部 | 下载中禁用 | 2h |
| N-3 | 进度 UI | 进度条 + `3/12 曲名` | AC-17 | 2h |
| N-4 | 完成通知 | 成功/失败数 + manifest 摘要 | 用户可感知失败条目 | 1h |
| N-5 | Options 批量相关设置 | batchConcurrency 等 | 见 08-phase2 §5.3 | 1h |

**阶段 2 合计：~28h（约 4 人日）**

---

## 阶段 3 — 远端 CLI（可选，v0.4+）

见 [05-phase2-outlook.md](./05-phase2-outlook.md)（已重命名为阶段 3 展望）。

| ID | 任务 | 预估 |
|----|------|------|
| P3-1 ~ P3-6 | CLI / Agent | ~46h |

---

## 全项目推荐实施顺序

```mermaid
graph LR
  subgraph done [v0.1 已完成]
    P1[队列+TXT导出]
  end
  subgraph v02 [v0.2]
    I[Epic I 设置页]
    J[Epic J JSON导出]
    K[Epic K 导入]
  end
  subgraph v03 [v0.3]
    L[Epic L 单曲fetch]
    M[Epic M 批量ZIP]
    N[Epic N 进度UI]
  end
  P1 --> I
  I --> J
  J --> K
  K --> L
  L --> M
  M --> N
```

---

## 阶段 1 原始任务存档

> 以下 Epic A–H 为 v0.1 实施记录，均已交付。

## Epic A — 项目脚手架

### A-1 初始化工程

| 项 | 内容 |
|----|------|
| 目标 | 可加载的空扩展 |
| 产出 | WXT/CRXJS 项目、`manifest.json`、`pnpm dev` 可构建 |
| 验收 | Chrome「加载已解压的扩展程序」无报错 |
| 预估 | 2h |
| 依赖 | 无 |

**检查清单：**

- [ ] TypeScript strict
- [ ] ESLint
- [ ] path alias `@/` → `src/`

### A-2 共享类型与工具

| 项 | 内容 |
|----|------|
| 目标 | 统一 `QueueItem`、`SongContext`、消息类型 |
| 产出 | `src/shared/types.ts`, `urls.ts`, `sanitize.ts` |
| 验收 | 单元测试 `buildAssetUrls('abc')` 四条 URL 正确 |
| 预估 | 2h |
| 依赖 | A-1 |

---

## Epic B — Content Script 拦截

### B-1 下载按钮识别

| 项 | 内容 |
|----|------|
| 目标 | 可靠识别列表/详情下载按钮 |
| 产出 | `findDownloadButton()`, `isMajdataDownloadClick()` |
| 验收 | 手动：首页 ≥5 张卡片、详情页 ≥3 首，识别率 100% |
| 预估 | 4h |
| 依赖 | A-2 |

**实现提示：**

- 详情页：`location.pathname.endsWith('/song')`
- 列表页：从 `public/download.svg` 提取 path `d` 属性做 SVG 匹配（更稳 than class）

### B-2 谱面上下文解析

| 项 | 内容 |
|----|------|
| 目标 | 从 DOM/URL 得到 songId + title + assets |
| 产出 | `parseSongContext.ts` |
| 验收 | fixture HTML 单测 ≥6 case（详情/列表/缺 artist/富文本标题） |
| 预估 | 4h |
| 依赖 | B-1 |

### B-3 Capture 拦截 + Bypass

| 项 | 内容 |
|----|------|
| 目标 | 拦截下载点击；直接下载重放原 handler |
| 产出 | `intercept.ts` |
| 验收 | AC-1 AC-2：装/不装扩展对比 ZIP 下载一致 |
| 预估 | 4h |
| 依赖 | B-1, B-2 |

---

## Epic C — 确认框与反馈

### C-1 页内 Modal

| 项 | 内容 |
|----|------|
| 目标 | Shadow DOM 模态框，三按钮 |
| 产出 | `confirmDialog.ts` + 基础样式 |
| 验收 | 不污染页面 CSS；Esc/取消有效 |
| 预估 | 3h |
| 依赖 | A-2 |

### C-2 Toast 提示

| 项 | 内容 |
|----|------|
| 目标 | 入队成功/失败轻提示 |
| 产出 | `toast.ts` |
| 验收 | 3s 自动消失，不阻挡操作 |
| 预估 | 1h |
| 依赖 | C-1 |

---

## Epic D — Background 队列

### D-1 Storage CRUD

| 项 | 内容 |
|----|------|
| 目标 | 队列增删改查 + songId 去重 |
| 产出 | `background/queue.ts` |
| 验收 | AC-3 AC-4；重启浏览器数据仍在 |
| 预估 | 3h |
| 依赖 | A-2 |

### D-2 消息路由

| 项 | 内容 |
|----|------|
| 目标 | 处理 `QUEUE_*` 消息 |
| 产出 | `background/index.ts` |
| 验收 | DevTools service worker 无 unhandled rejection |
| 预估 | 2h |
| 依赖 | D-1 |

### D-3 Badge 计数（P2）

| 项 | 内容 |
|----|------|
| 目标 | 工具栏图标显示队列数量 |
| 验收 | 入队 +1，清空归零 |
| 预估 | 1h |
| 依赖 | D-1 |

---

## Epic E — Popup 界面

### E-1 列表展示

| 项 | 内容 |
|----|------|
| 目标 | 展示队列，空状态 |
| 产出 | `popup/App.tsx` |
| 验收 | 10+ 条目滚动正常；点击标题打开谱面页 |
| 预估 | 4h |
| 依赖 | D-2 |

### E-2 多选与批量操作

| 项 | 内容 |
|----|------|
| 目标 | 全选、单选、删除选中/全部 |
| 验收 | 删除后 storage 同步；Popup 即时刷新 |
| 预估 | 3h |
| 依赖 | E-1 |

### E-3 导出入口

| 项 | 内容 |
|----|------|
| 目标 | 导出选中/全部 TXT |
| 产出 | 调用 `QUEUE_EXPORT` + 触发下载 |
| 验收 | AC-5 |
| 预估 | 2h |
| 依赖 | E-2, F-1 |

---

## Epic F — 导出模块

### F-1 TXT 生成器

| 项 | 内容 |
|----|------|
| 目标 | 按 [06-export-format.md](./06-export-format.md) 输出 |
| 产出 | `background/export.ts` |
| 验收 | 单测：2 条目导出字符串 snapshot |
| 预估 | 2h |
| 依赖 | A-2 |

---

## Epic G — 设置与打磨（P1）

### G-1 Options 页

| 项 | 内容 |
|----|------|
| 目标 | 开关拦截、默认动作、队列上限 |
| 预估 | 3h |

### G-2 国际化

| 项 | 内容 |
|----|------|
| 目标 | 扩展 UI 中英文（`_locales`） |
| 预估 | 2h |

---

## Epic H —  QA 与发布

### H-1 手动测试矩阵

| 浏览器 | 场景 |
|--------|------|
| Chrome 最新 | 全流程 |
| Edge 最新 | 全流程 |
| Firefox | 评估 MV3 兼容（可选） |

### H-2 文档与版本

| 项 | 内容 |
|----|------|
| 产出 | CHANGELOG v0.1.0、README 安装说明 |
| 预估 | 1h |

---

## 推荐实施顺序（关键路径）

```mermaid
graph LR
  A1[A-1 脚手架] --> A2[A-2 共享类型]
  A2 --> B1[B-1 按钮识别]
  B1 --> B2[B-2 解析]
  B2 --> B3[B-3 拦截]
  A2 --> C1[C-1 Modal]
  C1 --> B3
  B3 --> D1[D-1 Storage]
  D1 --> D2[D-2 消息]
  A2 --> F1[F-1 导出]
  D2 --> E1[E-1 Popup]
  E1 --> E2[E-2 多选]
  E2 --> E3[E-3 导出联调]
  F1 --> E3
  E3 --> H1[H-1 QA]
```

## 工时汇总

| Epic | 预估 |
|------|------|
| A 脚手架 | 4h |
| B 拦截 | 12h |
| C UI 反馈 | 4h |
| D Background | 6h |
| E Popup | 9h |
| F 导出 | 2h |
| H QA | 4h |
| **P0 合计** | **~41h（约 5 人日）** |
| G P1 | +5h |

## Definition of Done（阶段 1 完成定义）

1. 所有 P0 任务验收通过
2. README 含安装步骤与已知限制
3. 至少 1 次对 MajdataNet `main` 分支对应线上行为的手动回归
4. 导出文件可被简单脚本解析（见 `06-export-format.md` 参考解析器）
