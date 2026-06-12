import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type DefaultDownloadAction,
  type ExportFormat,
  type ImportMergeStrategy,
} from '@/shared/settings';
import { browser } from 'wxt/browser';

const exportFormatEl = document.getElementById('export-format') as HTMLSelectElement;
const importStrategyEl = document.getElementById('import-merge-strategy') as HTMLSelectElement;
const batchConcurrencyEl = document.getElementById('batch-concurrency') as HTMLSelectElement;
const batchIncludeVideoEl = document.getElementById('batch-include-video') as HTMLInputElement;
const batchZipNameEl = document.getElementById('batch-zip-name') as HTMLInputElement;
const localServerPortEl = document.getElementById('local-server-port') as HTMLInputElement;
const testLocalServerBtn = document.getElementById('test-local-server') as HTMLButtonElement;
const localServerStatusEl = document.getElementById('local-server-status')!;
const interceptEnabledEl = document.getElementById('intercept-enabled') as HTMLInputElement;
const defaultActionEl = document.getElementById('default-download-action') as HTMLSelectElement;
const queueLimitEl = document.getElementById('queue-limit') as HTMLInputElement;
const saveBtn = document.getElementById('save-btn')!;
const statusEl = document.getElementById('status')!;

function setStatus(message: string, isError = false): void {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function applySettingsToForm(settings = DEFAULT_SETTINGS): void {
  exportFormatEl.value = settings.exportFormat;
  importStrategyEl.value = settings.importMergeStrategy;
  batchConcurrencyEl.value = String(settings.batchConcurrency);
  batchIncludeVideoEl.checked = settings.batchIncludeVideo;
  batchZipNameEl.value = settings.batchZipName;
  localServerPortEl.value = String(settings.localServerPort);
  interceptEnabledEl.checked = settings.interceptEnabled;
  defaultActionEl.value = settings.defaultDownloadAction;
  queueLimitEl.value = String(settings.queueLimit);
}

async function init(): Promise<void> {
  const settings = await loadSettings();
  applySettingsToForm(settings);
}

saveBtn.addEventListener('click', async () => {
  try {
    const queueLimit = Number.parseInt(queueLimitEl.value, 10);
    const batchConcurrency = Number.parseInt(batchConcurrencyEl.value, 10);
    await saveSettings({
      exportFormat: exportFormatEl.value as ExportFormat,
      importMergeStrategy: importStrategyEl.value as ImportMergeStrategy,
      batchConcurrency,
      batchIncludeVideo: batchIncludeVideoEl.checked,
      batchZipName: batchZipNameEl.value,
      localServerPort: Number.parseInt(localServerPortEl.value, 10),
      interceptEnabled: interceptEnabledEl.checked,
      defaultDownloadAction: defaultActionEl.value as DefaultDownloadAction,
      queueLimit,
    });
    setStatus('设置已保存');
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存失败';
    setStatus(message, true);
  }
});

testLocalServerBtn.addEventListener('click', async () => {
  localServerStatusEl.textContent = '正在检测…';
  try {
    const response = await browser.runtime.sendMessage({ type: 'LOCAL_SERVER_PING' });
    if (!response?.ok || !('localServer' in response)) {
      localServerStatusEl.textContent = response?.error ?? '检测失败';
      localServerStatusEl.classList.add('error');
      return;
    }
    const { localServer } = response;
    if (localServer.ok) {
      const runningHint = localServer.running && localServer.url ? `，当前运行：${localServer.url}` : '';
      localServerStatusEl.textContent = `Native Host 可用${runningHint}`;
      localServerStatusEl.classList.remove('error');
      return;
    }
    localServerStatusEl.textContent = localServer.error ?? 'Native Host 不可用，请在 Popup「本地分享」下载安装脚本';
    localServerStatusEl.classList.add('error');
  } catch (error) {
    const message = error instanceof Error ? error.message : '检测失败';
    localServerStatusEl.textContent = message;
    localServerStatusEl.classList.add('error');
  }
});

init().catch(() => setStatus('加载设置失败', true));
