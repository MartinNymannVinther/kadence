/**
 * The arithmetic under Kadence's hand-drawn charts (CLAUDE.md: charts are
 * SVG, no library): a linear scale, clean tick values, and the paths the
 * marks are drawn with. Pure, so the charts stay small and this is
 * testable on its own.
 */

export type Scale = (value: number) => number;

/** Maps `domain` onto `range` in a straight line; a flat domain maps to the range's start. */
export function linearScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  return (value) => (span === 0 ? r0 : r0 + ((value - d0) / span) * (r1 - r0));
}

/** The mirror of `linearScale`: a position in `range` back to its value; a flat range maps to the domain's start. */
export function invertScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = r1 - r0;
  return (position) => (span === 0 ? d0 : d0 + ((position - r0) / span) * (d1 - d0));
}

/** A step of 1, 2, 2.5 or 5 times a power of ten that cuts `span` into about `count` parts. */
export function niceStep(span: number, count: number): number {
  if (!(span > 0) || count < 1) return 1;
  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

/**
 * Clean tick values covering `min`–`max`, from a multiple of the step at
 * or below `min` to one at or above `max`. The first and last tick are
 * the axis' own ends, so a chart draws its domain from them.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  const low = Math.min(min, max);
  const high = Math.max(min, max, low + 1e-9);
  const step = niceStep(high - low, count);
  const start = Math.floor(low / step) * step;
  const end = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks.length > 1 ? ticks : [start, start + step];
}

/**
 * Where a symbol sits on a band the plot may cut: the middle of the
 * band's visible part, kept `inset` inside the plot's edges so a band
 * running off the plot still carries its symbol where it can be seen.
 */
export function visibleCentre(
  band: readonly [number, number],
  plot: readonly [number, number],
  inset: number,
): number {
  const from = Math.max(Math.min(band[0], band[1]), plot[0]);
  const to = Math.min(Math.max(band[0], band[1]), plot[1]);
  const centre = (from + to) / 2;
  return Math.min(Math.max(centre, plot[0] + inset), plot[1] - inset);
}

/** A line through the points; a null breaks it, so a gap in the data is a gap in the line. */
export function linePath(points: ReadonlyArray<readonly [number, number] | null>): string {
  let d = "";
  let pen = false;
  for (const point of points) {
    if (!point) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${point[0].toFixed(1)},${point[1].toFixed(1)}`;
    pen = true;
  }
  return d;
}

/** The area between the points and a horizontal baseline. */
export function areaPath(
  points: ReadonlyArray<readonly [number, number]>,
  baseline: number,
): string {
  if (points.length === 0) return "";
  const first = points[0]!;
  const last = points.at(-1)!;
  return `M${first[0].toFixed(1)},${baseline.toFixed(1)}${points
    .map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`)
    .join("")}L${last[0].toFixed(1)},${baseline.toFixed(1)}Z`;
}

/**
 * A bar standing on `baseline` and reaching `top` (above or below it),
 * rounded at the data end and square at the baseline, as the dataviz
 * specs ask. The radius shrinks for a bar too short to hold it.
 */
export function barPath(
  x: number,
  width: number,
  baseline: number,
  top: number,
  radius = 4,
): string {
  const h = Math.abs(baseline - top);
  if (h < 0.5 || width <= 0) return "";
  const r = Math.min(radius, width / 2, h);
  const up = top < baseline;
  const y0 = baseline;
  const y1 = top;
  const s = up ? 1 : -1;
  return [
    `M${x},${y0}`,
    `L${x},${y1 + s * r}`,
    `Q${x},${y1} ${x + r},${y1}`,
    `L${x + width - r},${y1}`,
    `Q${x + width},${y1} ${x + width},${y1 + s * r}`,
    `L${x + width},${y0}`,
    "Z",
  ].join("");
}
