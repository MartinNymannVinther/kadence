"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the little map is shown on the ride screen (ADR 0035): shown
 * until a rider hides it, and remembered on this device either way.
 */

const KEY = "kadence.rulle.map";
const CHANGED = "kadence:rulle-map";

function subscribe(listener: () => void): () => void {
  window.addEventListener(CHANGED, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener("storage", listener);
  };
}

function shown(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function useMapShown(): [boolean, () => void] {
  const on = useSyncExternalStore(subscribe, shown, () => true);
  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(KEY, shown() ? "off" : "on");
    } catch {
      // Not remembered: the map stays as it is.
    }
    window.dispatchEvent(new Event(CHANGED));
  }, []);
  return [on, toggle];
}
