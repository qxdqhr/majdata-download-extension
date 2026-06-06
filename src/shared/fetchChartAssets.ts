import { browser } from 'wxt/browser';
import { MAJDATA_ORIGIN } from './constants';
import type { AssetUrls, QueueItem } from './types';

export type FetchedChartAssets = Record<string, string | ArrayBuffer>;

interface ExtensionSpec {
  zipName: string;
  required: boolean;
  asText: boolean;
}

const EXTENSION_SPECS: Record<string, ExtensionSpec> = {
  mp3: { zipName: 'track.mp3', required: true, asText: false },
  txt: { zipName: 'maidata.txt', required: true, asText: true },
  jpg: { zipName: 'bg.jpg', required: true, asText: false },
  jpeg: { zipName: 'bg.jpg', required: true, asText: false },
  png: { zipName: 'bg.png', required: true, asText: false },
  mp4: { zipName: 'pv.mp4', required: false, asText: false },
};

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'audio/mp3': 'mp3',
  'audio/mpeg': 'mp3',
  'text/plain': 'txt',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'video/mp4': 'mp4',
};

export function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;

  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      return encoded[1];
    }
  }

  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain?.[1] ?? null;
}

export function extensionFromFilename(filename: string): string | null {
  const dot = filename.lastIndexOf('.');
  if (dot < 0) return null;
  return filename.slice(dot + 1).toLowerCase();
}

function extensionFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  return CONTENT_TYPE_EXTENSIONS[contentType.split(';')[0].trim().toLowerCase()] ?? null;
}

function extensionFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith('/track')) return 'mp3';
    if (pathname.endsWith('/chart')) return 'txt';
    if (pathname.endsWith('/video')) return 'mp4';
    if (pathname.includes('/image')) return 'jpg';
  } catch {
    return null;
  }
  return null;
}

export function resolveAssetExtension(response: Response, url: string): string | null {
  const disposition = response.headers.get('content-disposition');
  const filename = parseFilenameFromContentDisposition(disposition);
  if (filename) {
    const fromFilename = extensionFromFilename(filename);
    if (fromFilename && EXTENSION_SPECS[fromFilename]) {
      return fromFilename;
    }
  }

  const fromContentType = extensionFromContentType(response.headers.get('content-type'));
  if (fromContentType && EXTENSION_SPECS[fromContentType]) {
    return fromContentType;
  }

  const fromUrl = extensionFromUrl(url);
  if (fromUrl && EXTENSION_SPECS[fromUrl]) {
    return fromUrl;
  }

  return null;
}

export function zipNameForExtension(extension: string): string | null {
  return EXTENSION_SPECS[extension]?.zipName ?? null;
}

function collectAssetUrls(assets: AssetUrls, includeVideo: boolean): string[] {
  const urls = [assets.track, assets.chart, assets.image];
  if (includeVideo && assets.video.trim()) {
    urls.push(assets.video);
  }
  return urls.filter((url) => url.trim());
}

async function buildRequestHeaders(pageUrl?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Referer: pageUrl ?? `${MAJDATA_ORIGIN}/`,
    Origin: MAJDATA_ORIGIN,
    Accept: '*/*',
  };

  try {
    const cookies = await browser.cookies.getAll({ url: MAJDATA_ORIGIN });
    if (cookies.length > 0) {
      headers.Cookie = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
    }
  } catch {
    // 单测或未授予 cookies 权限时忽略
  }

  return headers;
}

async function fetchWithRetry(url: string, pageUrl?: string, retries = 1): Promise<Response> {
  let lastError: Error | undefined;
  const headers = await buildRequestHeaders(pageUrl);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers,
        cache: 'no-store',
      });
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

async function fetchAssetFile(
  url: string,
  pageUrl: string,
): Promise<{ zipName: string; data: string | ArrayBuffer } | null> {
  const response = await fetchWithRetry(url, pageUrl);
  const extension = resolveAssetExtension(response, url);
  if (!extension) return null;

  const spec = EXTENSION_SPECS[extension];
  if (!spec) return null;

  const data = spec.asText ? await response.text() : await response.arrayBuffer();
  if (!spec.asText && (data as ArrayBuffer).byteLength === 0) {
    return null;
  }
  if (spec.asText && !(data as string).trim()) {
    return null;
  }

  return { zipName: spec.zipName, data };
}

async function fetchOptionalAssetFile(
  url: string,
  pageUrl: string,
): Promise<{ zipName: string; data: string | ArrayBuffer } | null> {
  if (!url.trim()) return null;

  try {
    return await fetchAssetFile(url, pageUrl);
  } catch {
    return null;
  }
}

function assertRequiredAssets(files: FetchedChartAssets): void {
  const missing: string[] = [];
  if (!files['track.mp3']) missing.push('track.mp3');
  if (!files['maidata.txt']) missing.push('maidata.txt');
  if (!files['bg.jpg'] && !files['bg.png']) missing.push('bg.jpg/bg.png');
  if (missing.length > 0) {
    throw new Error(`缺少资源: ${missing.join(', ')}`);
  }
}

export async function fetchChartAssets(
  item: QueueItem,
  includeVideo: boolean,
): Promise<FetchedChartAssets> {
  const pageUrl = item.pageUrl || `${MAJDATA_ORIGIN}/`;
  const urls = collectAssetUrls(item.assets, includeVideo);

  const results = await Promise.all(
    urls.map(async (url) => {
      const extensionHint = extensionFromUrl(url);
      const optional = extensionHint === 'mp4';
      if (optional) {
        return fetchOptionalAssetFile(url, pageUrl);
      }
      return fetchAssetFile(url, pageUrl);
    }),
  );

  const files: FetchedChartAssets = {};
  for (const result of results) {
    if (!result) continue;
    files[result.zipName] = result.data;
  }

  assertRequiredAssets(files);
  return files;
}

export function appendChartAssetsToZipFolder(
  folder: { file: (name: string, data: string | ArrayBuffer) => void },
  assets: FetchedChartAssets,
): void {
  for (const [name, data] of Object.entries(assets)) {
    folder.file(name, data);
  }
}
