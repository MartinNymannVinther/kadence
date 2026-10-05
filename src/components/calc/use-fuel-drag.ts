"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FuelItemId } from "@/modules/calc/fuel-items";

/** Where a thing is picked up: the pantry, or a place in one of the hours. */
export type DragFrom = { lane: number; index: number } | null;
/** Where it is let go: an hour, the pantry (to put it back), or nowhere. */
export type DropAt = { lane: number } | "pantry" | null;
export type Drag = { item: FuelItemId; from: DragFrom; x: number; y: number; over: DropAt };

/** A mouse drags as soon as it moves a little. */
const MOUSE_SLOP_PX = 5;
/** A finger first holds still for a moment, so a swipe still scrolls the page. */
const HOLD_MS = 200;
const FINGER_SLOP_PX = 8;
/** Near the top or bottom of the screen the page scrolls along with the drag. */
const EDGE_PX = 64;

function dropAt(x: number, y: number): DropAt {
  const element = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-fuel-drop]");
  const value = element?.dataset.fuelDrop;
  if (value === undefined) return null;
  return value === "pantry" ? "pantry" : { lane: Number(value) };
}

/**
 * Dragging the pantry's things into the hours with pointer events, so it
 * works with a mouse, a pen and a finger without a library. Drop places
 * are marked `data-fuel-drop` ("pantry" or the hour's index), and the
 * thing follows the pointer as a ghost. A press that never becomes a drag
 * stays a click, which the caller handles as the keyboard does — choose
 * a thing, then an hour — so nothing here is the only way in.
 */
export function useFuelDrag(onDrop: (item: FuelItemId, from: DragFrom, at: DropAt) => void) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const dropRef = useRef(onDrop);
  const endRef = useRef<(() => void) | null>(null);
  /** Set once a press has become a drag, so the click that follows it is ignored. */
  const dragged = useRef(false);

  useEffect(() => {
    dropRef.current = onDrop;
  }, [onDrop]);
  useEffect(() => () => endRef.current?.(), []);

  const start = useCallback(
    (item: FuelItemId, from: DragFrom) => (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      endRef.current?.();
      dragged.current = false;
      const finger = event.pointerType !== "mouse";
      const startX = event.clientX;
      const startY = event.clientY;
      let x = startX;
      let y = startY;
      let active = false;
      let frame = 0;

      const follow = () => {
        if (!active) return;
        const height = window.innerHeight;
        const dy =
          y < EDGE_PX ? -(EDGE_PX - y) / 5 : y > height - EDGE_PX ? (y - height + EDGE_PX) / 5 : 0;
        if (dy !== 0) {
          window.scrollBy(0, dy);
          setDrag((d) => d && { ...d, over: dropAt(x, y) });
        }
        frame = requestAnimationFrame(follow);
      };
      const begin = () => {
        active = true;
        dragged.current = true;
        setDrag({ item, from, x, y, over: dropAt(x, y) });
        frame = requestAnimationFrame(follow);
      };
      const hold = finger ? window.setTimeout(begin, HOLD_MS) : 0;

      const move = (e: PointerEvent) => {
        x = e.clientX;
        y = e.clientY;
        if (!active) {
          const moved = Math.hypot(x - startX, y - startY);
          if (finger && moved > FINGER_SLOP_PX) end();
          else if (!finger && moved > MOUSE_SLOP_PX) begin();
          return;
        }
        setDrag((d) => d && { ...d, x, y, over: dropAt(x, y) });
      };
      /** Once a finger drags, the page must not scroll under it. */
      const touchMove = (e: TouchEvent) => {
        if (active && e.cancelable) e.preventDefault();
      };
      const up = () => {
        if (active) {
          dropRef.current(item, from, dropAt(x, y));
          // The click that follows this pointerup comes before the timer, and is ignored; a later one is not.
          window.setTimeout(() => {
            dragged.current = false;
          }, 0);
        }
        end();
      };
      const key = (e: KeyboardEvent) => {
        if (e.key === "Escape") end();
      };
      const end = () => {
        window.clearTimeout(hold);
        cancelAnimationFrame(frame);
        active = false;
        setDrag(null);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", end);
        window.removeEventListener("touchmove", touchMove);
        window.removeEventListener("keydown", key);
        endRef.current = null;
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", end);
      window.addEventListener("touchmove", touchMove, { passive: false });
      window.addEventListener("keydown", key);
      endRef.current = end;
    },
    [],
  );

  /** True once for the click that ends a drag, which is then not a choice. */
  const wasDrag = useCallback(() => {
    const was = dragged.current;
    dragged.current = false;
    return was;
  }, []);

  return { drag, start, wasDrag };
}
