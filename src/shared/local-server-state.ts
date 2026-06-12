export const LOCAL_SERVER_STATE_KEY = 'majdata_local_server_state';
export const LAST_BATCH_ZIP_KEY = 'majdata_last_batch_zip';

export interface RecentZipItem {
  path: string;
  filename: string;
  startTime?: number;
}

export interface LocalServerUiState {
  running: boolean;
  url?: string;
  root?: string;
  sourceZip?: string;
  sourceLabel?: string;
  error?: string;
  hostReady: boolean;
  hostError?: string;
  recentZips: RecentZipItem[];
  lastBatchZip?: string;
}

export interface StoredLocalServerState {
  sourceZip?: string;
  sourceLabel?: string;
  url?: string;
  root?: string;
  error?: string;
}

export interface StoredLastBatchZip {
  path: string;
  filename: string;
  savedAt: string;
}

export function basenameFromPath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(index + 1) : normalized;
}

/** @deprecated 请使用扩展内「下载安装脚本」一键安装 */
export function buildNativeHostInstallCommand(_extensionId: string): string {
  return '请在 Popup「本地分享」点击「下载安装脚本」';
}
