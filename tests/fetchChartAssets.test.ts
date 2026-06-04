import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchChartAssets } from '@/shared/fetchChartAssets';
import type { QueueItem } from '@/shared/types';

const sampleItem: QueueItem = {
  songId: 'abc123',
  title: '测试谱面',
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

describe('fetchChartAssets', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches required assets and optional video', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/video')) {
          return new Response(new Uint8Array([4, 5, 6]), { status: 200 });
        }
        if (url.includes('/chart')) {
          return new Response('chart-data', { status: 200 });
        }
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      }),
    );

    const assets = await fetchChartAssets(sampleItem, true);
    expect(assets.chart).toBe('chart-data');
    expect(assets.track.byteLength).toBe(3);
    expect(assets.image.byteLength).toBe(3);
    expect(assets.video?.byteLength).toBe(3);
  });

  it('ignores video failure when includeVideo is true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/video')) {
          return new Response('', { status: 404 });
        }
        if (url.includes('/chart')) {
          return new Response('chart-data', { status: 200 });
        }
        return new Response(new Uint8Array([1]), { status: 200 });
      }),
    );

    const assets = await fetchChartAssets(sampleItem, true);
    expect(assets.video).toBeUndefined();
  });
});
