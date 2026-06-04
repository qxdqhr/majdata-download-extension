import {
  formatImportResult,
  importQueueFromFile,
  showErrorAlert,
} from '@/shared/import-ui';

const fileInput = document.getElementById('import-file') as HTMLInputElement;
const pickBtn = document.getElementById('pick-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status')!;

function setStatus(message: string): void {
  statusEl.textContent = message;
}

async function runImport(file: File): Promise<void> {
  setStatus(`正在导入 ${file.name}…`);
  pickBtn.disabled = true;

  try {
    const result = await importQueueFromFile(file);
    alert(formatImportResult(result));
    window.close();
  } catch (error) {
    const message = error instanceof Error ? error.message : '导入失败';
    showErrorAlert('导入失败', message);
    setStatus('导入失败，请重新选择文件');
    pickBtn.disabled = false;
  }
}

pickBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  fileInput.value = '';
  if (!file) {
    setStatus('未选择文件');
    return;
  }
  await runImport(file);
});

requestAnimationFrame(() => {
  fileInput.click();
});
