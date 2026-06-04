import { browser } from 'wxt/browser';
import { DEFAULT_QUEUE_LIMIT } from './constants';

export type ExportFormat = 'txt' | 'json';
export type ImportMergeStrategy = 'merge' | 'replace';
export type DefaultDownloadAction = 'ask' | 'direct' | 'queue';

export interface ExtensionSettings {
  exportFormat: ExportFormat;
  importMergeStrategy: ImportMergeStrategy;
  interceptEnabled: boolean;
  defaultDownloadAction: DefaultDownloadAction;
  queueLimit: number;
}

export const SETTINGS_STORAGE_KEY = 'majdata_settings_v1';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  exportFormat: 'txt',
  importMergeStrategy: 'merge',
  interceptEnabled: true,
  defaultDownloadAction: 'ask',
  queueLimit: DEFAULT_QUEUE_LIMIT,
};

export async function loadSettings(): Promise<ExtensionSettings> {
  const result = await browser.storage.sync.get(SETTINGS_STORAGE_KEY);
  const stored = result[SETTINGS_STORAGE_KEY] as Partial<ExtensionSettings> | undefined;
  if (!stored) return { ...DEFAULT_SETTINGS };
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    queueLimit: clampQueueLimit(stored.queueLimit ?? DEFAULT_SETTINGS.queueLimit),
  };
}

export async function saveSettings(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await loadSettings();
  const next: ExtensionSettings = {
    ...current,
    ...partial,
  };
  if (partial.queueLimit !== undefined) {
    next.queueLimit = clampQueueLimit(partial.queueLimit);
  }
  await browser.storage.sync.set({ [SETTINGS_STORAGE_KEY]: next });
  return next;
}

function clampQueueLimit(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_QUEUE_LIMIT;
  return Math.min(2000, Math.max(1, Math.floor(value)));
}
