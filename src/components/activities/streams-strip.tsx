import { num } from "@/components/charts/format";
import { areaPath, linePath, linearScale, niceTicks, type Scale } from "@/components/charts/scale";
import { STROKE, type Channel } from "./streams-data";

export const PANEL = 72;
export const GAP = 10;
/** Room above each strip for its name, so the name never sits on the line. */
export const LABEL = 16;
export const AXIS = 18;
export const LEFT = 36;
export const RIGHT = 8;
/** One strip's whole row: its name, its panel and the gap to the next. */
export const ROW = LABEL + PANEL + GAP;

/**
 * One channel of the ride in its own strip: two ticks on a scale that
 * follows the drawn points — so a window on a climb gets its own axis —
 * the altitude area, the line, and the dot at the point being read. The
 * strip's name is the chart's to draw, above the pause bands, so it stays
 * legible when a band reaches the plot's edge. Every drawn point lies
 * inside the chart's x domain, so nothing here needs clipping.
 */
export function StreamsStrip({
  channel,
  values,
  t,
  x,
  width,
  head,
  at,
  locale,
}: {
  channel: Channel;
  values: (number | null)[];
  t: number[];
  x: Scale;
  width: number;
  head: number;
  at: number | null;
  locale: string;
}) {
  const top = head + LABEL;
  const numbers = values.filter((v): v is number => typeof v === "number");
  const low = channel === "alt" && numbers.length > 0 ? Math.min(...numbers) : 0;
  const high = numbers.length > 0 ? Math.max(...numbers) : low;
  const ticks = niceTicks(low, Math.max(high, low + 1), 2);
  const y = linearScale([ticks[0]!, ticks.at(-1)!], [top + PANEL, top + 4]);
  const points = values.map((v, k) =>
    typeof v === "number" ? ([x(t[k] ?? 0), y(v)] as const) : null,
  );
  const solid = points.filter((p): p is readonly [number, number] => p !== null);
  const read = at !== null ? values[at] : null;
  return (
    <g>
      {[ticks[0]!, ticks.at(-1)!].map((tick) => (
        <g key={tick}>
          <line x1={LEFT} x2={width - RIGHT} y1={y(tick)} y2={y(tick)} stroke="var(--border)" />
          <text x={LEFT - 6} y={y(tick) + 4} textAnchor="end" className="fill-meta text-2xs">
            {num(tick, locale)}
          </text>
        </g>
      ))}
      {channel === "alt" && (
        <path d={areaPath(solid, top + PANEL)} fill="var(--chart-3)" opacity={0.35} />
      )}
      <path
        d={linePath(points)}
        fill="none"
        stroke={STROKE[channel]}
        strokeWidth={channel === "power" ? 1.25 : 1.75}
        strokeLinejoin="round"
      />
      {at !== null && typeof read === "number" && (
        <circle
          cx={x(t[at] ?? 0)}
          cy={y(read)}
          r={4}
          fill={channel === "alt" ? "var(--meta)" : STROKE[channel]}
          stroke="var(--card)"
          strokeWidth={2}
        />
      )}
    </g>
  );
}

/** A strip's name in the label row above it, drawn over whatever the row holds. */
export function StripLabel({ row, text }: { row: number; text: string }) {
  return (
    <text x={LEFT} y={row * ROW + 11} className="fill-foreground text-2xs font-medium">
      {text}
    </text>
  );
}
