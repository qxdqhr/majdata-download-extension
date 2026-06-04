import { browser } from 'wxt/browser';
import { DEFAULT_QUEUE_LIMIT, STORAGE_KEY } from './constants';
import type { QueueItem, QueueState, SongContext } from './types';

function emptyState(): QueueState {
  return { version: 1, items: [] };
}

export async function loadQueueState(): Promise<QueueState> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const state = result[STORAGE_KEY] as QueueState | undefined;
  if (!state || state.version !== 1 || !Array.isArray(state.items)) {
    return emptyState();
  }
  return state;
}

async function saveQueueState(state: QueueState): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: state });
}

export async function listQueueItems(): Promise<QueueItem[]> {
  const state = await loadQueueState();
  return [...state.items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getQueueCount(): Promise<number> {
  const state = await loadQueueState();
  return state.items.length;
}

export async function addToQueue(
  payload: SongContext,
  limit: number = DEFAULT_QUEUE_LIMIT,
): Promise<{ duplicate: boolean; count: number }> {
  const state = await loadQueueState();
  const now = new Date().toISOString();
  const index = state.items.findIndex((item) => item.songId === payload.songId);

  if (index >= 0) {
    state.items[index] = {
      ...state.items[index],
      ...payload,
      updatedAt: now,
    };
    await saveQueueState(state);
    return { duplicate: true, count: state.items.length };
  }

  if (state.items.length >= limit) {
    throw new Error(`下载列表已达上限（${limit} 条），请先清理后再添加`);
  }

  state.items.push({
    ...payload,
    addedAt: now,
    updatedAt: now,
  });
  await saveQueueState(state);
  return { duplicate: false, count: state.items.length };
}

export async function removeFromQueue(songIds: string[]): Promise<number> {
  const state = await loadQueueState();
  const idSet = new Set(songIds);
  state.items = state.items.filter((item) => !idSet.has(item.songId));
  await saveQueueState(state);
  return state.items.length;
}

export async function clearQueue(): Promise<void> {
  await saveQueueState(emptyState());
}

export async function getQueueItemsByIds(songIds: string[]): Promise<QueueItem[]> {
  const idSet = new Set(songIds);
  const items = await listQueueItems();
  return items.filter((item) => idSet.has(item.songId));
}
