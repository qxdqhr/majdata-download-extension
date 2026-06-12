import { browser } from 'wxt/browser';
import {
  buildServeZipRequest,
  NATIVE_HOST_NAME,
  type LocalServerRequest,
  type LocalServerResponse,
} from '@/shared/local-server';
import {
  basenameFromPath,
  LAST_BATCH_ZIP_KEY,
  LOCAL_SERVER_STATE_KEY,
  type LocalServerUiState,
  type RecentZipItem,
  type StoredLastBatchZip,
  type StoredLocalServerState,
} from '@/shared/local-server-state';
import type { ExtensionSettings } from '@/shared/settings';

const DOWNLOAD_WAIT_MS = 120_000;

export async function sendNativeHostRequest(
  request: LocalServerRequest,
): Promise<LocalServerResponse> {
  const response = await browser.runtime.sendNativeMessage(NATIVE_HOST_NAME, request);
  if (!response || typeof response !== 'object') {
    return { ok: false, error: 'Native host 无响应' };
  }
  return response as LocalServerResponse;
}

export async function pingNativeHost(): Promise<LocalServerResponse> {
  try {
    return await sendNativeHostRequest({ cmd: 'ping' });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '无法连接 Native host',
    };
  }
}

export function waitForDownloadPath(downloadId: number, timeoutMs = DOWNLOAD_WAIT_MS): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      browser.downloads.onChanged.removeListener(onChanged);
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    const onChanged = (delta: chrome.downloads.DownloadDelta) => {
      if (delta.id !== downloadId) return;

      if (delta.error?.current) {
        finish(null);
        return;
      }

      if (delta.state?.current !== 'complete') return;

      void browser.downloads.search({ id: downloadId }).then((items) => {
        finish(items[0]?.filename ?? null);
      });
    };

    browser.downloads.onChanged.addListener(onChanged);

    void browser.downloads.search({ id: downloadId }).then((items) => {
      const item = items[0];
      if (item?.state === 'complete' && item.filename) {
        finish(item.filename);
      }
    });
  });
}

export async function recordLastBatchZip(path: string): Promise<void> {
  const record: StoredLastBatchZip = {
    path,
    filename: basenameFromPath(path),
    savedAt: new Date().toISOString(),
  };
  await browser.storage.session.set({ [LAST_BATCH_ZIP_KEY]: record });
}

export async function getLastBatchZip(): Promise<StoredLastBatchZip | null> {
  const result = await browser.storage.session.get(LAST_BATCH_ZIP_KEY);
  return (result[LAST_BATCH_ZIP_KEY] as StoredLastBatchZip | undefined) ?? null;
}

export async function listRecentPlaylistZips(prefix: string, limit = 5): Promise<RecentZipItem[]> {
  const safePrefix = prefix.replace(/[/\\:*?"<>|]/g, '_').trim() || 'majdata-playlist';
  const downloads = await browser.downloads.search({
    orderBy: ['-startTime'],
    limit: 50,
    state: 'complete',
  });

  const items: RecentZipItem[] = [];
  for (const item of downloads) {
    if (!item.filename?.endsWith('.zip')) continue;
    const filename = basenameFromPath(item.filename);
    if (!filename.startsWith(safePrefix)) continue;
    items.push({
      path: item.filename,
      filename,
      startTime: typeof item.startTime === 'number' ? item.startTime : undefined,
    });
    if (items.length >= limit) break;
  }
  return items;
}

async function loadStoredServerState(): Promise<StoredLocalServerState> {
  const result = await browser.storage.session.get(LOCAL_SERVER_STATE_KEY);
  return (result[LOCAL_SERVER_STATE_KEY] as StoredLocalServerState | undefined) ?? {};
}

async function saveStoredServerState(state: StoredLocalServerState): Promise<void> {
  await browser.storage.session.set({ [LOCAL_SERVER_STATE_KEY]: state });
}

async function clearStoredServerState(): Promise<void> {
  await browser.storage.session.remove(LOCAL_SERVER_STATE_KEY);
}

function resolveZipPath(
  zipPath: string | undefined,
  recentZips: RecentZipItem[],
  lastBatch: StoredLastBatchZip | null,
): string | null {
  if (zipPath?.trim()) return zipPath;
  if (lastBatch?.path) return lastBatch.path;
  return recentZips[0]?.path ?? null;
}

export async function getLocalServerUiState(settings: ExtensionSettings): Promise<LocalServerUiState> {
  const [hostStatus, stored, lastBatch, recentZips] = await Promise.all([
    pingNativeHost(),
    loadStoredServerState(),
    getLastBatchZip(),
    listRecentPlaylistZips(settings.batchZipName),
  ]);

  const hostReady = hostStatus.ok;
  const running = Boolean(hostReady && hostStatus.running && hostStatus.url);

  return {
    running,
    url: running ? hostStatus.url : stored.url,
    root: running ? hostStatus.root : stored.root,
    sourceZip: stored.sourceZip,
    sourceLabel: stored.sourceLabel,
    error: stored.error,
    hostReady,
    hostError: hostReady ? undefined : hostStatus.error ?? 'Native Host 未安装',
    recentZips,
    lastBatchZip: lastBatch?.path,
  };
}

export async function startLocalServer(
  settings: ExtensionSettings,
  zipPath?: string,
): Promise<LocalServerUiState> {
  const hostStatus = await pingNativeHost();
  if (!hostStatus.ok) {
    const state: StoredLocalServerState = {
      error: hostStatus.error ?? 'Native Host 未安装，请先在设置页完成一次性安装',
    };
    await saveStoredServerState(state);
    return getLocalServerUiState(settings);
  }

  const [recentZips, lastBatch] = await Promise.all([
    listRecentPlaylistZips(settings.batchZipName),
    getLastBatchZip(),
  ]);
  const resolvedPath = resolveZipPath(zipPath, recentZips, lastBatch);
  if (!resolvedPath) {
    const state: StoredLocalServerState = {
      error: '没有可分享的歌单 ZIP，请先完成一次批量下载',
    };
    await saveStoredServerState(state);
    return getLocalServerUiState(settings);
  }

  const request = buildServeZipRequest(resolvedPath, settings.localServerPort);
  const result = await sendNativeHostRequest(request);

  if (result.ok && result.url) {
    const label = basenameFromPath(resolvedPath);
    await saveStoredServerState({
      sourceZip: resolvedPath,
      sourceLabel: label,
      url: result.url,
      root: result.root,
      error: undefined,
    });
    await notifyLocalServerStarted(result.url, result.root);
    return getLocalServerUiState(settings);
  }

  await saveStoredServerState({
    sourceZip: resolvedPath,
    sourceLabel: basenameFromPath(resolvedPath),
    error: result.error ?? '本地 HTTP 服务启动失败',
  });
  return getLocalServerUiState(settings);
}

export async function stopLocalServer(settings: ExtensionSettings): Promise<LocalServerUiState> {
  try {
    await sendNativeHostRequest({ cmd: 'stop' });
  } catch {
    // 停止失败时仍清除 UI 状态，避免开关卡住
  }
  await clearStoredServerState();
  return getLocalServerUiState(settings);
}

const NOTIFICATION_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export async function notifyLocalServerStarted(url: string, root?: string): Promise<void> {
  const message = root
    ? `本地 HTTP 服务已启动：${url}\n目录：${root}`
    : `本地 HTTP 服务已启动：${url}`;

  if (browser.notifications) {
    await browser.notifications.create('majdata-local-server', {
      type: 'basic',
      iconUrl: NOTIFICATION_ICON,
      title: 'Majdata 本地分享',
      message,
    });
    return;
  }

  console.info('[majdata]', message);
}

