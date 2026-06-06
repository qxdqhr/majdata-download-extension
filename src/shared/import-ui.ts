import { browser } from 'wxt/browser';
import type { BackgroundResponse, ImportQueueResult } from './types';

export function formatImportResult(result: ImportQueueResult): string {
  const parts = [`新增 ${result.imported} 条`];
  if (result.updated > 0) parts.push(`更新 ${result.updated} 条`);
  if (result.skipped > 0) parts.push(`跳过 ${result.skipped} 条`);
  return `导入完成：${parts.join('，')}（共 ${result.count} 条）`;
}

export async function sendRuntimeMessage<T extends BackgroundResponse>(message: unknown): Promise<T> {
  const response = (await browser.runtime.sendMessage(message)) as T | undefined;
  if (response === undefined) {
    throw new Error('扩展后台未响应，请重新加载扩展后重试');
  }
  return response;
}

export async function importQueueFromFile(file: File): Promise<ImportQueueResult> {
  const content = await file.text();
  if (!content.trim()) {
    throw new Error('文件为空');
  }

  const response = await sendRuntimeMessage<
    ({ ok: true } & ImportQueueResult) | { ok: false; error: string }
  >({
    type: 'QUEUE_IMPORT',
    payload: { content, filename: file.name },
  });

  if (!response.ok || !('imported' in response)) {
    throw new Error('error' in response ? response.error : '导入失败');
  }

  return {
    imported: response.imported,
    updated: response.updated,
    skipped: response.skipped,
    count: response.count,
  };
}

export async function openImportWindow(): Promise<void> {
  await browser.windows.create({
    url: chrome.runtime.getURL('/import.html'),
    type: 'popup',
    width: 420,
    height: 300,
    focused: true,
  });
}

export function showErrorAlert(title: string, message: string): void {
  alert(`${title}\n\n${message}`);
}
