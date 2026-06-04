import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type DefaultDownloadAction,
  type ExportFormat,
  type ImportMergeStrategy,
} from '@/shared/settings';

const exportFormatEl = document.getElementById('export-format') as HTMLSelectElement;
const importStrategyEl = document.getElementById('import-merge-strategy') as HTMLSelectElement;
const batchConcurrencyEl = document.getElementById('batch-concurrency') as HTMLSelectElement;
const batchIncludeVideoEl = document.getElementById('batch-include-video') as HTMLInputElement;
const batchZipNameEl = document.getElementById('batch-zip-name') as HTMLInputElement;
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

init().catch(() => setStatus('加载设置失败', true));
