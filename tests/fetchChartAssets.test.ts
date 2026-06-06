import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  extensionFromFilename,
  fetchChartAssets,
  parseFilenameFromContentDisposition,
  resolveAssetExtension,
  zipNameForExtension,
} from '@/shared/fetchChartAssets';
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

function responseWithDisposition(
  body: BodyInit,
  filename: string,
  contentType?: string,
): Response {
  const headers: Record<string, string> = {
    'content-disposition': `attachment; filename=${filename}; filename*=UTF-8''${encodeURIComponent(filename)}`,
  };
  if (contentType) {
    headers['content-type'] = contentType;
  }
  return new Response(body, { status: 200, headers });
}

describe('fetchChartAssets helpers', () => {
  it('parses content-disposition filename', () => {
    expect(
      parseFilenameFromContentDisposition("attachment; filename=bg.mp4; filename*=UTF-8''bg.mp4"),
    ).toBe('bg.mp4');
    expect(extensionFromFilename('track.mp3')).toBe('mp3');
    expect(zipNameForExtension('mp4')).toBe('pv.mp4');
  });

  it('resolves extension from response headers', () => {
    const response = responseWithDisposition(new Uint8Array([1]), 'bg.mp4', 'video/mp4');
    expect(
      resolveAssetExtension(response, 'https://majdata.net/api3/api/maichart/x/video'),
    ).toBe('mp4');
  });
});

describe('fetchChartAssets', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches required assets and optional video in parallel by file extension', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/video')) {
        return responseWithDisposition(new Uint8Array([4, 5, 6]), 'bg.mp4', 'video/mp4');
      }
      if (url.includes('/chart')) {
        return responseWithDisposition('chart-data', 'maidata.txt', 'text/plain');
      }
      if (url.includes('/image')) {
        return responseWithDisposition(new Uint8Array([1, 2, 3]), 'bg.png', 'image/png');
      }
      return responseWithDisposition(new Uint8Array([1, 2, 3]), 'track.mp3', 'audio/mp3');
    });
    vi.stubGlobal('fetch', fetchMock);

    const assets = await fetchChartAssets(sampleItem, true);
    expect(assets['maidata.txt']).toBe('chart-data');
    expect((assets['track.mp3'] as ArrayBuffer).byteLength).toBe(3);
    expect((assets['bg.png'] as ArrayBuffer).byteLength).toBe(3);
    expect((assets['pv.mp4'] as ArrayBuffer).byteLength).toBe(3);

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/video'))).toBe(true);
  });

  it('ignores video failure when includeVideo is true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/video')) {
          return new Response('', { status: 404 });
        }
        if (url.includes('/chart')) {
          return responseWithDisposition('chart-data', 'maidata.txt', 'text/plain');
        }
        if (url.includes('/image')) {
          return responseWithDisposition(new Uint8Array([1]), 'bg.jpg', 'image/jpeg');
        }
        return responseWithDisposition(new Uint8Array([1]), 'track.mp3', 'audio/mp3');
      }),
    );

    const assets = await fetchChartAssets(sampleItem, true);
    expect(assets['pv.mp4']).toBeUndefined();
    expect(assets['track.mp3']).toBeDefined();
  });

  it('skips video url when includeVideo is false', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/chart')) {
        return responseWithDisposition('chart-data', 'maidata.txt', 'text/plain');
      }
      if (url.includes('/image')) {
        return responseWithDisposition(new Uint8Array([1]), 'bg.jpg', 'image/jpeg');
      }
      return responseWithDisposition(new Uint8Array([1]), 'track.mp3', 'audio/mp3');
    });
    vi.stubGlobal('fetch', fetchMock);

    const assets = await fetchChartAssets(sampleItem, false);
    expect(assets['pv.mp4']).toBeUndefined();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/video'))).toBe(false);
  });
});
