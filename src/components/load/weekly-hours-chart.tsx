"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChartLegend } from "@/components/charts/chart-legend";
import { num } from "@/components/charts/format";
import { barPath, linearScale, niceTicks } from "@/components/charts/scale";
import { useHoverIndex } from "@/components/charts/use-hover-index";
import { useWidth } from "@/components/charts/use-width";
import { weekNumber } from "@/core/dates";
import type { WeekBar } from "./week-bars";

const DONE = "var(--series-1)";
const BAND = "var(--accent)";
const PLOT = 130;
const AXIS = 20;
const LEFT = 30;
const RIGHT = 8;

/**
 * Hours on the bike week by week, against DCU's corridor for the rider's
 * class: the band is DCU's range, the dashed tick its target, the bar what
 * was ridden, and this week's still-planned hours stacked lighter on top.
 * Above or below the band is not wrong — it is what a coach looks at.
 */
export function WeeklyHoursChart({ weeks }: { weeks: WeekBar[] }) {
  const t = useTranslations("load.weeks");
  const locale = useLocale();
  const { ref, width } = useWidth<HTMLDivElement>();
  const n = weeks.length;
  const slot = (width - LEFT - RIGHT) / Math.max(1, n);
  const center = (i: number) => LEFT + slot * (i + 0.5);
  const hover = useHoverIndex(n, center);
  const peak = Math.max(
    4,
    ...weeks.map((w) => Math.max(w.done + w.planned, w.corridor?.high ?? 0)),
  );
  const ticks = niceTicks(0, peak, 3);
  const y = linearScale([0, ticks.at(-1)!], [PLOT, 6]);
  const bar = Math.min(24, Math.max(6, slot * 0.55));
  const height = PLOT + AXIS;
  const every = slot < 26 ? 2 : 1;
  const shown = hover.index !== null ? weeks[hover.index] : weeks.at(-1);
  const hours = (value: number) => num(value, locale, 1);

  const readout = shown
    ? [
        t("readoutDone", { week: weekNumber(shown.monday), hours: hours(shown.done) }),
        shown.planned > 0 ? t("readoutPlanned", { hours: hours(shown.planned) }) : null,
        shown.corridor
          ? t("readoutCorridor", {
              low: hours(shown.corridor.low),
              high: hours(shown.corridor.high),
            })
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <ChartLegend
        items={[
          { key: "done", label: t("done"), mark: "bar", color: DONE },
          { key: "planned", label: t("planned"), mark: "bar", color: "var(--chart-2)" },
          { key: "corridor", label: t("corridor"), mark: "band", color: BAND },
          { key: "target", label: t("target"), mark: "dash", color: "var(--meta)" },
        ]}
      />
      <p className="text-2sm min-h-5 font-medium tabular-nums" aria-live="polite">
        {readout}
      </p>
      <div ref={ref} className="w-full">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t("label", { count: n })}
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
          {weeks.map((w, i) => {
            const left = center(i) - bar / 2;
            const doneTop = y(w.done);
            return (
              <g key={w.monday}>
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
                {w.corridor && (
                  <>
                    <rect
                      x={LEFT + slot * i + 1}
                      y={y(w.corridor.high)}
                      width={slot - 2}
                      height={Math.max(1, y(w.corridor.low) - y(w.corridor.high))}
                      fill={BAND}
                      opacity={0.75}
                    />
                    <line
                      x1={LEFT + slot * i + 2}
                      x2={LEFT + slot * (i + 1) - 2}
                      y1={y(w.corridor.target)}
                      y2={y(w.corridor.target)}
                      stroke="var(--meta)"
                      strokeDasharray="3 3"
                    />
                  </>
                )}
                <path d={barPath(left, bar, PLOT, doneTop)} fill={DONE} />
                {w.planned > 0 && (
                  <path
                    d={barPath(left, bar, doneTop - (w.done > 0 ? 2 : 0), y(w.done + w.planned))}
                    fill="var(--chart-2)"
                    opacity={0.55}
                  />
                )}
                {i % every === (n - 1) % every && (
                  <text
                    x={center(i)}
                    y={height - 4}
                    textAnchor="middle"
                    className={
                      w.current ? "fill-foreground text-2xs font-semibold" : "fill-meta text-2xs"
                    }
                  >
                    {t("weekShort", { week: weekNumber(w.monday) })}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={LEFT} x2={width - RIGHT} y1={PLOT} y2={PLOT} stroke="var(--input)" />
        </svg>
      </div>
    </figure>
  );
}
