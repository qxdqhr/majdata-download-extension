import { browser } from 'wxt/browser';
import { showConfirmDialog } from './confirmDialog';
import { findDownloadButton } from './findDownloadButton';
import { parseSongContext } from './parseSongContext';
import { showToast } from './toast';

let bypassNextDownload = false;

async function handleQueueAdd(payload: ReturnType<typeof parseSongContext>): Promise<void> {
  if (!payload) return;

  try {
    const response = await browser.runtime.sendMessage({
      type: 'QUEUE_ADD',
      payload,
    });

    if (response?.ok) {
      showToast(response.duplicate ? '已在列表中，已更新' : '已加入下载列表');
      return;
    }

    showToast(response?.error ?? '加入列表失败');
  } catch (error) {
    const message = error instanceof Error ? error.message : '加入列表失败';
    showToast(message);
  }
}

export function installDownloadInterceptor(): void {
  document.addEventListener(
    'click',
    async (event) => {
      if (bypassNextDownload) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = findDownloadButton(target);
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const ctx = parseSongContext(button);
      if (!ctx) {
        showToast('无法识别谱面信息');
        return;
      }

      const choice = await showConfirmDialog(ctx.title);

      if (choice === 'direct') {
        bypassNextDownload = true;
        button.click();
        queueMicrotask(() => {
          bypassNextDownload = false;
        });
        return;
      }

      if (choice === 'queue') {
        await handleQueueAdd(ctx);
      }
    },
    true,
  );
}
