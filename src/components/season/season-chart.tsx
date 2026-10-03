"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChartLegend } from "@/components/charts/chart-legend";
import { monthLong, num } from "@/components/charts/format";
import { barPath, linearScale, niceTicks } from "@/components/charts/scale";
import { useHoverIndex } from "@/components/charts/use-hover-index";
import { useWidth } from "@/components/charts/use-width";

export type SeasonChartMonth = {
  month: number;
  planned: number;
  scheduled: number;
  /** Null when the team plans without DCU (ADR 0049): no tick, no legend. */
  dcu: number | null;
  ridden: number;
};

const PLANNED = "var(--series-1)";
const RIDDEN = "var(--series-2)";
const PLOT = 150;
const AXIS = 20;
const LEFT = 30;
const RIGHT = 8;

/**
 * The season month by month in the four numbers (ADR 0040): the coach's
 * goal as a bar, beside it the hours planned in the calendar as an
 * outline with the hours done filling it, and DCU's hours as a dark tick
 * across each month — the reference the others are read against. A
 * pointer or the arrow keys read a month's four numbers above it.
 */
export function SeasonChart({ months }: { months: SeasonChartMonth[] }) {
  const t = useTranslations("season.chart");
  const locale = useLocale();
  const { ref, width } = useWidth<HTMLDivElement>();
  const n = months.length;
  const slot = (width - LEFT - RIGHT) / Math.max(1, n);
  const center = (i: number) => LEFT + slot * (i + 0.5);
  const hover = useHoverIndex(n, center);
  const peak = Math.max(
    10,
    ...months.map((m) => Math.max(m.planned, m.scheduled, m.dcu ?? 0, m.ridden)),
  );
  const ticks = niceTicks(0, peak, 3);
  const y = linearScale([0, ticks.at(-1)!], [PLOT, 6]);
  const bar = Math.max(4, Math.min(16, (slot - 6) / 2));
  const shown = hover.index !== null ? months[hover.index] : null;
  const hours = (v: number) => num(v, locale, 1);
  const guided = months.some((m) => m.dcu !== null);

  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <ChartLegend
        items={[
          { key: "planned", label: t("planned"), mark: "bar", color: PLANNED },
          { key: "scheduled", label: t("scheduled"), mark: "outline", color: RIDDEN },
          { key: "ridden", label: t("ridden"), mark: "bar", color: RIDDEN },
          ...(guided
            ? [{ key: "dcu", label: t("dcu"), mark: "tick" as const, color: "var(--foreground)" }]
            : []),
        ]}
      />
      <p className="text-2sm min-h-5 font-medium tabular-nums" aria-live="polite">
        {shown
          ? shown.dcu === null
            ? t("readoutOwn", {
                month: monthLong(shown.month, locale),
                plan: hours(shown.planned),
                scheduled: hours(shown.scheduled),
                ridden: hours(shown.ridden),
              })
            : t("readout", {
                month: monthLong(shown.month, locale),
                plan: hours(shown.planned),
                scheduled: hours(shown.scheduled),
                dcu: hours(shown.dcu),
                ridden: hours(shown.ridden),
              })
          : t("hint")}
      </p>
      <div ref={ref} className="w-full">
        <svg
          width="100%"
          height={PLOT + AXIS}
          viewBox={`0 0 ${width} ${PLOT + AXIS}`}
          role="img"
          aria-label={t("label")}
          className="focus-visible:outline-ring block touch-pan-y rounded-md outline-none focus-visible:outline-2"
          {...hover.handlers}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={LEFT} x2={width - RIGHT} y1={y(tick)} y2={y(tick)} stroke="var(--border)" />
              <text x={LEFT - 6} y={y(tick) + 4} textAnchor="end" className="fill-meta text-2xs">
                {num(tick, locale)}
              </text>
            </g>
          ))}
          {months.map((m, i) => {
            const c = center(i);
            return (
              <g key={m.month}>
                {hover.index === i && (
                  <rect
                    x={LEFT + slot * i + 1}
                    y={2}
                    width={slot - 2}
                    height={PLOT - 2}
                    rx={4}
                    fill="var(--muted)"
                  />
                )}
                <path d={barPath(c - bar - 1, bar, PLOT, y(m.planned))} fill={PLANNED} />
                <path d={barPath(c + 1, bar, PLOT, y(m.ridden))} fill={RIDDEN} />
                {m.scheduled > 0 && (
                  <path
                    d={barPath(c + 1.75, bar - 1.5, PLOT, y(m.scheduled))}
                    fill="none"
                    stroke={RIDDEN}
                    strokeWidth={1.5}
                  />
                )}
                {m.dcu !== null && (
                  <>
                    <line
                      x1={c - bar - 3}
                      x2={c + bar + 3}
                      y1={y(m.dcu)}
                      y2={y(m.dcu)}
                      stroke="var(--card)"
                      strokeWidth={5}
                      strokeLinecap="round"
                    />
                    <line
                      x1={c - bar - 3}
                      x2={c + bar + 3}
                      y1={y(m.dcu)}
                      y2={y(m.dcu)}
                      stroke="var(--foreground)"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                  </>
                )}
                <text x={c} y={PLOT + AXIS - 4} textAnchor="middle" className="fill-meta text-2xs">
                  {monthLong(m.month, locale).slice(0, slot < 30 ? 1 : 3)}
                </text>
              </g>
            );
          })}
          <line x1={LEFT} x2={width - RIGHT} y1={PLOT} y2={PLOT} stroke="var(--input)" />
        </svg>
      </div>
    </figure>
  );
}
