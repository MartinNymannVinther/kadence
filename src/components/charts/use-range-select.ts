"use client";

import { useCallback, useRef, useState } from "react";
import {
  doubleClickResets,
  INITIAL_SELECT,
  reduceSelect,
  type PointerKind,
  type SelectEvent,
  type SelectState,
} from "./range-select";

type Pointer = React.PointerEvent<SVGSVGElement>;

/**
 * The DOM's side of selecting a stretch: pointer events into the reducer
 * in `range-select.ts`, pointer capture while a press is held, and the
 * callbacks when a stretch is complete or a double-click asks for the
 * whole ride. Nothing here calls `preventDefault` on a pointer event and
 * nothing touches `touch-action`: under `touch-pan-y` a vertical or a
 * two-finger gesture is the browser's, `pointercancel` arrives, the band
 * is dropped and a start set by a tap survives.
 */
export function useRangeSelect({
  armed,
  onSelect,
  onReset,
}: {
  /** A finger takes part only while true; a mouse or a pen always does. */
  armed: boolean;
  /** SVG px, unordered: a drag of at least MIN_DRAG_PX, or two taps. */
  onSelect: (x0: number, x1: number) => void;
  /** A mouse's or a pen's double-click, as `doubleClickResets` allows it; never a finger's. */
  onReset: () => void;
}) {
  // The reducer's state lives in a ref, so two events in one frame see
  // each other; the mirror in state is what renders.
  const state = useRef<SelectState>(INITIAL_SELECT);
  const [view, setView] = useState<SelectState>(INITIAL_SELECT);
  const element = useRef<SVGSVGElement | null>(null);
  const lastSelect = useRef(0);
  // A `dblclick` does not say which pointer made it; the press before it does.
  const lastPointer = useRef<PointerKind | null>(null);

  const localX = (event: Pointer) =>
    event.clientX - event.currentTarget.getBoundingClientRect().left;

  function dispatch(event: SelectEvent) {
    const result = reduceSelect(state.current, event, armed);
    state.current = result.state;
    setView(result.state);
    if (result.select) {
      lastSelect.current = Date.now();
      onSelect(result.select[0], result.select[1]);
    }
  }

  /** Drops a press, a band and a set start. Stable, so an effect can depend on it. */
  const clear = useCallback(() => {
    const held = state.current.press;
    if (held && element.current?.hasPointerCapture(held.id)) {
      element.current.releasePointerCapture(held.id);
    }
    state.current = reduceSelect(state.current, { kind: "clear" }, false).state;
    setView(state.current);
  }, []);

  /** Enter on the read point: a tap at that px, in or out of the mode. */
  const tap = (x: number) => dispatch({ kind: "tap", x });

  const handlers = {
    onPointerDown: (event: Pointer) => {
      lastPointer.current = event.pointerType as PointerKind;
      const before = state.current.press;
      dispatch({
        kind: "down",
        id: event.pointerId,
        type: event.pointerType as PointerKind,
        isPrimary: event.isPrimary,
        button: event.button,
        x: localX(event),
      });
      if (state.current.press && state.current.press !== before) {
        element.current = event.currentTarget;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    onPointerMove: (event: Pointer) =>
      dispatch({ kind: "move", id: event.pointerId, x: localX(event) }),
    onPointerUp: (event: Pointer) =>
      dispatch({ kind: "up", id: event.pointerId, x: localX(event) }),
    onPointerCancel: (event: Pointer) => dispatch({ kind: "cancel", id: event.pointerId }),
    onLostPointerCapture: (event: Pointer) => dispatch({ kind: "cancel", id: event.pointerId }),
    onDoubleClick: () => {
      if (doubleClickResets(lastPointer.current, armed, Date.now() - lastSelect.current)) {
        onReset();
      }
    },
    onContextMenu: (event: React.MouseEvent<SVGSVGElement>) => {
      // Android's long-press menu while a finger is held on the chart.
      if (state.current.press?.type === "touch") event.preventDefault();
    },
  };

  return {
    band: view.band,
    edge: view.edge,
    /** A press is held: the reading stays where it was pressed. */
    active: view.press !== null,
    clear,
    tap,
    handlers,
  };
}
