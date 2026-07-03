// React binding for the local-first store. `useStored(key, fallback)` reads a value and re-renders
// the component whenever that key changes — from this screen or anywhere else in the app.
import { useCallback, useRef, useSyncExternalStore } from 'react';
import { get, set, subscribe } from './store';

export function useStored<T>(key: string, fallback: T): [T, (v: T | ((cur: T) => T)) => void] {
  // Keep the FIRST fallback stable so getSnapshot returns a consistent reference before the key
  // exists (React requires a cached snapshot).
  const fbRef = useRef(fallback);
  const sub = useCallback((cb: () => void) => subscribe(key, cb), [key]);
  const snap = useCallback(() => get(key, fbRef.current), [key]);
  const value = useSyncExternalStore(sub, snap, snap);
  const setValue = useCallback(
    (v: T | ((cur: T) => T)) => {
      const next = typeof v === 'function' ? (v as (cur: T) => T)(get(key, fbRef.current)) : v;
      set(key, next);
    },
    [key],
  );
  return [value, setValue];
}
