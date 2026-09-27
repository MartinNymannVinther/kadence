"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * What just moved, marked where it now stands for about a second (the
 * family's `.landed` mark, taken from Tavle). The mark is set by the move
 * rather than by the gesture: a row moved by an arrow or a typed place
 * lands exactly as visibly as one that was dragged.
 */

/**
 * How long the mark stands. The stylesheet's `.landed` animation runs
 * exactly this long — tests/meta/landed.test.ts holds the two together.
 */
export const LANDED_MS = 1100;

export function useLanded() {
  const [landed, setLanded] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const mark = useCallback((id: string) => {
    // A second move takes the mark over rather than queueing behind it.
    clearTimeout(timer.current);
    setLanded(id);
    timer.current = setTimeout(() => setLanded(null), LANDED_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { landed, mark };
}
