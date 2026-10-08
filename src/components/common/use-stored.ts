"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * One string kept in this browser under `key`, read like state: undefined
 * on the server and until the page is hydrated (nobody knows yet), null
 * when nothing is kept. Writing it tells every reader on the page at
 * once, and another tab through the storage event. A browser that keeps
 * nothing simply forgets.
 */

const CHANGED = "kadence:stored";

function subscribe(listener: () => void): () => void {
  window.addEventListener(CHANGED, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function useStored(
  key: string,
): [string | null | undefined, (value: string | null) => void] {
  const value = useSyncExternalStore<string | null | undefined>(
    subscribe,
    () => read(key),
    () => undefined,
  );
  const write = useCallback(
    (next: string | null) => {
      try {
        if (next === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, next);
      } catch {
        // Not kept: the page shows it as it was.
      }
      window.dispatchEvent(new Event(CHANGED));
    },
    [key],
  );
  return [value, write];
}
