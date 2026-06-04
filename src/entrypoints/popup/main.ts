import { browser } from 'wxt/browser';
import {
  openImportWindow,
  sendRuntimeMessage,
  showErrorAlert,
} from '@/shared/import-ui';
import { BATCH_JOB_STORAGE_KEY, BATCH_MAX_ITEMS, type BatchJobState } from '@/shared/batch-job';
import type { BackgroundResponse, QueueItem } from '@/shared/types';
import type { ExportFormat } from '@/shared/settings';

const countLabel = document.getElementById('count-label')!;
const listEl = document.getElementById('list')!;
const statusEl = document.getElementById('status')!;
const selectAllEl = document.getElementById('select-all') as HTMLInputElement;
const exportSelectedBtn = document.getElementById('export-selected') as HTMLButtonElement;
const exportAllBtn = document.getElementById('export-all') as HTMLButtonElement;
const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
const batchSelectedBtn = document.getElementById('batch-selected') as HTMLButtonElement;
const batchAllBtn = document.getElementById('batch-all') as HTMLButtonElement;
const batchPanel = document.getElementById('batch-panel')!;
const progressFill = document.getElementById('progress-fill')!;
const batchStatusEl = document.getElementById('batch-status')!;
const batchCancelBtn = document.getElementById('batch-cancel') as HTMLButtonElement;
const openSettingsBtn = document.getElementById('open-settings')!;
const removeSelectedBtn = document.getElementById('remove-selected') as HTMLButtonElement;
const clearAllBtn = document.getElementById('clear-all') as HTMLButtonElement;

const batchActionButtons: HTMLButtonElement[] = [
  batchSelectedBtn,
  batchAllBtn,
  exportSelectedBtn,
  exportAllBtn,
  importBtn,
  removeSelectedBtn,
  clearAllBtn,
];

let items: QueueItem[] = [];
let exportFormat: ExportFormat = 'txt';
let lastNotifiedStatus: BatchJobState['status'] | null = null;
const selected = new Set<string>();

function exportFormatLabel(format: ExportFormat): string {
  return format === 'json' ? 'JSON' : 'TXT';
}

function updateExportButtonLabels(): void {
  const label = exportFormatLabel(exportFormat);
  exportSelectedBtn.textContent = `导出选中 (${label})`;
  exportAllBtn.textContent = `导出全部 (${label})`;
}

function setStatus(message: string, isError = false): void {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function showError(message: string, title = '操作失败'): void {
  setStatus(message, true);
  showErrorAlert(title, message);
}

function setBatchControlsEnabled(enabled: boolean): void {
  for (const button of batchActionButtons) {
    button.disabled = !enabled;
  }
  selectAllEl.disabled = !enabled || items.length === 0;
}

function applyBatchJob(job: BatchJobState | null | undefined): void {
  if (!job || job.status === 'idle') {
    batchPanel.classList.add('hidden');
    setBatchControlsEnabled(true);
    return;
  }

  batchPanel.classList.remove('hidden');

  if (job.status === 'running') {
    setBatchControlsEnabled(false);
    const percent = job.total > 0 ? Math.round((job.current / job.total) * 100) : 0;
    progressFill.style.width = `${percent}%`;
    batchStatusEl.textContent = job.currentTitle
      ? `正在下载 ${job.current}/${job.total}：${job.currentTitle}`
      : `正在下载 ${job.current}/${job.total}`;
    return;
  }

  setBatchControlsEnabled(true);

  if (job.status === 'done' && lastNotifiedStatus !== 'done') {
    lastNotifiedStatus = 'done';
    const failedHint = job.failed.length > 0 ? `\n\n失败 ${job.failed.length} 首（详见 ZIP 内 manifest.json）` : '';
    alert(`批量下载完成\n\n成功 ${job.success}/${job.total} 首${failedHint}`);
    batchPanel.classList.add('hidden');
    setStatus(`批量下载完成：成功 ${job.success}/${job.total} 首`);
    return;
  }

  if (job.status === 'error' && lastNotifiedStatus !== 'error') {
    lastNotifiedStatus = 'error';
    showError(job.error ?? '批量下载失败', '批量下载失败');
    batchPanel.classList.add('hidden');
    return;
  }

  if (job.status === 'cancelled' && lastNotifiedStatus !== 'cancelled') {
    lastNotifiedStatus = 'cancelled';
    setStatus('已取消批量下载');
    batchPanel.classList.add('hidden');
  }
}

async function refreshBatchStatus(): Promise<void> {
  const response = await sendMessage<{ ok: true; job: BatchJobState | null } | { ok: false; error: string }>({
    type: 'BATCH_GET_STATUS',
  });
  if (response.ok && 'job' in response) {
    applyBatchJob(response.job);
  }
}

async function startBatchDownload(songIds: string[]): Promise<void> {
  if (songIds.length === 0) {
    showError('请先选择要下载的条目', '批量下载失败');
    return;
  }
  if (songIds.length > BATCH_MAX_ITEMS) {
    showError(`一次最多下载 ${BATCH_MAX_ITEMS} 首，请减少选中数量`, '批量下载失败');
    return;
  }

  lastNotifiedStatus = null;

  try {
    const response = await sendMessage<{ ok: true; started: true } | { ok: false; error: string }>({
      type: 'BATCH_START',
      payload: { songIds },
    });

    if (!response.ok || !('started' in response)) {
      showError('error' in response ? response.error : '无法开始批量下载', '批量下载失败');
      return;
    }

    await refreshBatchStatus();
  } catch (error) {
    const message = error instanceof Error ? error.message : '批量下载失败';
    showError(message, '批量下载失败');
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function renderList(): void {
  countLabel.textContent = `${items.length} 首待下载`;

  if (items.length === 0) {
    listEl.innerHTML = `
      <div class="empty">
        列表为空<br />
        在 majdata.net 点击下载并选择「加入下载列表」
      </div>
    `;
    selectAllEl.checked = false;
    selectAllEl.indeterminate = false;
    selectAllEl.disabled = true;
    return;
  }

  selectAllEl.disabled = false;
  listEl.innerHTML = items
    .map(
      (item) => `
      <article class="item" data-id="${escapeAttr(item.songId)}">
        <input type="checkbox" class="item-check" data-id="${escapeAttr(item.songId)}" ${selected.has(item.songId) ? 'checked' : ''} />
        <div>
          <p class="item-title">
            <a class="item-link" href="${escapeAttr(item.pageUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>
          </p>
          <p class="item-meta">${escapeHtml(item.artist ?? '未知艺术家')} · ${formatTime(item.addedAt)}</p>
        </div>
        <button type="button" class="icon-btn remove-one" data-id="${escapeAttr(item.songId)}" title="删除">×</button>
      </article>
    `,
    )
    .join('');

  syncSelectAllState();
}

function syncSelectAllState(): void {
  if (items.length === 0) {
    selectAllEl.checked = false;
    selectAllEl.indeterminate = false;
    return;
  }
  const selectedCount = items.filter((item) => selected.has(item.songId)).length;
  selectAllEl.checked = selectedCount === items.length;
  selectAllEl.indeterminate = selectedCount > 0 && selectedCount < items.length;
}

async function sendMessage<T extends BackgroundResponse>(message: unknown): Promise<T> {
  return sendRuntimeMessage<T>(message);
}

async function loadSettings(): Promise<void> {
  const response = await sendMessage<
    { ok: true; settings: { exportFormat: ExportFormat } } | { ok: false; error: string }
  >({ type: 'SETTINGS_GET' });

  if (response.ok && 'settings' in response) {
    exportFormat = response.settings.exportFormat;
    updateExportButtonLabels();
  }
}

async function loadItems(): Promise<void> {
  const response = await sendMessage<{ ok: true; items: QueueItem[] } | { ok: false; error: string }>({
    type: 'QUEUE_LIST',
  });

  if (!response.ok || !('items' in response)) {
    showError('无法加载下载列表', '加载失败');
    return;
  }

  items = response.items;
  const existingIds = new Set(items.map((item) => item.songId));
  for (const id of [...selected]) {
    if (!existingIds.has(id)) selected.delete(id);
  }
  renderList();
}

async function exportItems(songIds: string[]): Promise<void> {
  if (songIds.length === 0) {
    showError('请先选择要导出的条目', '导出失败');
    return;
  }

  try {
    const response = await sendMessage<
      { ok: true; filename: string; content: string; mimeType?: string } | { ok: false; error: string }
    >({
      type: 'QUEUE_EXPORT',
      payload: { songIds },
    });

    if (!response.ok || !('content' in response)) {
      showError('error' in response ? response.error : '导出失败', '导出失败');
      return;
    }

    const blob = new Blob([response.content], {
      type: response.mimeType ?? 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = response.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(`已导出 ${songIds.length} 条 (${exportFormatLabel(exportFormat)})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : '导出失败';
    showError(message, '导出失败');
  }
}

async function removeItems(songIds: string[]): Promise<void> {
  if (songIds.length === 0) {
    showError('请先选择要删除的条目', '删除失败');
    return;
  }

  const response = await sendMessage<{ ok: true; count: number } | { ok: false; error: string }>({
    type: 'QUEUE_REMOVE',
    payload: { songIds },
  });

  if (!response.ok) {
    showError('error' in response ? response.error : '删除失败', '删除失败');
    return;
  }

  for (const id of songIds) selected.delete(id);
  await loadItems();
  setStatus(`已删除 ${songIds.length} 条`);
}

selectAllEl.addEventListener('change', () => {
  if (selectAllEl.checked) {
    items.forEach((item) => selected.add(item.songId));
  } else {
    selected.clear();
  }
  renderList();
});

listEl.addEventListener('change', (event) => {
  const target = event.target as HTMLElement;
  if (!target.classList.contains('item-check')) return;
  const id = (target as HTMLInputElement).dataset.id;
  if (!id) return;
  if ((target as HTMLInputElement).checked) selected.add(id);
  else selected.delete(id);
  syncSelectAllState();
});

listEl.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement;
  const removeBtn = target.closest('.remove-one') as HTMLElement | null;
  if (!removeBtn) return;
  const id = removeBtn.dataset.id;
  if (!id) return;
  await removeItems([id]);
});

exportSelectedBtn.addEventListener('click', () => {
  exportItems([...selected]);
});

exportAllBtn.addEventListener('click', () => {
  exportItems(items.map((item) => item.songId));
});

importBtn.addEventListener('click', async () => {
  try {
    await openImportWindow();
  } catch (error) {
    const message = error instanceof Error ? error.message : '无法打开导入窗口';
    showError(message, '导入失败');
  }
});

batchSelectedBtn.addEventListener('click', () => {
  startBatchDownload([...selected]);
});

batchAllBtn.addEventListener('click', () => {
  startBatchDownload(items.map((item) => item.songId));
});

batchCancelBtn.addEventListener('click', async () => {
  await sendMessage({ type: 'BATCH_CANCEL' });
  setStatus('正在取消…');
});

openSettingsBtn.addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

removeSelectedBtn.addEventListener('click', () => {
  removeItems([...selected]);
});

clearAllBtn.addEventListener('click', async () => {
  if (!confirm('确定清空全部下载列表？')) return;
  const response = await sendMessage<{ ok: true } | { ok: false; error: string }>({ type: 'QUEUE_CLEAR' });
  if (!response.ok) {
    showError('error' in response ? response.error : '清空失败', '清空失败');
    return;
  }
  selected.clear();
  await loadItems();
  setStatus('已清空列表');
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, '&quot;');
}

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.majdata_queue_v1) {
    loadItems().catch(() => undefined);
  }
  if (areaName === 'session' && changes[BATCH_JOB_STORAGE_KEY]) {
    applyBatchJob(changes[BATCH_JOB_STORAGE_KEY].newValue as BatchJobState | undefined);
  }
});

Promise.all([loadSettings(), loadItems(), refreshBatchStatus()]).catch(() =>
  showError('无法加载扩展数据', '加载失败'),
);
