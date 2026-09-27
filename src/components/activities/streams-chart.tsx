"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { areaPath, linePath, linearScale, niceTicks } from "@/components/charts/scale";
import { useHoverIndex } from "@/components/charts/use-hover-index";
import { useWidth } from "@/components/charts/use-width";
import { clockText } from "@/components/training/duration";

export type Streams = {
  t: number[];
  power?: (number | null)[];
  hr?: (number | null)[];
  cadence?: (number | null)[];
  /** m/s; drawn as km/h. */
  speed?: (number | null)[];
  alt?: (number | null)[];
  lat?: (number | null)[];
  lon?: (number | null)[];
};

const CHANNELS = ["power", "hr", "speed", "cadence", "alt"] as const;
type Channel = (typeof CHANNELS)[number];

const PANEL = 72;
const GAP = 10;
/** Room above each strip for its name, so the name never sits on the line. */
const LABEL = 16;
const AXIS = 18;
const LEFT = 36;
const RIGHT = 8;
/** Points drawn per line at most; the stored streams are already 5-second averages. */
const MAX_POINTS = 480;

function thin(streams: Streams): {
  step: number;
  t: number[];
  values: Record<Channel, (number | null)[]>;
} {
  const step = Math.max(1, Math.ceil(streams.t.length / MAX_POINTS));
  const pick = <T,>(list: T[] | undefined) => (list ?? []).filter((_, i) => i % step === 0);
  return {
    step,
    t: pick(streams.t),
    values: {
      power: pick(streams.power),
      hr: pick(streams.hr),
      speed: pick(streams.speed).map((v) => (typeof v === "number" ? v * 3.6 : null)),
      cadence: pick(streams.cadence),
      alt: pick(streams.alt),
    },
  };
}

/** Time into the ride as h:mm, the axis' own short form. */
const hoursMinutes = (seconds: number) =>
  `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}`;

const STROKE: Record<Channel, string> = {
  power: "var(--series-1)",
  hr: "var(--series-2)",
  speed: "var(--series-1)",
  cadence: "var(--series-1)",
  alt: "var(--meta)",
};

const present = (values: (number | null)[]) => values.some((v) => typeof v === "number" && v > 0);

/**
 * The ride over time: watt, pulse, speed, cadence and height, each in its
 * own strip on its own scale over one shared time axis — never two scales
 * on one plot. Each channel can be turned off; a pointer or the arrow keys
 * read every visible channel at the same moment, and `onIndex` hears which
 * sample of `streams` that is, so the route can show where it was.
 */
export function StreamsChart({
  streams,
  onIndex,
}: {
  streams: Streams;
  onIndex?: (index: number | null) => void;
}) {
  const t = useTranslations("activities.streams");
  const locale = useLocale();
  const { ref, width } = useWidth<HTMLDivElement>();
  const data = thin(streams);
  const available = CHANNELS.filter((c) => present(data.values[c]));
  const [on, setOn] = useState<Set<Channel>>(() => new Set(available));
  const visible = available.filter((c) => on.has(c));
  const end = data.t.at(-1) ?? 1;
  const x = linearScale([0, Math.max(1, end)], [LEFT, width - RIGHT]);
  const hover = useHoverIndex(data.t.length, (i) => x(data.t[i] ?? 0));
  const height = visible.length * (LABEL + PANEL + GAP) + AXIS;
  const reading = hover.index === null ? null : hover.index * data.step;
  useEffect(() => onIndex?.(reading), [onIndex, reading]);
  const timeTicks = niceTicks(0, end / 60, 4)
    .map((m) => m * 60)
    .filter((s) => s <= end);

  if (available.length === 0) return <p className="text-meta text-2sm">{t("none")}</p>;

  const unit: Record<Channel, (v: number) => string> = {
    power: (v) => t("watt", { w: Math.round(v) }),
    hr: (v) => t("bpm", { bpm: Math.round(v) }),
    speed: (v) => t("kmh", { kmh: num(v, locale, 1) }),
    cadence: (v) => t("rpm", { rpm: Math.round(v) }),
    alt: (v) => t("m", { m: num(v, locale) }),
  };
  const at = hover.index;
  const readout =
    at !== null
      ? [
          clockText(data.t[at] ?? 0),
          ...visible.map((c) => {
            const v = data.values[c][at];
            return `${t(c)} ${typeof v === "number" ? unit[c](v) : "–"}`;
          }),
        ].join(" · ")
      : t("hint");

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div role="group" aria-label={t("show")} className="flex flex-wrap gap-1.5">
        {available.map((c) => (
          <label
            key={c}
            className="border-border bg-card has-checked:border-primary has-checked:bg-accent has-focus-visible:outline-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-2sm has-focus-visible:outline-2 sm:min-h-9"
          >
            <input
              type="checkbox"
              checked={on.has(c)}
              className="accent-primary size-4"
              onChange={(e) =>
                setOn((current) => {
                  const next = new Set(current);
                  if (e.target.checked) next.add(c);
                  else next.delete(c);
                  return next;
                })
              }
            />
            {t(c)}
          </label>
        ))}
      </div>
      <p className="text-2sm min-h-5 font-medium tabular-nums" aria-live="polite">
        {readout}
      </p>
      <div ref={ref} className="w-full">
        {visible.length > 0 && (
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={t("label", { channels: visible.map((c) => t(c)).join(", ") })}
            className="focus-visible:outline-ring block touch-pan-y rounded-md outline-none focus-visible:outline-2"
            {...hover.handlers}
          >
            {visible.map((c, row) => {
              const head = row * (LABEL + PANEL + GAP);
              const top = head + LABEL;
              const values = data.values[c];
              const numbers = values.filter((v): v is number => typeof v === "number");
              const low = c === "alt" ? Math.min(...numbers) : 0;
              const ticks = niceTicks(low, Math.max(...numbers, low + 1), 2);
              const y = linearScale([ticks[0]!, ticks.at(-1)!], [top + PANEL, top + 4]);
              const points = values.map((v, i) =>
                typeof v === "number" ? ([x(data.t[i] ?? 0), y(v)] as const) : null,
              );
              const solid = points.filter((p): p is readonly [number, number] => p !== null);
              return (
                <g key={c}>
                  <text x={LEFT} y={head + 11} className="fill-foreground text-2xs font-medium">
                    {t(c)}
                  </text>
                  {[ticks[0]!, ticks.at(-1)!].map((tick) => (
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
                  {c === "alt" && (
                    <path d={areaPath(solid, top + PANEL)} fill="var(--chart-3)" opacity={0.35} />
                  )}
                  <path
                    d={linePath(points)}
                    fill="none"
                    stroke={STROKE[c]}
                    strokeWidth={c === "power" ? 1.25 : 1.75}
                    strokeLinejoin="round"
                  />
                  {at !== null && typeof values[at] === "number" && (
                    <circle
                      cx={x(data.t[at] ?? 0)}
                      cy={y(values[at] as number)}
                      r={4}
                      fill={c === "alt" ? "var(--meta)" : STROKE[c]}
                      stroke="var(--card)"
                      strokeWidth={2}
                    />
                  )}
                </g>
              );
            })}
            {at !== null && (
              <line
                x1={x(data.t[at] ?? 0)}
                x2={x(data.t[at] ?? 0)}
                y1={0}
                y2={height - AXIS}
                stroke="var(--meta)"
                strokeWidth={1}
                aria-hidden
              />
            )}
            {timeTicks.map((s) => (
              <text
                key={s}
                x={x(s)}
                y={height - 4}
                textAnchor={s === 0 ? "start" : "middle"}
                className="fill-meta text-2xs"
              >
                {hoursMinutes(s)}
              </text>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}
