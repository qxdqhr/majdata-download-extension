# majdata-download-extension — Agent 与协作说明

## 项目知识库（SSOT）

**[`.cursor/KNOWLEDGE_BASE.md`](.cursor/KNOWLEDGE_BASE.md)**

## 项目状态

阶段 1 已实现（v0.1.0）。构建产物：`dist/chrome-mv3/`。

## 关联仓库

| 仓库 | 关系 |
|------|------|
| [TeamMajdata/MajdataNet](https://github.com/TeamMajdata/MajdataNet) | 目标站点前端源码，下载逻辑在 `src/utils/download.ts` |
| https://majdata.net | 扩展唯一作用域 |

## 文档索引

- [docs/01-site-analysis.md](docs/01-site-analysis.md) — 站点调研
- [docs/02-prd.md](docs/02-prd.md) — 阶段 1 PRD
- [docs/03-architecture.md](docs/03-architecture.md) — 技术架构
- [docs/04-phase1-tasks.md](docs/04-phase1-tasks.md) — 子任务拆分
- [docs/05-phase2-outlook.md](docs/05-phase2-outlook.md) — 远端下载展望
- [docs/06-export-format.md](docs/06-export-format.md) — 导出格式

## 执行命令（实现后）

包管理：**pnpm**（推荐 WXT 脚手架）

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
```

## Cursor 资源

| 资源 | 路径 |
|------|------|
| 知识库 SSOT | `.cursor/KNOWLEDGE_BASE.md` |
| 自动注入规则 | `.cursor/rules/majdata-download-extension-knowledge-ssot.mdc` |
