"use client";

import { useEffect, useRef } from "react";

/**
 * The ride's keys (ADR 0033), for a rider who reaches a keyboard on the
 * handlebars rather than the screen: each key, by its name in lower case
 * (`" "`, `"arrowup"`, `"m"`), to what it does. Nothing while `active` is
 * false — a dialog open, the ride not started — nor with a modifier held
 * or focus in a field. Space pauses wherever focus is, so it never presses
 * a focused button instead.
 */
export type RideKeys = Partial<Record<string, () => void>>;

export function useRideKeys(active: boolean, keys: RideKeys): void {
  const latest = useRef({ active, keys });

  useEffect(() => {
    latest.current = { active, keys };
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const { active: on, keys: now } = latest.current;
      if (!on || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const act = now[event.key.toLowerCase()];
      if (!act) return;
      if (event.key === " ") event.preventDefault();
      act();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
