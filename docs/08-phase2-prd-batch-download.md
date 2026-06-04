# 产品需求文档 — 阶段 2（批量下载谱面 · 歌单压缩包）

> 依赖：阶段 1.5（设置与导入导出）  
> 目标版本：**v0.3**

## 1. 概述

用户在 Popup 中基于**当前歌曲列表**（全部或选中），一键 **批量下载谱面资源**，在浏览器内打包为 **单个 ZIP**，内含与 Majdata Net 站点一致的单曲目录结构。

参考：用户本机已下载单曲目录示例：

```
/home/qhr/Downloads/Break Through Myself/
├── track.mp3      # 音频
├── bg.jpg         # 封面（fullImage）
├── maidata.txt    # 谱面 chart
└── pv.mp4         # 背景视频（可选，缺失时不阻断）
```

站点源码 `MajdataNet/src/utils/download.ts` 单首下载逻辑：并行拉取上述 4 个 API → JSZip 打为 `{title}.zip`。阶段 2 在扩展内 **复现同等文件命名与内容**，再聚合为歌单级压缩包。

## 2. 用户故事

| ID | 作为 | 我想要 | 以便 |
|----|------|--------|------|
| US-11 | 批量用户 | 在 Popup 点击「批量下载选中/全部」 | 一次拿到歌单所有谱面 |
| US-12 | 批量用户 | 看到下载进度（当前第几首/共几首） | 知道还要等多久 |
| US-13 | 批量用户 | 某首失败时不中断整个任务 | 其余曲目仍能下载 |
| US-14 | 批量用户 | 最终得到一个 ZIP | 方便拷贝到游戏目录或 NAS |
| US-15 | 批量用户 | 文件夹名与曲名一致 | 与现有 `Downloads/曲名/` 习惯一致 |

## 3. 单曲目录规范

与站点 ZIP 解压后一致（**文件夹名 = 清洗后的 title**）：

| 文件 | 来源 API | 必填 |
|------|----------|------|
| `track.mp3` | `/maichart/{id}/track` | 是 |
| `bg.jpg` | `/maichart/{id}/image?fullImage=true` | 是 |
| `maidata.txt` | `/maichart/{id}/chart` | 是 |
| `pv.mp4` | `/maichart/{id}/video` | 否 |

**文件夹命名规则：**

- 使用 `sanitizeTitle(title)`，去除非法路径字符（`/ \ : * ? " < > |`）
- 重名时追加 `_2`、`_3` 或短 `songId` 后缀
- 最大长度建议 80 字符，超出截断

## 4. 歌单压缩包规范

**外层 ZIP 结构：**

```
majdata-playlist-YYYYMMDD-HHmmss.zip
├── Break Through Myself/
│   ├── track.mp3
│   ├── bg.jpg
│   ├── maidata.txt
│   └── pv.mp4
├── 另一首曲名/
│   ├── track.mp3
│   ├── bg.jpg
│   └── maidata.txt
└── manifest.json          # 可选：下载报告
```

**manifest.json（建议包含）：**

```json
{
  "version": "MAJDATA-PLAYLIST v1",
  "exportedAt": "2026-06-04T06:00:00.000Z",
  "origin": "https://majdata.net",
  "total": 12,
  "success": 11,
  "failed": [{ "songId": "...", "title": "...", "error": "..." }]
}
```

## 5. 功能需求

### 5.1 批量下载引擎（F-10）

**位置：** Background Service Worker（`src/background/batchDownload.ts`）

**依赖：** `jszip`（与 MajdataNet 同源方案）

**流程：**

```
用户点击「批量下载」
  → 读取选中 QueueItem[]
  → 创建 BatchJob 状态（progress, errors）
  → for each item（可配置并发 1~2）:
       fetch track/chart/image/video (credentials: include)
       写入 JSZip 子目录 {folderName}/...
  → 生成外层 ZIP blob
  → chrome.downloads.download 或 返回 blob 给 Popup 触发保存
  → 更新 manifest / 完成通知
```

**与站点对齐：**

- HTTP：`fetch(url, { credentials: 'include' })` 携带 majdata.net Cookie
- 失败策略：track/chart/image 任一失败 → 该曲目标记 failed；video 失败忽略
- 不重写站点「直接下载」拦截逻辑；批量下载为扩展独立能力

### 5.2 Popup UI（F-11）

| 控件 | 行为 |
|------|------|
| 「批量下载选中」 | 对勾选条目执行 F-10 |
| 「批量下载全部」 | 对当前队列全部执行 |
| 进度条 / 文案 | `正在下载 3/12：曲名…` |
| 取消（P1） | AbortController 中止后续条目 |

下载进行中禁用重复点击；完成后 Popup 通知成功/失败数。

### 5.3 设置扩展（F-12，Options）

| 键 | 默认 | 说明 |
|----|------|------|
| `batchConcurrency` | `1` | 并发数，避免限流 |
| `batchIncludeVideo` | `true` | 是否尝试下载 pv.mp4 |
| `batchZipName` | `majdata-playlist` | ZIP 文件名前缀 |

### 5.4 权限

`manifest.json` 需增加：

- `downloads`（调用 `chrome.downloads.download` 保存 ZIP）
- 已有 `host_permissions: https://majdata.net/*`

## 6. 风险与约束

| 风险 | 缓解 |
|------|------|
| 大歌单内存占用 | 流式/逐首追加 JSZip；并发=1；上限提示（如一次 ≤50 首） |
| API 401/429 | 失败写入 manifest；可调并发；重试 1 次 |
| Service Worker 被挂起 | 用 `chrome.offscreen` 或分片 + 持久化 job 状态（P1） |
| 标题特殊字符 | `sanitizeTitle` + 文件夹名专用清洗 |

## 7. 验收标准

| 编号 | 标准 |
|------|------|
| AC-13 | 选中 3 首批量下载，ZIP 内 3 个子文件夹，各含 track/bg/maidata |
| AC-14 | 子文件夹结构与用户现有 `Downloads/Break Through Myself/` 一致 |
| AC-15 | 含 video 的谱面在 `batchIncludeVideo=true` 时有 pv.mp4 |
| AC-16 | 1 首失败时其余成功，manifest 记录 failed |
| AC-17 | 进度 UI 可见且完成后可再次操作 |

## 8. 与阶段 3（远端 CLI）的关系

阶段 2 在**浏览器内**完成批量打包，满足大多数用户。阶段 3 可将同一队列 JSON/TXT 交给 `majdata-fetch` CLI，在 Linux/NAS 上无浏览器下载，二者 **共用导入导出格式**，ZIP 内单曲结构保持一致。

## 9. 里程碑

| 里程碑 | 交付 | 预估 |
|--------|------|------|
| M10 | 单曲 fetch + 目录打包单测 | 1d |
| M11 | 批量 job + JSZip 聚合 | 1.5d |
| M12 | Popup 进度 UI + downloads API | 0.5d |
| M13 | 联调 majdata.net + 大列表压测 | 1d |
| **合计** | v0.3 | **~4d** |
