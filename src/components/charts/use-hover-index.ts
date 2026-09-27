"use client";

import { useState } from "react";

/**
 * Which point of a chart is being read: the one under the pointer, or the
 * one the arrow keys have moved to while the chart has focus — the same
 * readout either way, so nobody needs a mouse to read a value.
 */
export function useHoverIndex(count: number, xOf: (index: number) => number) {
  const [index, setIndex] = useState<number | null>(null);

  function nearest(x: number): number {
    let best = 0;
    let distance = Infinity;
    for (let i = 0; i < count; i++) {
      const d = Math.abs(xOf(i) - x);
      if (d < distance) {
        distance = d;
        best = i;
      }
    }
    return best;
  }

  const handlers = {
    tabIndex: 0,
    onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => {
      const box = event.currentTarget.getBoundingClientRect();
      setIndex(nearest(event.clientX - box.left));
    },
    onPointerLeave: () => setIndex(null),
    onBlur: () => setIndex(null),
    onFocus: () => setIndex((current) => current ?? count - 1),
    onKeyDown: (event: React.KeyboardEvent<SVGSVGElement>) => {
      if (count === 0) return;
      const moves: Record<string, (i: number) => number> = {
        ArrowLeft: (i) => Math.max(0, i - 1),
        ArrowRight: (i) => Math.min(count - 1, i + 1),
        Home: () => 0,
        End: () => count - 1,
      };
      const move = moves[event.key];
      if (!move) return;
      event.preventDefault();
      setIndex((current) => move(current ?? count - 1));
    },
  };

  return { index, handlers };
}
