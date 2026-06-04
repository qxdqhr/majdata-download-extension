import { browser } from 'wxt/browser';
import { showConfirmDialog } from './confirmDialog';
import { findDownloadButton } from './findDownloadButton';
import { parseSongContext } from './parseSongContext';
import { showToast } from './toast';
import { loadSettings } from '@/shared/settings';
import type { DefaultDownloadAction, ExtensionSettings } from '@/shared/settings';

let bypassNextDownload = false;
let settings: ExtensionSettings | null = null;

async function refreshSettings(): Promise<ExtensionSettings> {
  settings = await loadSettings();
  return settings;
}

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

async function resolveDownloadAction(
  title: string,
  defaultAction: DefaultDownloadAction,
): Promise<'direct' | 'queue' | 'cancel'> {
  if (defaultAction === 'direct') return 'direct';
  if (defaultAction === 'queue') return 'queue';
  return showConfirmDialog(title);
}

export function installDownloadInterceptor(): void {
  refreshSettings().catch(() => undefined);

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' || !changes.majdata_settings_v1) return;
    refreshSettings().catch(() => undefined);
  });

  document.addEventListener(
    'click',
    async (event) => {
      if (bypassNextDownload) return;

      const currentSettings = settings ?? (await refreshSettings());
      if (!currentSettings.interceptEnabled) return;

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

      const choice = await resolveDownloadAction(ctx.title, currentSettings.defaultDownloadAction);

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
