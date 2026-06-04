import { MAJDATA_ORIGIN, QUEUE_MAGIC } from './constants';
import { parseQueueJson, parseQueueJsonl, parseQueueTxt } from './export';
import type { AssetUrls, QueueItem, SongContext } from './types';
import { buildPageUrl, buildSongContext } from './urls';

export type QueueFileFormat = 'txt' | 'json' | 'jsonl';

export interface ParsedImportRow {
  songId: string;
  title: string;
  artist?: string;
  pageUrl?: string;
  assets?: Partial<AssetUrls>;
  addedAt?: string;
  updatedAt?: string;
}

export interface ParseQueueFileResult {
  format: QueueFileFormat;
  rows: ParsedImportRow[];
}

export function detectQueueFileFormat(content: string, filename?: string): QueueFileFormat {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('文件为空');
  }

  const ext = filename?.split('.').pop()?.toLowerCase();
  if (ext === 'json') return 'json';

  if (trimmed.startsWith('{')) {
    return 'json';
  }

  const lines = trimmed.split(/\r?\n/);
  const firstLine = lines.find((line) => line.trim()) ?? '';
  if (!firstLine.startsWith(QUEUE_MAGIC) && !firstLine.startsWith('#')) {
    throw new Error('无法识别的队列文件格式');
  }

  const header = lines.slice(0, 20).join('\n');
  if (header.includes('format: jsonl')) {
    return 'jsonl';
  }

  return 'txt';
}

export function parseQueueFile(content: string, filename?: string): ParseQueueFileResult {
  const format = detectQueueFileFormat(content, filename);

  let rows: ParsedImportRow[];
  switch (format) {
    case 'json':
      rows = parseQueueJson(content);
      break;
    case 'jsonl':
      rows = parseQueueJsonl(content);
      break;
    case 'txt':
      rows = parseQueueTxt(content, { lenient: true });
      break;
  }

  return { format, rows: rows.filter((row) => row.songId.trim()) };
}

export function normalizeImportRow(
  row: ParsedImportRow,
  origin: string = MAJDATA_ORIGIN,
  now: string = new Date().toISOString(),
): QueueItem {
  const songId = row.songId.trim();
  const title = row.title?.trim() || songId;
  const base = buildSongContext(songId, title, origin, row.artist);

  const assets: AssetUrls = {
    track: row.assets?.track || base.assets.track,
    chart: row.assets?.chart || base.assets.chart,
    image: row.assets?.image || base.assets.image,
    video: row.assets?.video || base.assets.video,
  };

  return {
    songId,
    title,
    artist: row.artist,
    pageUrl: row.pageUrl?.trim() || buildPageUrl(origin, songId),
    assets,
    addedAt: row.addedAt || now,
    updatedAt: row.updatedAt || now,
  };
}

export function rowsToQueueItems(rows: ParsedImportRow[], origin?: string): QueueItem[] {
  const now = new Date().toISOString();
  return rows.map((row) => normalizeImportRow(row, origin, now));
}

export function songContextFromImportRow(row: ParsedImportRow, origin?: string): SongContext {
  const item = normalizeImportRow(row, origin);
  return {
    songId: item.songId,
    title: item.title,
    artist: item.artist,
    pageUrl: item.pageUrl,
    assets: item.assets,
  };
}
