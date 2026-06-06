export const BATCH_JOB_STORAGE_KEY = 'majdata_batch_job';
export const BATCH_MAX_ITEMS = 50;
export const BATCH_PLAYLIST_VERSION = 'MAJDATA-PLAYLIST v1';

export interface BatchJobFailedItem {
  songId: string;
  title: string;
  error: string;
}

export type BatchJobStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

export interface BatchJobState {
  status: BatchJobStatus;
  total: number;
  current: number;
  currentTitle: string;
  success: number;
  failed: BatchJobFailedItem[];
  error?: string;
  localServerUrl?: string;
  localServerError?: string;
}

export function emptyBatchJob(): BatchJobState {
  return {
    status: 'idle',
    total: 0,
    current: 0,
    currentTitle: '',
    success: 0,
    failed: [],
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatBatchZipFilename(prefix: string, date: Date = new Date()): string {
  const safe = prefix.replace(/[/\\:*?"<>|]/g, '_').trim() || 'majdata-playlist';
  return `${safe}-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.zip`;
}
