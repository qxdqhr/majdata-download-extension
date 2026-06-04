# Majdata Net 站点调研报告

> 调研时间：2026-06-04  
> 数据来源：[TeamMajdata/MajdataNet](https://github.com/TeamMajdata/MajdataNet) 开源代码（main 分支）+ 线上站点结构

## 1. 站点概况

| 项 | 内容 |
|----|------|
| 域名 | `https://majdata.net` |
| 类型 | React 19 SPA（Vite 7 构建） |
| API 前缀 | `/api3/api` |
| 认证 | Cookie（`credentials: 'include'` / `withCredentials: true`） |
| 国际化 | zh / en / ja / ko（`public/i18n/`） |

站点为 PWA，主要路由包括首页谱面列表、谱面详情 `/song?id=`、用户空间、活动、排行榜、歌单收藏等。

## 2. 下载功能核心机制

### 2.1 入口位置

源码中调用 `downloadSong()` 的位置（已确认）：

| 文件 | 场景 |
|------|------|
| `src/components/song/SongCard.tsx` | 首页 / 排行榜 / 搜索结果等列表卡片上的下载图标按钮 |
| `src/pages/SongPage.tsx` | 谱面详情页「下载」文字按钮 |

未发现其他页面直接调用 `downloadSong`（歌单页仅管理收藏，不触发打包下载）。

### 2.2 下载流程（`src/utils/download.ts`）

```
用户点击下载
    ↓
并行请求 4 个 API（axios blob）
    ├── GET /api3/api/maichart/{id}/track      → track.mp3
    ├── GET /api3/api/maichart/{id}/image?fullImage=true → bg.jpg
    ├── GET /api3/api/maichart/{id}/chart      → maidata.txt
    └── GET /api3/api/maichart/{id}/video      → pv.mp4（可选，失败不阻断）
    ↓
JSZip 打包
    ↓
读取 localStorage.DownloadType（默认 zip，可选 adx 相关逻辑由站点设置）
    ↓
触发浏览器下载 {title}.zip
```

**关键结论：**

1. **没有单一「下载直链」**——扩展队列中应缓存「谱面 ID + 各资源 URL + 元数据」，而非某个 `<a href>`。
2. **需要 Cookie**——axios 实例 `withCredentials: true`；远端下载（阶段 2）需考虑会话或公开资源策略。
3. **标题来自 DOM**——列表页用 `stripTmpTags(song.title)`，详情页用 `o.title`（可能含富文本标记）。
4. **视频可选**——track/chart/image 三者缺一即失败；video 缺失仍成功。

### 2.3 相关 API（摘自 `api-directory.md` + `src/config/api.ts`）

| 用途 | 方法 | 路径 |
|------|------|------|
| 谱面摘要 | GET | `/maichart/{id}/summary` |
| 谱面图表 | GET | `/maichart/{id}/chart` |
| 音频 | GET | `/maichart/{id}/track` |
| 封面 | GET | `/maichart/{id}/image?fullImage=true` |
| 视频 | GET | `/maichart/{id}/video` |
| 列表 | GET | `/maichart/list?sort=&search=&page=` |

完整 URL 示例（线上）：

```
https://majdata.net/api3/api/maichart/{songId}/track
https://majdata.net/api3/api/maichart/{songId}/chart
https://majdata.net/api3/api/maichart/{songId}/image?fullImage=true
https://majdata.net/api3/api/maichart/{songId}/video
```

谱面页 URL：

```
https://majdata.net/song?id={songId}
```

## 3. DOM 与交互特征（供 Content Script 选择器设计）

### 3.1 列表页 SongCard

- 下载按钮：`onClick={handleDownload}`，内部为 inline `<svg>` 图标
- 同卡片内存在 `<Link to="/song?id={song.id}">` 可解析 **songId**
- 标题/艺术家/uploader 在相邻 DOM 节点，可通过卡片根元素向上聚合

**建议识别策略：**

1. 点击目标位于 `[data-song-card]` 或含 `/song?id=` 链接的卡片容器内
2. 且目标为 `button` / `svg` / 带 `cursor-pointer` 的下载区域
3. 或 SVG path 与 `public/download.svg` 特征匹配

### 3.2 详情页 SongPage

- 按钮：`onClick={OnDownloadClick({ id, title })}`，`title` 属性为 i18n 的 `Download`
- 可见文本：`下载` / `Download` / 其他语言
- **songId** 可直接从 `location.search` 的 `id` 参数读取

**建议识别策略：**

1. 路径匹配 `/song` 且 query 含 `id`
2. 点击元素为 button，且子节点含「下载」类文案或 `title="Download"`

## 4. 与扩展相关的站点行为

| 行为 | 影响 |
|------|------|
| React 合成事件 | 须在 **capture 阶段** 拦截，否则难以在 bubble 前插入确认框 |
| `stopPropagation`（SongCard 下载） | 扩展拦截后需自行决定是否放行原逻辑 |
| Toast 进度（react-toastify） | 直接下载路径应继续走站点原逻辑以保留进度 UI |
| 富文本标题 | 入队时需 `stripTmpTags` 等价清洗，避免导出文件名非法字符 |
| DownloadType 本地偏好 | 阶段 1 导出链接不含打包格式；阶段 2 远端可读取用户偏好或默认 zip |

## 5. 风险与约束

1. **前端改版**：选择器可能失效 → 文档化选择器 + 单元测试 fixture + 版本号检测
2. **未登录限制**：若部分谱面需登录下载，队列仅存 URL 不够，阶段 2 需传 Cookie 或 API Token
3. **CORS**：扩展 background 拉取资源时 Origin 不同，需 `host_permissions` 或 content script 代理
4. **速率限制**：批量下载可能触发服务端限流 → 阶段 2 需队列节流
5. **版权/服务条款**：工具仅辅助用户批量获取其有权下载的内容，需在 README 声明

## 6. 调研结论（对扩展设计的直接输入）

1. 队列项主键：**songId**（非 URL 哈希）
2. 导出内容：至少包含 songId、title、pageUrl、四条 asset URL
3. 直接下载：**不应重写 downloadSong**，应放行站点原 handler（bypass 重放点击）
4. 作用域：`https://majdata.net/*`（含子路径，不含其他域名镜像）
5. 阶段 2 最小输入：阶段 1 导出的 TXT/JSONL 即可驱动 wget/aria2/自研 downloader
