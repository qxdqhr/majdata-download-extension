import { MAJDATA_ORIGIN, QUEUE_MAGIC } from './constants';
import type { ParsedImportRow } from './import';
import { sanitizeTitle } from './sanitize';
import type { ExportFormat } from './settings';
import type { QueueItem } from './types';

export const QUEUE_JSON_VERSION = 'MAJDATA-QUEUE v1';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatExportFilename(format: ExportFormat = 'txt', date: Date = new Date()): string {
  const ext = format === 'json' ? 'json' : 'txt';
  return `majdata-queue-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.${ext}`;
}

export function queueItemToLine(item: QueueItem): string {
  const { assets } = item;
  return [
    item.songId,
    sanitizeTitle(item.title),
    item.pageUrl,
    assets.track,
    assets.chart,
    assets.image,
    assets.video ?? '',
  ].join(' | ');
}

export function buildQueueExportContent(items: QueueItem[], origin: string = MAJDATA_ORIGIN): string {
  const exportedAt = new Date().toISOString();
  const header = [
    QUEUE_MAGIC,
    `# exported-at: ${exportedAt}`,
    `# origin: ${origin}`,
    `# count: ${items.length}`,
    '# format: line',
    '#',
    '# columns: songId | title | pageUrl | track | chart | image | video',
  ];
  const lines = items.map(queueItemToLine);
  return [...header, ...lines].join('\n') + '\n';
}

export function buildQueueExportJson(items: QueueItem[], origin: string = MAJDATA_ORIGIN): string {
  const doc = {
    version: QUEUE_JSON_VERSION,
    exportedAt: new Date().toISOString(),
    origin,
    format: 'json',
    count: items.length,
    items: items.map((item) => ({
      songId: item.songId,
      title: item.title,
      artist: item.artist,
      pageUrl: item.pageUrl,
      assets: item.assets,
      addedAt: item.addedAt,
      updatedAt: item.updatedAt,
    })),
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

export function buildQueueExport(
  items: QueueItem[],
  format: ExportFormat,
  origin: string = MAJDATA_ORIGIN,
): { content: string; mimeType: string; filename: string } {
  const date = new Date();
  if (format === 'json') {
    return {
      content: buildQueueExportJson(items, origin),
      mimeType: 'application/json;charset=utf-8',
      filename: formatExportFilename('json', date),
    };
  }
  return {
    content: buildQueueExportContent(items, origin),
    mimeType: 'text/plain;charset=utf-8',
    filename: formatExportFilename('txt', date),
  };
}

export function parseQueueTxt(content: string, options?: { lenient?: boolean }): ParsedImportRow[] {
  const lines = content.split(/\r?\n/);
  if (!lines.some((line) => line.startsWith(QUEUE_MAGIC))) {
    throw new Error('无效的队列文件（缺少 # MAJDATA-QUEUE v1 文件头）');
  }

  const rows: ParsedImportRow[] = [];
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    const parts = line.split(' | ');
    if (parts.length < 7) {
      if (options?.lenient) continue;
      throw new Error(`无效的数据行：${line}`);
    }
    const [songId, title, pageUrl, track, chart, image, video] = parts;
    if (!songId.trim()) {
      if (options?.lenient) continue;
      throw new Error(`无效的数据行：${line}`);
    }
    rows.push({
      songId,
      title,
      pageUrl,
      assets: { track, chart, image, video: video || '' },
    });
  }
  return rows;
}

export function parseQueueJson(content: string): ParsedImportRow[] {
  let doc: unknown;
  try {
    doc = JSON.parse(content);
  } catch {
    throw new Error('无法解析 JSON 文件');
  }

  if (!doc || typeof doc !== 'object') {
    throw new Error('无效的 JSON 队列文件');
  }

  const record = doc as Record<string, unknown>;
  if (record.version !== QUEUE_JSON_VERSION) {
    throw new Error(`JSON 版本不匹配，需要 ${QUEUE_JSON_VERSION}`);
  }
  if (!Array.isArray(record.items)) {
    throw new Error('JSON 文件缺少 items 数组');
  }

  const rows: ParsedImportRow[] = [];
  for (const raw of record.items) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const songId = typeof item.songId === 'string' ? item.songId.trim() : '';
    if (!songId) continue;

    const assetsRaw = item.assets;
    const assets =
      assetsRaw && typeof assetsRaw === 'object'
        ? (assetsRaw as Record<string, string>)
        : undefined;

    rows.push({
      songId,
      title: typeof item.title === 'string' ? item.title : songId,
      artist: typeof item.artist === 'string' ? item.artist : undefined,
      pageUrl: typeof item.pageUrl === 'string' ? item.pageUrl : undefined,
      assets: assets
        ? {
            track: assets.track ?? '',
            chart: assets.chart ?? '',
            image: assets.image ?? '',
            video: assets.video ?? '',
          }
        : undefined,
      addedAt: typeof item.addedAt === 'string' ? item.addedAt : undefined,
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined,
    });
  }

  return rows;
}

export function parseQueueJsonl(content: string): ParsedImportRow[] {
  const lines = content.split(/\r?\n/);
  if (!lines.some((line) => line.startsWith(QUEUE_MAGIC))) {
    throw new Error('无效的 JSONL 队列文件（缺少文件头）');
  }

  const rows: ParsedImportRow[] = [];
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    try {
      const item = JSON.parse(line) as Record<string, unknown>;
      const songId = typeof item.songId === 'string' ? item.songId.trim() : '';
      if (!songId) continue;

      const assetsRaw = item.assets;
      const assets =
        assetsRaw && typeof assetsRaw === 'object'
          ? (assetsRaw as Record<string, string>)
          : undefined;

      rows.push({
        songId,
        title: typeof item.title === 'string' ? item.title : songId,
        artist: typeof item.artist === 'string' ? item.artist : undefined,
        pageUrl: typeof item.pageUrl === 'string' ? item.pageUrl : undefined,
        assets: assets
          ? {
              track: assets.track ?? '',
              chart: assets.chart ?? '',
              image: assets.image ?? '',
              video: assets.video ?? '',
            }
          : undefined,
        addedAt: typeof item.addedAt === 'string' ? item.addedAt : undefined,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined,
      });
    } catch {
      continue;
    }
  }

  return rows;
}
