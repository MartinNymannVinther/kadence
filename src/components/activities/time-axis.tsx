import { axisTicks } from "./axis-ticks";

/**
 * The time axis under the strips: the clock's own ticks, printed in the
 * window's clock — the same `stamp` the status and the printed ends use,
 * so the axis never mixes two shapes. A window prints its two ends in a
 * firmer hand at the plot's edges, and the ticks beside them give way
 * (`axisTicks`) — a zoomed axis is told apart by shape and text, never
 * by colour alone.
 */
export function TimeAxis({
  domain,
  plot,
  x,
  y,
  stamp,
  ends,
}: {
  domain: readonly [number, number];
  plot: readonly [number, number];
  x: (seconds: number) => number;
  /** The text baseline. */
  y: number;
  /** A moment as the window's clock says it (`clockStamp`). */
  stamp: (seconds: number) => string;
  /** The window's ends as the status says them; absent for the whole ride. */
  ends: readonly [string, string] | null;
}) {
  const ticks = axisTicks(domain, plot, x, stamp, ends);
  const anchor = (px: number) =>
    px - plot[0] < 12 ? "start" : plot[1] - px < 12 ? "end" : "middle";
  return (
    <g>
      {ticks.map(({ seconds, text }) => (
        <text
          key={seconds}
          x={x(seconds)}
          y={y}
          textAnchor={anchor(x(seconds))}
          className="fill-meta text-2xs"
        >
          {text}
        </text>
      ))}
      {ends && (
        <>
          <text
            x={plot[0]}
            y={y}
            textAnchor="start"
            className="fill-foreground text-2xs font-medium"
          >
            {ends[0]}
          </text>
          <text x={plot[1]} y={y} textAnchor="end" className="fill-foreground text-2xs font-medium">
            {ends[1]}
          </text>
        </>
      )}
    </g>
  );
}
