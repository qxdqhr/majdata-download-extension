import { describe, expect, it } from 'vitest';
import {
  buildQueueExport,
  buildQueueExportContent,
  buildQueueExportJson,
  formatExportFilename,
  parseQueueJson,
  parseQueueTxt,
  queueItemToLine,
} from '@/shared/export';
import { detectQueueFileFormat, parseQueueFile, rowsToQueueItems } from '@/shared/import';
import type { QueueItem } from '@/shared/types';

const sampleItem: QueueItem = {
  songId: 'abc123',
  title: '测试|谱面',
  artist: 'Artist',
  pageUrl: 'https://majdata.net/song?id=abc123',
  assets: {
    track: 'https://majdata.net/api3/api/maichart/abc123/track',
    chart: 'https://majdata.net/api3/api/maichart/abc123/chart',
    image: 'https://majdata.net/api3/api/maichart/abc123/image?fullImage=true',
    video: 'https://majdata.net/api3/api/maichart/abc123/video',
  },
  addedAt: '2026-06-04T01:00:00.000Z',
  updatedAt: '2026-06-04T01:00:00.000Z',
};

describe('export', () => {
  it('sanitizes pipe in title when exporting', () => {
    expect(queueItemToLine(sampleItem)).toContain('测试／谱面');
  });

  it('builds v1 export with header and data line', () => {
    const content = buildQueueExportContent([sampleItem]);
    expect(content.startsWith('# MAJDATA-QUEUE v1')).toBe(true);
    expect(content).toContain('# count: 1');
    expect(content).toContain('abc123 | 测试／谱面 |');
  });

  it('roundtrips through parseQueueTxt', () => {
    const content = buildQueueExportContent([sampleItem]);
    const rows = parseQueueTxt(content);
    expect(rows).toHaveLength(1);
    expect(rows[0].songId).toBe('abc123');
    expect(rows[0].assets?.track).toContain('/track');
  });

  it('builds JSON export document', () => {
    const content = buildQueueExportJson([sampleItem]);
    const doc = JSON.parse(content);
    expect(doc.version).toBe('MAJDATA-QUEUE v1');
    expect(doc.format).toBe('json');
    expect(doc.items).toHaveLength(1);
    expect(doc.items[0].songId).toBe('abc123');
  });

  it('uses format-specific filename extension', () => {
    const date = new Date('2026-06-04T09:30:00');
    expect(formatExportFilename('txt', date)).toMatch(/\.txt$/);
    expect(formatExportFilename('json', date)).toMatch(/\.json$/);
  });

  it('buildQueueExport returns correct mime for json', () => {
    const result = buildQueueExport([sampleItem], 'json');
    expect(result.mimeType).toContain('json');
    expect(result.filename).toMatch(/\.json$/);
  });
});

describe('import', () => {
  it('detects txt format from magic header', () => {
    const content = buildQueueExportContent([sampleItem]);
    expect(detectQueueFileFormat(content)).toBe('txt');
  });

  it('detects json format from content', () => {
    const content = buildQueueExportJson([sampleItem]);
    expect(detectQueueFileFormat(content, 'queue.json')).toBe('json');
  });

  it('roundtrips JSON export through parseQueueJson', () => {
    const content = buildQueueExportJson([sampleItem]);
    const rows = parseQueueJson(content);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('测试|谱面');
    expect(rows[0].artist).toBe('Artist');
  });

  it('parseQueueFile normalizes rows to queue items', () => {
    const content = buildQueueExportJson([sampleItem]);
    const parsed = parseQueueFile(content, 'queue.json');
    const items = rowsToQueueItems(parsed.rows);
    expect(items).toHaveLength(1);
    expect(items[0].assets.track).toContain('/track');
    expect(items[0].pageUrl).toContain('abc123');
  });
});
