import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { buildQueueExportContent, formatExportFilename } from '@/shared/export';
import {
  addToQueue,
  clearQueue,
  getQueueCount,
  getQueueItemsByIds,
  listQueueItems,
  removeFromQueue,
} from '@/shared/queue';
import type { BackgroundMessage, BackgroundResponse } from '@/shared/types';

async function updateBadge(count: number): Promise<void> {
  const text = count > 0 ? String(count) : '';
  await browser.action.setBadgeBackgroundColor({ color: '#2563EB' });
  await browser.action.setBadgeText({ text });
}

async function handleMessage(message: BackgroundMessage): Promise<BackgroundResponse> {
  switch (message.type) {
    case 'QUEUE_ADD': {
      try {
        const result = await addToQueue(message.payload);
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
      return {
        ok: true,
        filename: formatExportFilename(),
        content: buildQueueExportContent(items),
      };
    }
    case 'QUEUE_COUNT': {
      const count = await getQueueCount();
      return { ok: true, count };
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
