"use client";

import { useTranslations } from "next-intl";
import { areaPath, linePath, linearScale, niceTicks } from "@/components/charts/scale";
import { useHoverIndex } from "@/components/charts/use-hover-index";
import { useWidth } from "@/components/charts/use-width";

const HEIGHT = 200;
const TOP = 10;
const AXIS = 20;
const LEFT = 40;
const RIGHT = 12;
/** Durations named on the axis, when the ride reaches them. */
const TICKS = [1, 5, 30, 60, 300, 1200, 3600, 7200, 14400];

/**
 * The ride's power curve: the best average watt for every duration from a
 * second to the longest the ride held, on a logarithmic time axis so the
 * sprint and the hour both get room. A pointer or the arrow keys read one
 * duration at a time. The rider against themselves (ADR 0013).
 */
export function PowerCurve({ best }: { best: Record<string, number> }) {
  const t = useTranslations("activities.curve");
  const { ref, width } = useWidth<HTMLDivElement>();
  const points = Object.entries(best)
    .map(([s, w]) => [Number(s), w] as const)
    .filter(([s, w]) => Number.isFinite(s) && s > 0 && Number.isFinite(w))
    .sort((a, b) => a[0] - b[0]);
  const first = points[0]?.[0] ?? 1;
  const last = points.at(-1)?.[0] ?? 1;
  const x = linearScale(
    [Math.log(first), Math.log(Math.max(last, first * 2))],
    [LEFT, width - RIGHT],
  );
  const xOf = (seconds: number) => x(Math.log(seconds));
  const hover = useHoverIndex(points.length, (i) => xOf(points[i]?.[0] ?? first));
  if (points.length < 2) return null;

  const duration = (seconds: number) =>
    seconds < 60
      ? t("s", { n: seconds })
      : seconds < 3600
        ? t("min", { n: Math.round((seconds / 60) * 10) / 10 })
        : t("h", { n: Math.round((seconds / 3600) * 10) / 10 });
  const ticks = niceTicks(0, Math.max(...points.map(([, w]) => w)), 3);
  const y = linearScale([0, ticks.at(-1)!], [HEIGHT - AXIS, TOP]);
  const drawn = points.map(([s, w]) => [xOf(s), y(w)] as const);
  const at = hover.index;
  const reading = at !== null ? points[at] : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-2sm min-h-5 font-medium tabular-nums" aria-live="polite">
        {reading ? t("readout", { duration: duration(reading[0]), w: reading[1] }) : t("hint")}
      </p>
      <div ref={ref} className="w-full">
        <svg
          width="100%"
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={t("label", { from: duration(first), to: duration(last) })}
          className="focus-visible:outline-ring block touch-pan-y rounded-md outline-none focus-visible:outline-2"
          {...hover.handlers}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={LEFT} x2={width - RIGHT} y1={y(tick)} y2={y(tick)} stroke="var(--border)" />
              <text x={LEFT - 6} y={y(tick) + 4} textAnchor="end" className="fill-meta text-2xs">
                {tick}
              </text>
            </g>
          ))}
          <path d={areaPath(drawn, HEIGHT - AXIS)} fill="var(--series-1)" opacity={0.12} />
          <path
            d={linePath(drawn)}
            fill="none"
            stroke="var(--series-1)"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {TICKS.filter((s) => s >= first && s <= last).map((s) => (
            <text
              key={s}
              x={xOf(s)}
              y={HEIGHT - 4}
              textAnchor={s === first ? "start" : "middle"}
              className="fill-meta text-2xs"
            >
              {duration(s)}
            </text>
          ))}
          {reading && at !== null && (
            <>
              <line
                x1={drawn[at]![0]}
                x2={drawn[at]![0]}
                y1={TOP}
                y2={HEIGHT - AXIS}
                stroke="var(--meta)"
                aria-hidden
              />
              <circle
                cx={drawn[at]![0]}
                cy={drawn[at]![1]}
                r={4}
                fill="var(--series-1)"
                stroke="var(--card)"
                strokeWidth={2}
              />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
