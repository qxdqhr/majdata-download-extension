import { MAJDATA_ORIGIN, QUEUE_MAGIC } from './constants';
import { sanitizeTitle } from './sanitize';
import type { QueueItem } from './types';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatExportFilename(date: Date = new Date()): string {
  return `majdata-queue-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.txt`;
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

export function parseQueueTxt(content: string) {
  const lines = content.split(/\r?\n/);
  if (!lines.some((line) => line.startsWith(QUEUE_MAGIC))) {
    throw new Error('Invalid majdata queue file');
  }

  const rows = [];
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    const parts = line.split(' | ');
    if (parts.length < 7) {
      throw new Error(`Bad line: ${line}`);
    }
    const [songId, title, pageUrl, track, chart, image, video] = parts;
    rows.push({
      songId,
      title,
      pageUrl,
      assets: { track, chart, image, video: video || '' },
    });
  }
  return rows;
}
