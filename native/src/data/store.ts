// Local-first data layer — the native counterpart to the PWA's localStorage `ls()/save()`.
// Reads are SYNCHRONOUS (from an in-memory cache) so the getLifeState brain and screens read
// without await, exactly like the web app. Writes update the cache immediately and persist to
// AsyncStorage in the background (web, iOS, Android). Subscribers are notified so React re-renders.
//
// This is the foundation; a durable Supabase outbox (offline writes that sync when back online)
// layers on top later without changing this surface.
import AsyncStorage from '@react-native-async-storage/async-storage';

// Namespace so we never collide with Supabase's own AsyncStorage session keys.
const PREFIX = 'tt:';

const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();
let hydrated = false;

function notify(key: string) {
  listeners.get(key)?.forEach((l) => l());
  listeners.get('*')?.forEach((l) => l()); // '*' = any-change subscribers (e.g. the brain)
}

/** Load every persisted key into the cache once, at boot, before first render. */
export async function hydrateStore(): Promise<void> {
  if (hydrated) return;
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    if (keys.length) {
      const pairs = await AsyncStorage.multiGet(keys);
      for (const [k, v] of pairs) {
        if (v == null) continue;
        try {
          cache.set(k.slice(PREFIX.length), JSON.parse(v));
        } catch {
          /* skip a corrupt value rather than crash the boot */
        }
      }
    }
  } catch {
    /* first run / storage unavailable — start empty */
  }
  hydrated = true;
}

export function isHydrated() {
  return hydrated;
}

/** Synchronous read. Returns `fallback` if the key was never set. */
export function get<T>(key: string, fallback: T): T {
  return cache.has(key) ? (cache.get(key) as T) : fallback;
}

/** Write. Cache updates now (sync); disk persists in the background. */
export function set<T>(key: string, value: T): void {
  cache.set(key, value);
  notify(key);
  AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)).catch(() => {
    /* best-effort; the cache already holds the truth for this session */
  });
}

/** Read-modify-write in one shot. */
export function update<T>(key: string, fallback: T, fn: (cur: T) => T): T {
  const next = fn(get(key, fallback));
  set(key, next);
  return next;
}

export function remove(key: string): void {
  cache.delete(key);
  notify(key);
  AsyncStorage.removeItem(PREFIX + key).catch(() => {});
}

/** Subscribe to a key ('*' for any change). Returns an unsubscribe fn. */
export function subscribe(key: string, cb: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
  };
}
