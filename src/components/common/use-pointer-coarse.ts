"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";

const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
};
const snapshot = () => window.matchMedia(QUERY).matches;
const serverSnapshot = () => false;

/**
 * Whether the primary pointer is a finger — the question Tailwind's
 * `pointer-coarse:` variant asks — for words chosen in code rather than
 * in CSS. False on the server and until hydration, so a phone's first
 * paint carries the mouse's words for a moment; a laptop with a
 * touchscreen keeps the mouse's words, as the variant does.
 */
export function usePointerCoarse(): boolean {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
