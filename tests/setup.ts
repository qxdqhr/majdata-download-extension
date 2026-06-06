import { beforeEach, vi } from 'vitest';

const localStore: Record<string, unknown> = {};
const sessionStore: Record<string, unknown> = {};

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
      session: {
        get: async (keys: string | string[] | Record<string, unknown>) => {
          if (typeof keys === 'string') {
            return { [keys]: sessionStore[keys] };
          }
          if (Array.isArray(keys)) {
            const result: Record<string, unknown> = {};
            for (const key of keys) {
              result[key] = sessionStore[key];
            }
            return result;
          }
          return { ...sessionStore };
        },
        set: async (items: Record<string, unknown>) => {
          Object.assign(sessionStore, items);
        },
        remove: async (keys: string | string[]) => {
          const list = Array.isArray(keys) ? keys : [keys];
          for (const key of list) delete sessionStore[key];
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
    downloads: {
      download: async () => 1,
      search: async () => [],
      onChanged: {
        addListener: () => undefined,
        removeListener: () => undefined,
      },
    },
    notifications: {
      create: async () => 'notification-id',
    },
    cookies: {
      getAll: async () => [],
    },
    windows: {
      create: async () => ({ id: 1 }),
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
      sendNativeMessage: async () => ({ ok: true, running: false }),
      openOptionsPage: () => undefined,
      getURL: (path: string) => `chrome-extension://test/${path.replace(/^\//, '')}`,
    },
  },
}));

beforeEach(() => {
  for (const key of Object.keys(localStore)) {
    delete localStore[key];
  }
  for (const key of Object.keys(sessionStore)) {
    delete sessionStore[key];
  }
});
