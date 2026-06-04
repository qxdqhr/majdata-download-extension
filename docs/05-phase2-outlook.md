# 阶段 3 展望 — 远端自动下载（CLI / Agent）

> **说明：** 原「阶段 2 远端下载」调整为 **阶段 3**。浏览器内批量下载谱面与歌单 ZIP 见 [08-phase2-prd-batch-download.md](./08-phase2-prd-batch-download.md)（阶段 2 / v0.3）。

## 1. 目标

当歌单过大、或用户希望在 **无浏览器环境**（NAS / VPS / WSL）下载时，将 Popup 导出的 **TXT / JSON 队列文件** 交给 CLI：

1. 解析队列（与 [06-export-format.md](./06-export-format.md) 一致）
2. 按谱面 ID 拉取 track / chart / image / video
3. 输出与阶段 2 相同的**单曲目录结构**或 `{title}.zip`
4. 可选：聚合为歌单 ZIP + `manifest.json`

## 2. 与阶段 2 的分工

| 能力 | 阶段 2（扩展内） | 阶段 3（CLI） |
|------|------------------|---------------|
| 批量下载 | ✅ 浏览器 JSZip | ✅ 本机脚本 |
| 大列表（50+） | 受内存/SW 限制 | 更适合 |
| 断点续传 | P1 | ✅ aria2 / 状态文件 |
| Cookie | 自动（浏览器） | 用户配置 cookie jar |
| 队列来源 | 扩展内列表 / 导入 JSON | 同左 |

## 3. 系统架构（草案）

```
┌──────────────┐   export.json/txt   ┌─────────────────────┐
│   Extension  │ ──────────────────► │  rsync / scp / 手动  │
└──────────────┘                     └──────────┬──────────┘
                                                ▼
                                     ┌─────────────────────┐
                                     │  majdata-fetch CLI   │
                                     └──────────┬──────────┘
                                                ▼
                              majdata-playlist-*.zip（结构同阶段 2）
```

## 4. CLI 接口（草案）

```bash
majdata-fetch run --input queue.json --out ./downloads/ \
  --concurrency 2 --cookie ~/.majdata/cookies.txt \
  --playlist-zip --resume
```

**单曲输出目录（与阶段 2 一致）：**

```
./downloads/Break Through Myself/
  track.mp3
  bg.jpg
  maidata.txt
  pv.mp4   # 可选
```

## 5. 阶段 3 子任务（预览）

| ID | 任务 | 预估 |
|----|------|------|
| P3-1 | 验证公开 API + Cookie 下载 | 2h |
| P3-2 | 解析 TXT/JSON v1（复用扩展单测 fixture） | 4h |
| P3-3 | 单曲四文件 + 目录落盘 | 8h |
| P3-4 | 歌单 ZIP + manifest | 4h |
| P3-5 | 并发、重试、resume | 8h |
| P3-6 | 可选 Remote Agent + 扩展「推送到远端」 | 16h |

## 6. 开放问题

1. CLI 独立仓库 vs `packages/majdata-fetch` monorepo？
2. 是否与 [MajdataHub](https://github.com/KirisameVanilla/MajdataHub) 整合？
3. ADX 格式是否纳入 CLI（站点 `localStorage.DownloadType`）？

> 启动实现前更新本文档决策记录。
