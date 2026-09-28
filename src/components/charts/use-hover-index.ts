"use client";

import { useRef, useState } from "react";

type Pointer = React.PointerEvent<SVGSVGElement>;

/**
 * Which point of a chart is being read: the one under the pointer, or the
 * one the arrow keys have moved to while the chart has focus — the same
 * readout either way, so nobody needs a mouse to read a value.
 *
 * With `pinTouch` a finger's reading outlives the finger: a tap reads the
 * nearest point and the lift-off leaves it there, through the
 * `pointerleave` that follows on touch and through the blur when a button
 * is tapped next. A mouse move or the next tap replaces it; a gesture the
 * browser takes for a scroll (`pointercancel`) reads nothing. Off by
 * default, so the other charts clear on leave and blur as they always
 * have.
 */
export function useHoverIndex(
  count: number,
  xOf: (index: number) => number,
  { pinTouch = false }: { pinTouch?: boolean } = {},
) {
  const [index, setIndex] = useState<number | null>(null);
  const pinned = useRef(false);

  const localX = (event: Pointer) =>
    event.clientX - event.currentTarget.getBoundingClientRect().left;

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
    onPointerDown: (event: Pointer) => {
      if (!pinTouch) return;
      pinned.current = false;
      setIndex(nearest(localX(event)));
    },
    onPointerMove: (event: Pointer) => {
      if (pinTouch && event.pointerType !== "touch") pinned.current = false;
      setIndex(nearest(localX(event)));
    },
    onPointerUp: (event: Pointer) => {
      if (pinTouch && event.pointerType === "touch") pinned.current = true;
    },
    onPointerCancel: (event: Pointer) => {
      if (!pinTouch || event.pointerType !== "touch") return;
      pinned.current = false;
      setIndex(null);
    },
    onPointerLeave: () => {
      if (!pinned.current) setIndex(null);
    },
    onBlur: () => {
      if (!pinned.current) setIndex(null);
    },
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
      // A keyboard reading outlives a Tab to the chart's own buttons, as a finger's does.
      if (pinTouch) pinned.current = true;
      setIndex((current) => move(current ?? count - 1));
    },
  };

  return { index, handlers, set: setIndex };
}
