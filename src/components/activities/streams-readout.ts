/**
 * The line above the curves, in order of what matters most right now: a
 * stretch being dragged, a start set by a tap — in words that fit the
 * reader's pointer, since a phone has no Esc — the select mode's own
 * instruction — a finger's reading is pinned on this chart, so the mode
 * would otherwise never get a word in — or the values at the point being
 * read. Null when nothing is happening: the chart then says how to begin,
 * in words that fit the reader's pointer. The window itself is not here —
 * the toolbar's status output says that — so a hover never talks over
 * it. Pure, so the precedence is tested alone; the words come from
 * `activities.streams`.
 */

export type ReadoutKey = "selecting" | "edgeSet" | "edgeSetTouch" | "selectHint";

export function readoutText({
  t,
  band,
  edge,
  armed,
  coarse,
  select,
  at,
  clock,
  values,
  stamp,
}: {
  t: (key: ReadoutKey, values?: Record<string, string | number>) => string;
  /** Clamped px, unordered. */
  band: readonly [number, number] | null;
  /** px of a set start. */
  edge: number | null;
  armed: boolean;
  /** The primary pointer is a finger: no Esc, but the mode's button to turn off. */
  coarse: boolean;
  /** The select mode's button by its own name, so a finger is pointed at it. */
  select: string;
  /** The drawn point being read. */
  at: number | null;
  /** The clock at `at`. */
  clock: string;
  /** Every visible channel at `at`, "–" for a gap. */
  values: ReadonlyArray<{ label: string; text: string }>;
  /** A px on the time axis as the readout says it. */
  stamp: (px: number) => string;
}): string | null {
  if (band) {
    return t("selecting", { from: stamp(Math.min(...band)), to: stamp(Math.max(...band)) });
  }
  if (edge !== null) {
    const time = stamp(edge);
    return coarse ? t("edgeSetTouch", { time, select }) : t("edgeSet", { time });
  }
  if (armed) return t("selectHint");
  if (at !== null) return [clock, ...values.map((v) => `${v.label} ${v.text}`)].join(" · ");
  return null;
}
