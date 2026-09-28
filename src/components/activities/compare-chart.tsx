"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChartLegend } from "@/components/charts/chart-legend";
import { num } from "@/components/charts/format";
import { linePath, linearScale, niceTicks } from "@/components/charts/scale";
import { useHoverIndex } from "@/components/charts/use-hover-index";
import { useWidth } from "@/components/charts/use-width";
import { clockText } from "@/components/training/duration";
import { alignRides, nearestIndex } from "./compare-align";
import type { Streams } from "./streams-chart";

export type CompareRide = { id: string; name: string; streams: Streams };

const CHANNELS = ["power", "hr", "speed", "alt"] as const;
type Channel = (typeof CHANNELS)[number];
const PANEL = 88;
const LABEL = 16;
const GAP = 10;
const AXIS = 18;
const LEFT = 36;
const RIGHT = 8;
const COLOURS = [1, 2, 3, 4, 5, 6].map((n) => `var(--series-${n})`);

/**
 * Riders' curves over each other, on the same ride: watt, pulse, speed
 * and height, one strip each, lined up by distance so the same hill is
 * the same place on every line. A pointer or the arrow keys read every
 * rider at one point. Riders keep the team's order — no one is ranked.
 */
export function CompareChart({ rides }: { rides: CompareRide[] }) {
  const t = useTranslations("activities.together");
  const streams = useTranslations("activities.streams");
  const locale = useLocale();
  const { ref, width } = useWidth<HTMLDivElement>();
  const aligned = alignRides(rides.map((r) => r.streams));
  const end = Math.max(1, ...aligned.rides.map((r) => r.x.at(-1) ?? 0));
  const x = linearScale([0, end], [LEFT, width - RIGHT]);
  // The hover runs on a virtual axis of 400 steps; each rider's nearest sample is read.
  const STEPS = 400;
  const hover = useHoverIndex(STEPS + 1, (i) => x((i / STEPS) * end));
  const atX = hover.index === null ? null : (hover.index / STEPS) * end;
  const shown = CHANNELS.filter((c) => aligned.rides.some((r) => r[c].some((v) => v !== null)));
  const height = shown.length * (LABEL + PANEL + GAP) + AXIS;
  const unit: Record<Channel, (v: number) => string> = {
    power: (v) => streams("watt", { w: Math.round(v) }),
    hr: (v) => streams("bpm", { bpm: Math.round(v) }),
    speed: (v) => streams("kmh", { kmh: num(v, locale, 1) }),
    alt: (v) => streams("m", { m: num(v, locale) }),
  };
  const axisText = (v: number) =>
    aligned.axis === "distance" ? num(v / 1000, locale, 1) : clockText(Math.round(v));
  const ticks = niceTicks(0, aligned.axis === "distance" ? end / 1000 : end / 60, 5)
    .map((v) => (aligned.axis === "distance" ? v * 1000 : v * 60))
    .filter((v) => v <= end);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ChartLegend
        items={rides.map((r, i) => ({
          key: r.id,
          label: r.name,
          mark: "line",
          color: COLOURS[i % 6]!,
        }))}
      />
      <div className="text-2sm min-h-5 font-medium tabular-nums" aria-live="polite">
        {atX === null
          ? t("hint")
          : `${aligned.axis === "distance" ? t("atKm", { km: num(atX / 1000, locale, 1) }) : clockText(Math.round(atX))} · ${rides
              .map((r, i) => {
                const ride = aligned.rides[i]!;
                const k = nearestIndex(ride.x, atX);
                const parts = shown
                  .map((c) => (ride[c][k] === null ? null : unit[c](ride[c][k] as number)))
                  .filter(Boolean);
                return `${r.name}: ${parts.join(" / ") || "–"}`;
              })
              .join(" · ")}`}
      </div>
      <div ref={ref} className="w-full">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t("chartLabel", { count: rides.length })}
          className="focus-visible:outline-ring block touch-pan-y rounded-md outline-none focus-visible:outline-2"
          {...hover.handlers}
        >
          {shown.map((c, row) => {
            const top = row * (LABEL + PANEL + GAP) + LABEL;
            const values = aligned.rides.flatMap((r) =>
              r[c].filter((v): v is number => v !== null),
            );
            const low = c === "alt" ? Math.min(...values) : 0;
            const yTicks = niceTicks(low, Math.max(...values, low + 1), 2);
            const y = linearScale([yTicks[0]!, yTicks.at(-1)!], [top + PANEL, top + 4]);
            return (
              <g key={c}>
                <text x={LEFT} y={top - 5} className="fill-foreground text-2xs font-medium">
                  {streams(c)}
                </text>
                {[yTicks[0]!, yTicks.at(-1)!].map((tick) => (
                  <g key={tick}>
                    <line
                      x1={LEFT}
                      x2={width - RIGHT}
                      y1={y(tick)}
                      y2={y(tick)}
                      stroke="var(--border)"
                    />
                    <text
                      x={LEFT - 6}
                      y={y(tick) + 4}
                      textAnchor="end"
                      className="fill-meta text-2xs"
                    >
                      {num(tick, locale)}
                    </text>
                  </g>
                ))}
                {aligned.rides.map((ride, i) => (
                  <path
                    key={rides[i]!.id}
                    d={linePath(
                      ride[c].map((v, k) => (v === null ? null : ([x(ride.x[k]!), y(v)] as const))),
                    )}
                    fill="none"
                    stroke={COLOURS[i % 6]}
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    opacity={0.9}
                  />
                ))}
                {atX !== null &&
                  aligned.rides.map((ride, i) => {
                    const k = nearestIndex(ride.x, atX);
                    const v = ride[c][k] ?? null;
                    return v === null ? null : (
                      <circle
                        key={rides[i]!.id}
                        cx={x(ride.x[k]!)}
                        cy={y(v)}
                        r={3.5}
                        fill={COLOURS[i % 6]}
                        stroke="var(--card)"
                        strokeWidth={1.5}
                      />
                    );
                  })}
              </g>
            );
          })}
          {atX !== null && (
            <line
              x1={x(atX)}
              x2={x(atX)}
              y1={0}
              y2={height - AXIS}
              stroke="var(--meta)"
              aria-hidden
            />
          )}
          {ticks.map((v) => (
            <text
              key={v}
              x={x(v)}
              y={height - 4}
              textAnchor={v === 0 ? "start" : "middle"}
              className="fill-meta text-2xs"
            >
              {axisText(v)}
            </text>
          ))}
        </svg>
      </div>
      <p className="text-meta text-xs">
        {aligned.axis === "distance" ? t("byDistance") : t("byTime")}
      </p>
    </div>
  );
}
