import { browser } from 'wxt/browser';
import {
  openImportWindow,
  sendRuntimeMessage,
  showErrorAlert,
} from '@/shared/import-ui';
import type { BackgroundResponse, QueueItem } from '@/shared/types';
import type { ExportFormat } from '@/shared/settings';

const countLabel = document.getElementById('count-label')!;
const listEl = document.getElementById('list')!;
const statusEl = document.getElementById('status')!;
const selectAllEl = document.getElementById('select-all') as HTMLInputElement;
const exportSelectedBtn = document.getElementById('export-selected')!;
const exportAllBtn = document.getElementById('export-all')!;
const importBtn = document.getElementById('import-btn')!;
const openSettingsBtn = document.getElementById('open-settings')!;
const removeSelectedBtn = document.getElementById('remove-selected')!;
const clearAllBtn = document.getElementById('clear-all')!;

let items: QueueItem[] = [];
let exportFormat: ExportFormat = 'txt';
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
  if (areaName !== 'local' || !changes.majdata_queue_v1) return;
  loadItems().catch(() => undefined);
});

Promise.all([loadSettings(), loadItems()]).catch(() => showError('无法加载扩展数据', '加载失败'));
