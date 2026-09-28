/**
 * The arithmetic under zooming into a stretch of a chart: a span of
 * inclusive sample indices, or null for the whole ride, and how one is
 * made from two moments, halved, doubled, slid and thinned to what is
 * drawn. Pure and free of the DOM, so every mapping is tested alone —
 * the hover, the route dot and the pause marks all rest on it.
 */

/** Inclusive sample indices; null in the callers means the whole ride. */
export type Span = { readonly lo: number; readonly hi: number };

/** 60 s of 5-second samples: the narrowest window. */
export const MIN_SPAN_SAMPLES = 12;
/** A shorter press is a click, not a selection. */
export const MIN_DRAG_PX = 12;

export function isWhole(span: Span | null, count: number): boolean {
  return span === null || (span.lo <= 0 && span.hi >= count - 1);
}

/**
 * Orders lo ≤ hi, widens to MIN_SPAN_SAMPLES around the centre, slides
 * to stay inside [0, count−1]; null when it covers the ride.
 */
export function clampSpan(span: Span, count: number): Span | null {
  if (count <= MIN_SPAN_SAMPLES) return null;
  let lo = Math.min(span.lo, span.hi);
  let hi = Math.max(span.lo, span.hi);
  if (hi - lo + 1 < MIN_SPAN_SAMPLES) {
    lo = Math.round((lo + hi) / 2 - (MIN_SPAN_SAMPLES - 1) / 2);
    hi = lo + MIN_SPAN_SAMPLES - 1;
  }
  if (lo < 0) {
    hi -= lo;
    lo = 0;
  }
  if (hi > count - 1) {
    lo -= hi - (count - 1);
    hi = count - 1;
  }
  lo = Math.max(0, lo);
  return isWhole({ lo, hi }, count) ? null : { lo, hi };
}

/** First i with t[i] ≥ seconds; t.length if none. */
export function lowerBound(t: readonly number[], seconds: number): number {
  let lo = 0;
  let hi = t.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (t[mid]! < seconds) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Last i with t[i] ≤ seconds; −1 if none. */
export function upperBound(t: readonly number[], seconds: number): number {
  let lo = 0;
  let hi = t.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (t[mid]! <= seconds) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}

/** Two moments, in any order, to the samples between them; a drag between two samples takes both neighbours. */
export function spanFromSeconds(t: readonly number[], a: number, b: number): Span | null {
  const count = t.length;
  const lo = Math.max(0, upperBound(t, Math.min(a, b)));
  const hi = Math.min(count - 1, lowerBound(t, Math.max(a, b)));
  return clampSpan({ lo, hi }, count);
}

/**
 * Halves (0.5) or doubles (2) the span around `anchor`, a sample index
 * that keeps its fraction of the window; the centre when none is given.
 * Null once it would cover the whole ride.
 */
export function zoomSpan(
  span: Span | null,
  count: number,
  factor: number,
  anchor?: number,
): Span | null {
  const lo = span?.lo ?? 0;
  const hi = span?.hi ?? count - 1;
  const width = hi - lo;
  const a = anchor ?? (lo + hi) / 2;
  const fraction = width > 0 ? Math.min(1, Math.max(0, (a - lo) / width)) : 0.5;
  const next = Math.round(width * factor);
  const nextLo = Math.round(a - fraction * next);
  return clampSpan({ lo: nextLo, hi: nextLo + next }, count);
}

/** Moves by half its width, clamped at 0 / count−1 without changing width. */
export function shiftSpan(span: Span, count: number, direction: -1 | 1): Span {
  const width = span.hi - span.lo;
  const delta = direction * Math.max(1, Math.round(width / 2));
  let lo = span.lo + delta;
  let hi = span.hi + delta;
  if (lo < 0) {
    hi -= lo;
    lo = 0;
  }
  if (hi > count - 1) {
    lo -= hi - (count - 1);
    hi = count - 1;
  }
  return { lo: Math.max(0, lo), hi };
}

export function canShift(span: Span | null, count: number, direction: -1 | 1): boolean {
  if (span === null) return false;
  return direction < 0 ? span.lo > 0 : span.hi < count - 1;
}

/**
 * lo, lo+step, … ≤ hi (0…count−1 when null), with step the smallest that
 * keeps at most `max` points. The whole ride gives today's `i % step`
 * picks, so an unzoomed chart draws the same points as before.
 */
export function thinIndices(
  count: number,
  span: Span | null,
  max: number,
): { index: number[]; step: number } {
  const lo = span?.lo ?? 0;
  const hi = span?.hi ?? count - 1;
  const step = Math.max(1, Math.ceil((hi - lo + 1) / max));
  const index: number[] = [];
  for (let i = lo; i <= hi; i += step) index.push(i);
  return { index, step };
}

/** Position k in `index` whose t[index[k]] is nearest `seconds`; a tie goes to the earlier. */
export function nearestDrawn(
  index: readonly number[],
  t: readonly number[],
  seconds: number,
): number {
  if (index.length === 0) return 0;
  let lo = 0;
  let hi = index.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (t[index[mid]!]! < seconds) lo = mid + 1;
    else hi = mid;
  }
  if (lo === 0) return 0;
  if (lo === index.length) return index.length - 1;
  const before = Math.abs(t[index[lo - 1]!]! - seconds);
  const after = Math.abs(t[index[lo]!]! - seconds);
  return before <= after ? lo - 1 : lo;
}

/** The clock's own steps, from five seconds to three hours. */
const LADDER = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1200, 1800, 3600, 7200, 10800];

/** Tick seconds inside [from, to]: the smallest clock step giving at most `count` of them. */
export function timeTicks(from: number, to: number, count: number): number[] {
  const multiples = (step: number) => Math.floor(to / step) - Math.ceil(from / step) + 1;
  let step = LADDER.find((s) => multiples(s) <= Math.max(1, count)) ?? LADDER.at(-1)!;
  while (multiples(step) > Math.max(1, count)) step *= 2;
  const ticks: number[] = [];
  for (let s = Math.ceil(from / step) * step; s <= to; s += step) ticks.push(s);
  return ticks;
}
