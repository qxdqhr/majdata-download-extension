# 导出文件格式规范

阶段 1 默认导出 **TXT（结构化文本）**；可选 **JSONL**。阶段 2 CLI 必须能解析本规范 v1。

## 1. 文件头

每个导出文件以固定魔数开头，便于脚本识别：

```
# MAJDATA-QUEUE v1
# exported-at: 2026-06-04T09:30:00+08:00
# origin: https://majdata.net
# count: 3
# format: line
#
# columns: songId | title | pageUrl | track | chart | image | video
```

说明：

- `exported-at`：ISO 8601
- `count`：数据行数（不含注释）
- 以 `#` 开头的行为注释，解析器应忽略

## 2. 数据行格式（默认 TXT）

**分隔符：** ` | `（空格+竖线+空格，便于标题含逗号）

**每行 7 列：**

```
{songId} | {title} | {pageUrl} | {trackUrl} | {chartUrl} | {imageUrl} | {videoUrl}
```

**示例：**

```
# MAJDATA-QUEUE v1
# exported-at: 2026-06-04T09:30:00+08:00
# origin: https://majdata.net
# count: 2
# format: line
#
# columns: songId | title | pageUrl | track | chart | image | video
abc123 | 测试谱面 | https://majdata.net/song?id=abc123 | https://majdata.net/api3/api/maichart/abc123/track | https://majdata.net/api3/api/maichart/abc123/chart | https://majdata.net/api3/api/maichart/abc123/image?fullImage=true | https://majdata.net/api3/api/maichart/abc123/video
def456 | 另一首 | https://majdata.net/song?id=def456 | https://majdata.net/api3/api/maichart/def456/track | https://majdata.net/api3/api/maichart/def456/chart | https://majdata.net/api3/api/maichart/def456/image?fullImage=true | https://majdata.net/api3/api/maichart/def456/video
```

### 2.1 字段约束

| 字段 | 规则 |
|------|------|
| songId | 非空，不含 `|` |
| title | 经 `sanitize`：去 HTML/富文本标记，`|` 替换为 `／` |
| pageUrl | 绝对 URL |
| track/chart/image | 绝对 URL，必填 |
| video | 绝对 URL；若未知可留空但保留列位：`... | |` 末尾空列写空字符串 |

### 2.2 文件名

```
majdata-queue-YYYYMMDD-HHmmss.txt
```

## 3. JSONL 格式（可选，P1）

文件头仍用 `# MAJDATA-QUEUE v1` + `# format: jsonl`，之后每行一个 JSON：

```json
{"songId":"abc123","title":"测试谱面","pageUrl":"https://majdata.net/song?id=abc123","assets":{"track":"...","chart":"...","image":"...","video":"..."},"addedAt":"2026-06-04T01:00:00.000Z"}
```

## 4. 参考解析器（TypeScript）

```typescript
const MAGIC = '# MAJDATA-QUEUE v1';

export function parseQueueTxt(content: string): ParsedRow[] {
  const lines = content.split(/\r?\n/);
  if (!lines.some(l => l.startsWith(MAGIC))) {
    throw new Error('Invalid majdata queue file');
  }
  const rows: ParsedRow[] = [];
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    const parts = line.split(' | ');
    if (parts.length < 7) throw new Error(`Bad line: ${line}`);
    const [songId, title, pageUrl, track, chart, image, video] = parts;
    rows.push({ songId, title, pageUrl, assets: { track, chart, image, video } });
  }
  return rows;
}
```

## 5. 参考解析器（Python，阶段 2 CLI 草稿）

```python
def parse_queue_txt(path: str) -> list[dict]:
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = [p.strip() for p in line.split(" | ")]
            if len(parts) != 7:
                raise ValueError(f"bad line: {line}")
            sid, title, page, track, chart, image, video = parts
            rows.append({
                "songId": sid,
                "title": title,
                "pageUrl": page,
                "assets": {
                    "track": track,
                    "chart": chart,
                    "image": image,
                    "video": video or None,
                },
            })
    return rows
```

## 6. 版本演进

| 版本 | 变更 |
|------|------|
| v1 | 初始：7 列 pipe 分隔 |
| v2（预留） | 可增加 `artist`、`hash` 列，解析器读 header `columns:` |

解析器应读取 `# columns:` 行决定映射，而非硬编码列序。

## 7. 与内存模型映射

`QueueItem`（扩展内）→ 导出行：

```typescript
function queueItemToLine(item: QueueItem, origin: string): string {
  const a = item.assets;
  return [
    item.songId,
    sanitize(item.title),
    item.pageUrl,
    a.track,
    a.chart,
    a.image,
    a.video ?? '',
  ].join(' | ');
}
```
