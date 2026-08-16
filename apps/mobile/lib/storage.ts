import { Platform } from 'react-native';

/**
 * Key-value storage, one port with two adapters.
 *
 * `react-native-mmkv` is a native module and does not exist on web, so
 * importing it unconditionally breaks the browser build. Metro resolves both
 * branches at bundle time, so the require must stay inside the platform check.
 *
 * The domain package never sees any of this — it takes data as arguments (§2).
 */

export interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

const memory = new Map<string, string>();

const memoryStore: KeyValueStore = {
  getString: (key) => memory.get(key),
  set: (key, value) => void memory.set(key, value),
  delete: (key) => void memory.delete(key),
};

const webStore: KeyValueStore = {
  getString: (key) => {
    try {
      return globalThis.localStorage?.getItem(key) ?? undefined;
    } catch {
      return memoryStore.getString(key);
    }
  },
  set: (key, value) => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      memoryStore.set(key, value);
    }
  },
  delete: (key) => {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      memoryStore.delete(key);
    }
  },
};

const nativeStore = (): KeyValueStore => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- must not be hoisted onto web
  const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
  // v4 is a factory returning a Nitro-backed instance; `MMKV` is a type only,
  // and the removal method is `remove`, not `delete`.
  const mmkv = createMMKV({ id: 'cricket.v1' });
  return {
    getString: (key) => mmkv.getString(key) ?? undefined,
    set: (key, value) => mmkv.set(key, value),
    delete: (key) => void mmkv.remove(key),
  };
};

let cached: KeyValueStore | null = null;

export const storage = (): KeyValueStore => {
  if (cached) return cached;
  if (Platform.OS === 'web') {
    cached = webStore;
  } else {
    try {
      cached = nativeStore();
    } catch {
      // A dev client without the native module linked — degrade rather than crash.
      cached = memoryStore;
    }
  }
  return cached;
};
