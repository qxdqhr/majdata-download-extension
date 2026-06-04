import type { ExtensionSettings } from './settings';

export interface AssetUrls {
  track: string;
  chart: string;
  image: string;
  video: string;
}

export interface SongContext {
  songId: string;
  title: string;
  artist?: string;
  pageUrl: string;
  assets: AssetUrls;
}

export interface QueueItem extends SongContext {
  addedAt: string;
  updatedAt: string;
}

export interface QueueState {
  version: 1;
  items: QueueItem[];
}

export type ConfirmChoice = 'direct' | 'queue' | 'cancel';

export type BackgroundMessage =
  | { type: 'QUEUE_ADD'; payload: SongContext }
  | { type: 'QUEUE_LIST' }
  | { type: 'QUEUE_REMOVE'; payload: { songIds: string[] } }
  | { type: 'QUEUE_CLEAR' }
  | { type: 'QUEUE_EXPORT'; payload: { songIds: string[] } }
  | { type: 'QUEUE_IMPORT'; payload: { content: string; filename?: string } }
  | { type: 'QUEUE_COUNT' }
  | { type: 'SETTINGS_GET' };

export interface ImportQueueResult {
  imported: number;
  updated: number;
  skipped: number;
  count: number;
}

export type BackgroundResponse =
  | { ok: true; duplicate?: boolean; count?: number }
  | { ok: true; items: QueueItem[] }
  | { ok: true; filename: string; content: string; mimeType?: string }
  | { ok: true; imported: number; updated: number; skipped: number; count: number }
  | { ok: true; settings: ExtensionSettings }
  | { ok: false; error: string };

export interface ParsedExportRow {
  songId: string;
  title: string;
  pageUrl: string;
  assets: AssetUrls;
}
