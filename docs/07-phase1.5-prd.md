# 产品需求文档 — 阶段 1.5（设置 · 导入 · 导出格式）

> 依赖：阶段 1（v0.1）已完成  
> 目标版本：**v0.2**

## 1. 概述

在现有 Popup 队列能力上，增加 **Options 设置页**，支持用户配置导出格式（TXT / JSON），并实现队列的 **双向交换**（导入 + 导出），便于备份、迁移与与其他工具对接。

## 2. 用户故事

| ID | 作为 | 我想要 | 以便 |
|----|------|--------|------|
| US-7 | 用户 | 在设置页选择默认导出格式 | 导出 JSON 给脚本/工具解析 |
| US-8 | 用户 | 从 TXT/JSON 文件导入队列 | 恢复备份或合并他人分享的列表 |
| US-9 | 用户 | 导入时选择合并或覆盖 | 避免误删现有列表 |
| US-10 | 用户 | Popup 入口跳转设置页 | 无需记 options 地址 |

## 3. 功能需求

### 3.1 Options 设置页（F-6）

**入口：**

- Popup 顶栏 ⚙ → 打开 `options.html`
- 扩展管理页 → 「扩展程序选项」

**设置项（v0.2 范围）：**

| 键 | 类型 | 默认 | 说明 |
|----|------|------|------|
| `exportFormat` | `'txt' \| 'json'` | `txt` | 默认导出格式 |
| `importMergeStrategy` | `'merge' \| 'replace'` | `merge` | 导入时合并或覆盖 |
| `interceptEnabled` | `boolean` | `true` | 是否拦截下载按钮（P1） |
| `defaultDownloadAction` | `'ask' \| 'direct' \| 'queue'` | `ask` | 默认下载行为（P1） |
| `queueLimit` | `number` | `500` | 队列上限（P1） |

存储：`chrome.storage.sync`（设置） + 继续用 `chrome.storage.local`（队列数据）。

### 3.2 导出格式（F-7）

- Popup「导出选中 / 导出全部」读取 `exportFormat` 设置
- **TXT**：沿用 [06-export-format.md](./06-export-format.md) `format: line`
- **JSON**：见 [06-export-format.md](./06-export-format.md) §4「JSON 文档格式」
- 文件名：`majdata-queue-YYYYMMDD-HHmmss.{txt|json}`

### 3.3 导入（F-8）

**入口：** Popup 底栏「导入列表」→ 文件选择器（`.txt,.json`）

**流程：**

1. 读取文件 UTF-8
2. 自动检测格式（魔数 / JSON parse / 扩展名）
3. 解析为 `QueueItem[]`（缺字段时用 `buildAssetUrls(songId)` 补全）
4. 按 `importMergeStrategy`：
   - **merge**：`songId` upsert，保留已有 `addedAt` 或更新 `updatedAt`
   - **replace**：清空后写入
5. Toast / 状态栏显示：`成功导入 N 条，跳过 M 条重复/无效`

**错误处理：**

- 格式无法识别 → 明确报错，不修改队列
- 部分行无效 → 跳过并汇总，有效条目仍导入

### 3.4 Popup 调整（F-9）

- 顶栏增加 ⚙ 与「导入」按钮
- 导出按钮文案随设置显示「导出选中 (TXT)」或「导出选中 (JSON)」

## 4. 验收标准

| 编号 | 标准 |
|------|------|
| AC-8 | 设置页切换 exportFormat 为 json，导出文件为合法 JSON，可被 `JSON.parse` |
| AC-9 | 导入 v0.1 导出的 TXT，队列条目数与内容一致 |
| AC-10 | 导入 JSON 导出文件，round-trip 无数据丢失 |
| AC-11 | merge 模式下导入不删除已有、同 id 更新 |
| AC-12 | replace 模式下导入后队列仅含文件内条目 |

## 5. 非目标（阶段 1.5 不做）

- 浏览器内批量下载谱面文件（阶段 2）
- 远端 CLI / Agent（阶段 3 可选）

## 6. 里程碑

| 里程碑 | 交付 | 预估 |
|--------|------|------|
| M6 | 设置 storage + Options UI | 0.5d |
| M7 | JSON 导出 + 格式切换 | 0.5d |
| M8 | 导入解析 + merge/replace | 1d |
| M9 | Popup 联调 + 单测 | 0.5d |
| **合计** | v0.2 | **~2.5d** |
