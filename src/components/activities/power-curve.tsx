"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Period } from "@/modules/load";
import { PeriodSelect } from "./period-select";
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
 * duration at a time. With `compare`, the rider's best curve over a
 * period lies behind in grey, and the durations this ride set the record
 * on are marked. The rider against themselves (ADR 0013).
 */
export type CurveCompare = {
  curves: Record<Period, Array<[number, number]>>;
  setBy: Record<Period, number[]>;
};

export function PowerCurve({
  best,
  compare,
}: {
  best: Record<string, number>;
  compare?: CurveCompare;
}) {
  const t = useTranslations("activities.curve");
  const [period, setPeriod] = useState<Period>("year");
  const bestCurve = compare?.curves[period] ?? [];
  const setBy = new Set(compare?.setBy[period] ?? []);
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
  const ticks = niceTicks(
    0,
    Math.max(...points.map(([, w]) => w), ...bestCurve.map(([, w]) => w)),
    3,
  );
  const y = linearScale([0, ticks.at(-1)!], [HEIGHT - AXIS, TOP]);
  const drawn = points.map(([s, w]) => [xOf(s), y(w)] as const);
  const bestDrawn = bestCurve
    .filter(([s]) => s >= first && s <= last)
    .map(([s, w]) => [xOf(s), y(w)] as const);
  const at = hover.index;
  const reading = at !== null ? points[at] : undefined;
  const readingBest = reading ? bestCurve.find(([s]) => s === reading[0])?.[1] : undefined;
  const readout = reading
    ? [
        t("readout", { duration: duration(reading[0]), w: reading[1] }),
        readingBest !== undefined && compare ? t("readoutBest", { w: readingBest }) : null,
        setBy.has(reading[0]) ? t("record") : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : t("hint");

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {compare && (
        <div className="flex flex-col gap-1.5">
          <p className="text-2sm">{t("compare")}</p>
          <PeriodSelect value={period} onChange={setPeriod} label={t("compare")} />
          {setBy.size > 0 && (
            <p className="text-2sm font-medium">
              {t("recordsSet", {
                count: setBy.size,
                durations: [...setBy]
                  .sort((a, b) => a - b)
                  .map(duration)
                  .join(", "),
              })}
            </p>
          )}
        </div>
      )}
      <p className="text-2sm min-h-5 font-medium tabular-nums" aria-live="polite">
        {readout}
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
          {bestDrawn.length > 1 && (
            <path
              d={linePath(bestDrawn)}
              fill="none"
              stroke="var(--meta)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeLinejoin="round"
            />
          )}
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
          {points.map(([s], i) =>
            setBy.has(s) ? (
              <circle
                key={s}
                cx={drawn[i]![0]}
                cy={drawn[i]![1]}
                r={3.5}
                fill="var(--chart-4)"
                stroke="var(--card)"
                strokeWidth={1.5}
              >
                <title>{t("record")}</title>
              </circle>
            ) : null,
          )}
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
