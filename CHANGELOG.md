# Changelog

本文件记录 [majdata-download-extension](https://github.com/qxdqhr/majdata-download-extension) 的版本变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.4.0] - 2026-06-12

### Added

- Popup **本地分享** 面板：手动启停本地 HTTP 服务，支持选择最近一次或历史歌单 ZIP 作为分享源
- Popup 内 **一键下载 Native Host 安装脚本**（macOS `.command` / Linux `.sh`），普通用户无需手动复制扩展 ID
- 共享 **animal-island** UI 样式，Popup / 设置页 / 导入页视觉统一
- 构建流程：`pnpm build` 产出可分发的 `majdata-download-extension-*.zip`；CI 额外上传 zip artifact
- `scripts/sync-native-host-public.mjs`、`scripts/prune-dist.mjs` 构建辅助脚本
- `download-data-url` 工具模块与单测
- `local-server-state` 会话状态管理（运行中 URL、来源 ZIP、最近下载列表等）

### Changed

- 本地 HTTP 服务由「批量下载完成后自动启动」改为 **Popup 手动控制**，流程更清晰、可重复分享
- Native Host 改用 **内置 Node.js 静态 HTTP 服务**，移除 `http-server` npm 依赖，安装仅需 Node.js
- Native Host 用户态安装目录统一为 `~/.majdata-download-extension/native-host/`
- 设置页新增独立 **本地分享** 区块（端口配置、Native Host 检测）；批量下载区不再混入本地服务选项
- `native-host/install-linux.sh` 保留为兼容入口，实际逻辑委托 `install.sh`
- README 明确 **dev 与 build 产物区别**（`chrome-mv3-dev/` 仅供调试，不可分发）

### Removed

- 设置项「下载完成后启动本地 HTTP 服务」（`autoStartLocalServer`）

## [0.3.0] - 2026-06-06

### Added

- 批量下载：从队列拉取 track / chart / image / video，打包为歌单 ZIP
- Native Messaging Host（`native-host/`）：解压 ZIP 并启动本地 HTTP 服务
- 设置页批量下载选项（并发数、是否含视频、ZIP 文件名前缀、本地服务端口）
- 批量任务进度面板与取消

## [0.2.0] - 2026-06-05

### Added

- 设置页：导出格式（TXT / JSON）、导入合并策略、拦截开关、默认下载行为
- 独立导入窗口，支持 TXT / JSON 队列文件
- `MAJDATA-QUEUE v1` JSON 导出格式

## [0.1.0] - 2026-06-04

### Added

- Content Script 拦截 majdata.net 下载按钮，支持「直接下载 / 加入队列」
- Popup 队列管理、勾选导出 TXT
- Service Worker 持久化队列（`chrome.storage.local`）

[0.4.0]: https://github.com/qxdqhr/majdata-download-extension/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/qxdqhr/majdata-download-extension/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/qxdqhr/majdata-download-extension/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/qxdqhr/majdata-download-extension/releases/tag/v0.1.0
