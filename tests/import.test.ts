import { describe, expect, it } from 'vitest';
import { importQueueItems } from '@/shared/queue';
import type { QueueItem } from '@/shared/types';

const baseItem = (songId: string, title: string): QueueItem => ({
  songId,
  title,
  pageUrl: `https://majdata.net/song?id=${songId}`,
  assets: {
    track: `https://majdata.net/api3/api/maichart/${songId}/track`,
    chart: `https://majdata.net/api3/api/maichart/${songId}/chart`,
    image: `https://majdata.net/api3/api/maichart/${songId}/image?fullImage=true`,
    video: '',
  },
  addedAt: '2026-06-04T01:00:00.000Z',
  updatedAt: '2026-06-04T01:00:00.000Z',
});

describe('importQueueItems', () => {
  it('merge upserts existing songId and preserves addedAt', async () => {
    const existing = baseItem('a1', '旧标题');
    const incoming = { ...baseItem('a1', '新标题'), addedAt: '2026-06-05T00:00:00.000Z' };

    const first = await importQueueItems([existing], 'replace', 10);
    expect(first.count).toBe(1);

    const merged = await importQueueItems([incoming], 'merge', 10);
    expect(merged.updated).toBe(1);
    expect(merged.imported).toBe(0);
  });

  it('replace clears previous queue', async () => {
    await importQueueItems([baseItem('keep', 'A'), baseItem('drop', 'B')], 'replace', 10);
    const result = await importQueueItems([baseItem('only', 'C')], 'replace', 10);

    expect(result.imported).toBe(1);
    expect(result.count).toBe(1);
  });
});
