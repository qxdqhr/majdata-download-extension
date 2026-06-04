import type { QueueItem } from './types';

export interface FetchedChartAssets {
  track: ArrayBuffer;
  chart: string;
  image: ArrayBuffer;
  video?: ArrayBuffer;
}

async function fetchWithRetry(url: string, retries = 1): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('网络请求失败');
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  throw lastError ?? new Error('网络请求失败');
}

export async function fetchChartAssets(
  item: QueueItem,
  includeVideo: boolean,
): Promise<FetchedChartAssets> {
  const { assets } = item;

  const [trackRes, chartRes, imageRes] = await Promise.all([
    fetchWithRetry(assets.track),
    fetchWithRetry(assets.chart),
    fetchWithRetry(assets.image),
  ]);

  const track = await trackRes.arrayBuffer();
  const chart = await chartRes.text();
  const image = await imageRes.arrayBuffer();

  let video: ArrayBuffer | undefined;
  if (includeVideo && assets.video) {
    try {
      const videoRes = await fetchWithRetry(assets.video);
      video = await videoRes.arrayBuffer();
    } catch {
      // pv.mp4 为可选资源
    }
  }

  return { track, chart, image, video };
}

export function appendChartAssetsToZipFolder(
  folder: { file: (name: string, data: string | ArrayBuffer) => void },
  assets: FetchedChartAssets,
): void {
  folder.file('track.mp3', assets.track);
  folder.file('bg.jpg', assets.image);
  folder.file('maidata.txt', assets.chart);
  if (assets.video) {
    folder.file('pv.mp4', assets.video);
  }
}
