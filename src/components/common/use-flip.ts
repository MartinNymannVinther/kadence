"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

/** How long a row takes to glide to its new place. */
export const FLIP_MS = 320;

/**
 * Rows that glide to their new places instead of jumping (First, Last,
 * Invert, Play). `capture()` is called just before the order changes; on
 * the next layout every row that moved is put back where it was with a
 * transform and let go, so the eye can follow the list reorder itself.
 * Reduced motion skips the glide; the landing mark still says where the
 * row went.
 */
export function useFlip<T>(deps: T) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const before = useRef<Map<string, number> | null>(null);

  const ref = useCallback(
    (id: string) => (node: HTMLElement | null) => {
      if (node) nodes.current.set(id, node);
      else nodes.current.delete(id);
    },
    [],
  );

  const capture = useCallback(() => {
    before.current = new Map(
      [...nodes.current].map(([id, node]) => [id, node.getBoundingClientRect().top]),
    );
  }, []);

  useLayoutEffect(() => {
    const first = before.current;
    before.current = null;
    if (!first) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const [id, node] of nodes.current) {
      const top = first.get(id);
      if (top === undefined) continue;
      const dy = top - node.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) continue;
      node.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], {
        duration: FLIP_MS,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      });
    }
  }, [deps]);

  return { ref, capture };
}
