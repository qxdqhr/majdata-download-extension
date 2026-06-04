import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import {
  cancelBatchDownload,
  getBatchJobStatus,
  isBatchDownloadRunning,
  startBatchDownload,
} from '@/background/batchDownload';
import { buildQueueExport } from '@/shared/export';
import { parseQueueFile, rowsToQueueItems } from '@/shared/import';
import {
  addToQueue,
  clearQueue,
  getQueueCount,
  getQueueItemsByIds,
  importQueueItems,
  listQueueItems,
  removeFromQueue,
} from '@/shared/queue';
import { loadSettings } from '@/shared/settings';
import type { BackgroundMessage, BackgroundResponse } from '@/shared/types';

async function updateBadge(count: number): Promise<void> {
  const text = count > 0 ? String(count) : '';
  await browser.action.setBadgeBackgroundColor({ color: '#2563EB' });
  await browser.action.setBadgeText({ text });
}

async function handleMessage(message: BackgroundMessage): Promise<BackgroundResponse> {
  const settings = await loadSettings();

  switch (message.type) {
    case 'QUEUE_ADD': {
      try {
        const result = await addToQueue(message.payload, settings.queueLimit);
        await updateBadge(result.count);
        return { ok: true, duplicate: result.duplicate, count: result.count };
      } catch (error) {
        const err = error instanceof Error ? error.message : '加入列表失败';
        return { ok: false, error: err };
      }
    }
    case 'QUEUE_LIST': {
      const items = await listQueueItems();
      return { ok: true, items };
    }
    case 'QUEUE_REMOVE': {
      const count = await removeFromQueue(message.payload.songIds);
      await updateBadge(count);
      return { ok: true, count };
    }
    case 'QUEUE_CLEAR': {
      await clearQueue();
      await updateBadge(0);
      return { ok: true, count: 0 };
    }
    case 'QUEUE_EXPORT': {
      const items = await getQueueItemsByIds(message.payload.songIds);
      if (items.length === 0) {
        return { ok: false, error: '没有可导出的条目' };
      }
      const exported = buildQueueExport(items, settings.exportFormat);
      return {
        ok: true,
        filename: exported.filename,
        content: exported.content,
        mimeType: exported.mimeType,
      };
    }
    case 'QUEUE_IMPORT': {
      try {
        const parsed = parseQueueFile(message.payload.content, message.payload.filename);
        if (parsed.rows.length === 0) {
          return { ok: false, error: '文件中没有可导入的条目' };
        }

        const items = rowsToQueueItems(parsed.rows);
        const result = await importQueueItems(items, settings.importMergeStrategy, settings.queueLimit);
        await updateBadge(result.count);
        return { ok: true, ...result };
      } catch (error) {
        const err = error instanceof Error ? error.message : '导入失败';
        return { ok: false, error: err };
      }
    }
    case 'QUEUE_COUNT': {
      const count = await getQueueCount();
      return { ok: true, count };
    }
    case 'SETTINGS_GET': {
      return { ok: true, settings };
    }
    case 'BATCH_START': {
      if (isBatchDownloadRunning()) {
        return { ok: false, error: '已有批量下载任务进行中' };
      }

      const items = await getQueueItemsByIds(message.payload.songIds);
      if (items.length === 0) {
        return { ok: false, error: '没有可下载的条目' };
      }

      startBatchDownload(items, settings).catch((error) => {
        console.error('[majdata] batch download failed', error);
      });

      return { ok: true, started: true };
    }
    case 'BATCH_CANCEL': {
      cancelBatchDownload();
      return { ok: true, count: 0 };
    }
    case 'BATCH_GET_STATUS': {
      const job = await getBatchJobStatus();
      return { ok: true, job };
    }
    default:
      return { ok: false, error: '未知消息类型' };
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => {
        const err = error instanceof Error ? error.message : '后台处理失败';
        sendResponse({ ok: false, error: err });
      });
    return true;
  });

  getQueueCount().then(updateBadge).catch(() => undefined);
});
