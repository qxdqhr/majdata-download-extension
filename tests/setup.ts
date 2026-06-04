import { beforeEach, vi } from 'vitest';

const localStore: Record<string, unknown> = {};

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: async (keys: string | string[] | Record<string, unknown>) => {
          if (typeof keys === 'string') {
            return { [keys]: localStore[keys] };
          }
          if (Array.isArray(keys)) {
            const result: Record<string, unknown> = {};
            for (const key of keys) {
              result[key] = localStore[key];
            }
            return result;
          }
          return { ...localStore };
        },
        set: async (items: Record<string, unknown>) => {
          Object.assign(localStore, items);
        },
      },
      sync: {
        get: async () => ({}),
        set: async () => undefined,
        onChanged: {
          addListener: () => undefined,
        },
      },
    },
    action: {
      setBadgeBackgroundColor: async () => undefined,
      setBadgeText: async () => undefined,
    },
    runtime: {
      onMessage: {
        addListener: () => undefined,
      },
      sendMessage: async () => undefined,
      openOptionsPage: () => undefined,
    },
  },
}));

beforeEach(() => {
  for (const key of Object.keys(localStore)) {
    delete localStore[key];
  }
});
