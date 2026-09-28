"use client";

import { useMemo, useState } from "react";
import {
  canShift,
  MIN_SPAN_SAMPLES,
  nearestDrawn,
  shiftSpan,
  thinIndices,
  zoomSpan,
  type Span,
} from "@/components/charts/zoom";
import { MAX_POINTS, spanOn, thin, type SpanOn, type Streams } from "./streams-data";

/**
 * The window on the ride's curves: a span of sample indices into
 * `streams`, null for the whole ride, and the drawn points it thins to.
 * Kept with the streams' clock — their samples, not the object, since a
 * server round trip hands the chart the same samples again — so a new
 * clock, pauses hidden or shown, shows the whole ride, and the window is
 * forgotten there, so it cannot come back when the old clock does. Knows
 * nothing of the hover: after a change the chart asks `nearest` where its
 * reading goes on, so the readout and the route's dot keep their moment
 * rather than a screen position.
 */
export function useStreamsZoom(streams: Streams) {
  const [stored, setStored] = useState<SpanOn>({ streams, span: null });
  // Forgotten before this render is shown, so nothing flashes on the new
  // clock; memoised, so the clocks are compared once per object, not per render.
  const kept = useMemo(() => spanOn(stored, streams), [stored, streams]);
  if (kept !== stored) setStored(kept);
  const span = kept.span;
  const count = streams.t.length;
  const data = useMemo(() => thin(streams, span), [streams, span]);
  const canIn = (span ? span.hi - span.lo : count - 1) > MIN_SPAN_SAMPLES - 1;
  const canOut = span !== null;

  /**
   * The window a key asks for — `+`/`=` in and `-` out around `anchor`,
   * Shift + arrows a slide by half a window, Escape the whole ride — or
   * undefined when the key is not the zoom's or there is nowhere to go.
   */
  function keyMove(
    e: { key: string; shiftKey: boolean },
    anchor?: number,
  ): Span | null | undefined {
    if (e.key === "+" || e.key === "=")
      return canIn ? zoomSpan(span, count, 0.5, anchor) : undefined;
    if (e.key === "-") return canOut ? zoomSpan(span, count, 2, anchor) : undefined;
    if (span && e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      return shiftSpan(span, count, e.key === "ArrowLeft" ? -1 : 1);
    }
    if (span && e.key === "Escape") return null;
    return undefined;
  }

  return {
    span,
    count,
    data,
    /** The clock's token: one object per clock, however often the page refreshes. */
    clock: kept.streams,
    /** A ride under a minute has nothing to zoom into. */
    zoomable: count > MIN_SPAN_SAMPLES,
    canIn,
    canOut,
    canEarlier: canShift(span, count, -1),
    canLater: canShift(span, count, 1),
    // The owner stays the clock's first object, so the token holds.
    setSpan: (next: Span | null) => setStored((s) => ({ streams: s.streams, span: next })),
    /** The drawn position in `next` nearest `seconds`: where a reading goes on. */
    nearest: (next: Span | null, seconds: number) =>
      nearestDrawn(thinIndices(count, next, MAX_POINTS).index, streams.t, seconds),
    /** Halved around `anchor`, a sample index that keeps its place; the centre when none. */
    zoomedIn: (anchor?: number) => zoomSpan(span, count, 0.5, anchor),
    zoomedOut: (anchor?: number) => zoomSpan(span, count, 2, anchor),
    /** Slid by half a window; the whole ride stays where it is. */
    shifted: (direction: -1 | 1) => (span ? shiftSpan(span, count, direction) : null),
    keyMove,
  };
}
