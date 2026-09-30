"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * What a rider chooses to have on the ride screen, remembered on this
 * device either way: the little map (ADR 0035), shown until it is hidden,
 * and the speed, hidden until it is asked for.
 */

type Choice = { key: string; byDefault: boolean };

const MAP: Choice = { key: "kadence.rulle.map", byDefault: true };
const SPEED: Choice = { key: "kadence.rulle.speed", byDefault: false };
const CHANGED = "kadence:rulle-shown";

function subscribe(listener: () => void): () => void {
  window.addEventListener(CHANGED, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener("storage", listener);
  };
}

function shown({ key, byDefault }: Choice): boolean {
  try {
    const kept = window.localStorage.getItem(key);
    return kept === null ? byDefault : kept === "on";
  } catch {
    return byDefault;
  }
}

function useShown(choice: Choice): [boolean, () => void] {
  const on = useSyncExternalStore(
    subscribe,
    () => shown(choice),
    () => choice.byDefault,
  );
  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(choice.key, shown(choice) ? "off" : "on");
    } catch {
      // Not remembered: it stays as it is.
    }
    window.dispatchEvent(new Event(CHANGED));
  }, [choice]);
  return [on, toggle];
}

export const useMapShown = () => useShown(MAP);
export const useSpeedShown = () => useShown(SPEED);
