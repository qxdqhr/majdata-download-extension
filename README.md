# Majdata Download Extension

面向 [Majdata Net](https://majdata.net/) 的浏览器扩展：在原有「单首下载」流程上增加**下载队列**，支持批量收藏谱面链接并导出为 TXT，为后续远端自动下载（阶段 2）预留数据格式。

## 背景

Majdata Net 是 maimai 自制谱分享站，前端开源仓库：[TeamMajdata/MajdataNet](https://github.com/TeamMajdata/MajdataNet)。站点上的「下载」并非单一直链，而是由前端拉取 track / chart / image / video 四个资源后本地打包为 ZIP（或 ADX）。

本扩展**不修改站点源码**，仅在 `https://majdata.net/*` 注入 Content Script，拦截下载按钮点击并扩展交互。

## 阶段划分

| 阶段 | 目标 | 状态 |
|------|------|------|
| **阶段 1** | 下载确认框 + 队列缓存 + Popup 管理 + 导出 TXT | **已实现 v0.1.0** |
| **阶段 2** | 将导出链接提交远端机器自动下载 | 远期 |

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/01-site-analysis.md](./docs/01-site-analysis.md) | 站点与开源代码调研结论 |
| [docs/02-prd.md](./docs/02-prd.md) | 产品需求文档（阶段 1） |
| [docs/03-architecture.md](./docs/03-architecture.md) | 技术架构与模块设计 |
| [docs/04-phase1-tasks.md](./docs/04-phase1-tasks.md) | 阶段 1 子任务拆分与验收标准 |
| [docs/05-phase2-outlook.md](./docs/05-phase2-outlook.md) | 阶段 2 远端下载展望 |
| [docs/06-export-format.md](./docs/06-export-format.md) | 导出 TXT / JSONL 格式规范 |

## 技术选型（拟定）

- **Manifest V3**（Chrome / Edge；Firefox 需 polyfill 评估）
- **TypeScript + Vite + CRXJS** 或 **WXT** 构建
- **chrome.storage.local** 持久化队列
- Content Script + Service Worker + Popup HTML

## 快速开始

### 环境要求

- Node.js 18+
- pnpm

### 安装与构建

```bash
cd majdata-download-extension
pnpm install
pnpm dev      # 开发模式（HMR）
pnpm build    # 生产构建 → dist/chrome-mv3/
pnpm test     # 单元测试
pnpm lint     # TypeScript 检查
```

### 加载到 Chrome / Edge

1. 打开 `chrome://extensions`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `dist/chrome-mv3/` 目录

### 使用方式

1. 访问 [majdata.net](https://majdata.net/) 浏览谱面
2. 点击「下载」→ 选择 **直接下载** 或 **加入下载列表**
3. 点击浏览器工具栏扩展图标，在 Popup 中勾选条目
4. 点击「导出选中」生成 `majdata-queue-*.txt`

> 开发模式下运行 `pnpm dev` 后，加载 `dist/chrome-mv3-dev/` 目录。

## 关联仓库

- 站点前端：[TeamMajdata/MajdataNet](https://github.com/TeamMajdata/MajdataNet)
- 站点域名：`https://majdata.net`

## 许可证

本项目为个人工具扩展，与 Majdata Net 无官方关联。仅供学习交流使用。
