import JSZip from 'jszip';
import { browser } from 'wxt/browser';
import {
  notifyLocalServerStarted,
  startLocalServerForDownload,
} from '@/background/localServer';
import {
  BATCH_JOB_STORAGE_KEY,
  BATCH_MAX_ITEMS,
  BATCH_PLAYLIST_VERSION,
  emptyBatchJob,
  formatBatchZipFilename,
  type BatchJobState,
} from '@/shared/batch-job';
import { MAJDATA_ORIGIN } from '@/shared/constants';
import { appendChartAssetsToZipFolder, fetchChartAssets } from '@/shared/fetchChartAssets';
import { uniqueFolderName } from '@/shared/sanitize';
import type { ExtensionSettings } from '@/shared/settings';
import type { QueueItem } from '@/shared/types';

let abortController: AbortController | null = null;
let running = false;

export function isBatchDownloadRunning(): boolean {
  return running;
}

export function cancelBatchDownload(): void {
  abortController?.abort();
}

async function saveBatchJob(job: BatchJobState): Promise<void> {
  await browser.storage.session.set({ [BATCH_JOB_STORAGE_KEY]: job });
}

async function processWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
  signal: AbortSignal,
): Promise<void> {
  const limit = Math.max(1, Math.min(2, Math.floor(concurrency)));
  let nextIndex = 0;

  async function runner(): Promise<void> {
    while (!signal.aborted) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) break;
      await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => runner()));
}

function buildManifest(job: BatchJobState, total: number) {
  return {
    version: BATCH_PLAYLIST_VERSION,
    exportedAt: new Date().toISOString(),
    origin: MAJDATA_ORIGIN,
    total,
    success: job.success,
    failed: job.failed,
  };
}

async function downloadZipArchive(
  zip: JSZip,
  filename: string,
  saveAs: boolean,
): Promise<number> {
  // Service Worker 中无 URL.createObjectURL，使用 data URL 交给 downloads API
  const base64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
  });

  return browser.downloads.download({
    url: `data:application/zip;base64,${base64}`,
    filename,
    saveAs,
  });
}

async function tryAutoStartLocalServer(
  downloadId: number,
  settings: ExtensionSettings,
  job: BatchJobState,
): Promise<void> {
  if (!settings.autoStartLocalServer) return;

  job.currentTitle = '正在启动本地 HTTP 服务…';
  await saveBatchJob({ ...job });

  try {
    const result = await startLocalServerForDownload(downloadId, settings);
    if (result.ok && result.url) {
      job.localServerUrl = result.url;
      job.localServerError = undefined;
      await notifyLocalServerStarted(result.url, result.root);
      return;
    }
    job.localServerError = result.error ?? '本地 HTTP 服务启动失败';
  } catch (error) {
    job.localServerError = error instanceof Error ? error.message : '本地 HTTP 服务启动失败';
  } finally {
    job.currentTitle = '';
    await saveBatchJob({ ...job });
  }
}

export async function startBatchDownload(
  items: QueueItem[],
  settings: ExtensionSettings,
): Promise<void> {
  if (running) {
    throw new Error('已有批量下载任务进行中');
  }
  if (items.length === 0) {
    throw new Error('没有可下载的条目');
  }
  if (items.length > BATCH_MAX_ITEMS) {
    throw new Error(`一次最多下载 ${BATCH_MAX_ITEMS} 首，请减少选中数量`);
  }

  running = true;
  abortController = new AbortController();
  const signal = abortController.signal;

  const job: BatchJobState = {
    ...emptyBatchJob(),
    status: 'running',
    total: items.length,
  };
  await saveBatchJob(job);

  const zip = new JSZip();
  const usedFolders = new Set<string>();

  try {
    await processWithConcurrency(
      items,
      settings.batchConcurrency,
      async (item, index) => {
        if (signal.aborted) return;

        job.current = index + 1;
        job.currentTitle = item.title;
        await saveBatchJob({ ...job });

        const folderName = uniqueFolderName(item.title, item.songId, usedFolders);
        try {
          const assets = await fetchChartAssets(item, settings.batchIncludeVideo);
          if (signal.aborted) return;

          const folder = zip.folder(folderName);
          if (!folder) {
            throw new Error('无法创建 ZIP 子目录');
          }
          appendChartAssetsToZipFolder(folder, assets);
          job.success += 1;
        } catch (error) {
          job.failed.push({
            songId: item.songId,
            title: item.title,
            error: error instanceof Error ? error.message : '下载失败',
          });
        }

        await saveBatchJob({ ...job });
      },
      signal,
    );

    if (signal.aborted) {
      job.status = 'cancelled';
      job.currentTitle = '';
      await saveBatchJob({ ...job });
      return;
    }

    zip.file('manifest.json', JSON.stringify(buildManifest(job, items.length), null, 2));

    job.currentTitle = '正在打包 ZIP…';
    await saveBatchJob({ ...job });

    if (signal.aborted) {
      job.status = 'cancelled';
      job.currentTitle = '';
      await saveBatchJob({ ...job });
      return;
    }

    const filename = formatBatchZipFilename(settings.batchZipName);
    const downloadId = await downloadZipArchive(zip, filename, !settings.autoStartLocalServer);

    await tryAutoStartLocalServer(downloadId, settings, job);

    job.status = 'done';
    job.current = items.length;
    job.currentTitle = '';
    await saveBatchJob({ ...job });
  } catch (error) {
    job.status = 'error';
    job.error = error instanceof Error ? error.message : '批量下载失败';
    job.currentTitle = '';
    await saveBatchJob({ ...job });
    throw error;
  } finally {
    running = false;
    abortController = null;
  }
}

export async function getBatchJobStatus(): Promise<BatchJobState | null> {
  const result = await browser.storage.session.get(BATCH_JOB_STORAGE_KEY);
  return (result[BATCH_JOB_STORAGE_KEY] as BatchJobState | undefined) ?? null;
}
