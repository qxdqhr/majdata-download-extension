import { describe, expect, it } from 'vitest';
import { buildQueueExportContent, parseQueueTxt, queueItemToLine } from '@/shared/export';
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
    expect(rows[0].assets.track).toContain('/track');
  });
});
