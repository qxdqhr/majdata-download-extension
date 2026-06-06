import { browser } from 'wxt/browser';
import {
  buildServeZipRequest,
  NATIVE_HOST_NAME,
  type LocalServerRequest,
  type LocalServerResponse,
} from '@/shared/local-server';
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

export async function startLocalServerForDownload(
  downloadId: number,
  settings: ExtensionSettings,
): Promise<LocalServerResponse> {
  if (!settings.autoStartLocalServer) {
    return { ok: false, error: '未启用自动启动本地服务' };
  }

  const downloadPath = await waitForDownloadPath(downloadId);
  if (!downloadPath) {
    return { ok: false, error: '未能获取下载文件路径' };
  }

  const request = buildServeZipRequest(downloadPath, settings.localServerPort);
  return sendNativeHostRequest(request);
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
      title: 'Majdata 本地服务',
      message,
    });
    return;
  }

  console.info('[majdata]', message);
}
