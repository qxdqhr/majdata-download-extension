# 阶段 2 展望 — 远端自动下载

> 阶段 2 依赖阶段 1 导出的队列文件。本文档仅作架构预研，**不在阶段 1 实现**。

## 1. 目标

用户将 Popup 导出的 TXT/JSONL 交给**远端 Linux 机器**（家用 NAS、VPS、WSL 等），由守护进程或 CLI：

1. 解析队列文件
2. 按谱面 ID 拉取 track / chart / image / video
3. 本地打包为与 Majdata Net **相同结构**的 ZIP（或用户指定 ADX）
4. 可选：下载完成后 webhook 通知、从远端队列移除

## 2. 为什么需要阶段 2

| 痛点 | 阶段 1 | 阶段 2 |
|------|--------|--------|
| 浏览器 Tab 占用 | 批量下载仍占浏览器 | 后台静默 |
| 网络稳定性 | 浏览器中断难恢复 | aria2/wget 断点续传 |
| Cookie/会话 | 随浏览器 | 可配置 cookie jar |
| 调度 | 手动 | cron / 队列 Worker |

## 3. 系统架构（草案）

```
┌──────────────┐     export.txt      ┌─────────────────────┐
│   Browser    │ ──────────────────► │  User / Sync (rsync) │
│  Extension   │                     └──────────┬──────────┘
└──────────────┘                                │
                                                ▼
                                     ┌─────────────────────┐
                                     │  majdata-fetch CLI   │
                                     │  (Go / Node / Python)│
                                     └──────────┬──────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    ▼                           ▼                           ▼
            GET .../track                 GET .../chart                 JSZip pack
                    │                           │                           │
                    └───────────────────────────┴───────────────────────────┘
                                                │
                                                ▼
                                     ~/majdata/charts/{title}.zip
```

## 4. 组件划分

### 4.1 `majdata-fetch` CLI（新仓库或 `packages/fetcher`）

```bash
majdata-fetch run --input queue.txt --out ./downloads/ \
  --concurrency 2 --cookie ~/.majdata/cookies.txt \
  --format zip --resume
```

职责：

- 解析 [06-export-format.md](./06-export-format.md)
- HTTP 下载（推荐 `fetch` + 流式写盘，或 `aria2c` 子进程）
- 打包（Node: jszip；Go: archive/zip）
- 状态文件 `.majdata-fetch.state.json` 记录进度

### 4.2 可选：轻量 HTTP Agent

若用户希望「Popup 一键推送到远端」：

```
Extension --POST /api/queue--> Remote Agent (auth token)
                                └── 写入 ~/queue/inbox/
                                └── majdata-fetch run
```

**安全要求：**

- HTTPS + 预共享 Token
- 仅内网或 VPN 暴露
- 不上传浏览器 Cookie 明文到公网服务

### 4.3 与 MajdataHub 的关系

社区存在 [MajdataHub](https://github.com/KirisameVanilla/MajdataHub) 用于游戏/谱面/皮肤下载。阶段 2 可评估：

- **独立 CLI**（推荐）：解耦、仅消费 URL 列表
- **Hub 插件**：若 Hub 已有谱面下载 API，可提交 PR 支持导入 majdata 队列格式

## 5. 认证策略

Majdata Net 使用 Cookie 会话。远端下载可选方案：

| 方案 | 说明 | 风险 |
|------|------|------|
| A. 公开谱面无需登录 | 仅下公开资源 | 低；需验证 API 是否 401 |
| B. 用户导出 Netscape cookie | CLI `--cookie` | 中；用户自行保管 |
| C. API Token（若官方未来提供） | 最佳 | 取决于官方 |

**阶段 2 启动前必须验证：** 未登录状态下 `GET /maichart/{id}/track` 是否 200。

## 6. 阶段 2 子任务（预览）

| ID | 任务 | 预估 |
|----|------|------|
| P2-1 | 验证公开 API 可用性与限流 | 2h |
| P2-2 | CLI 解析 v1 导出格式 | 4h |
| P2-3 | 单谱面四文件下载 + zip | 8h |
| P2-4 | 并发、重试、resume | 8h |
| P2-5 | 可选 Remote Agent API | 16h |
| P2-6 | 扩展「推送到远端」按钮 | 8h |

## 7. 导出格式稳定性承诺

阶段 1 确定格式版本号 `MAJDATA-QUEUE v1` 后，阶段 2 CLI **向后兼容 v1**。新字段仅追加，不破坏现有列。

## 8. 开放问题

1. 是否需要支持 ADX 格式打包（站点 `localStorage.DownloadType`）？
2. 远端目录命名：用 `title` 还是 `songId` 防冲突？
3. 是否与 shared-downloads-hono 等现有项目整合？

> 实现阶段 2 前建议新开 PRD，并在此文档追加决策记录。
