"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChartLegend } from "@/components/charts/chart-legend";
import { dayMonthShort, monthShort, num, signed } from "@/components/charts/format";
import { areaPath, linePath, linearScale, niceTicks } from "@/components/charts/scale";
import { useHoverIndex } from "@/components/charts/use-hover-index";
import { useWidth } from "@/components/charts/use-width";
import { LoadTable } from "./load-table";

export type LoadPoint = { date: string; fitness: number; fatigue: number; form: number };

const FITNESS = "var(--series-1)";
const FATIGUE = "var(--series-2)";
const TOP = 150;
const FORM = 56;
const GAP = 30;
const AXIS = 20;
const LEFT = 30;
const RIGHT = 34;

/**
 * Kondition, træthed and friskhed over the last 90 days (ADR 0016): the
 * first two as lines on one scale, friskhed — the difference — in its own
 * strip below with zero in the middle, so no chart needs two axes. Moss
 * above zero is rested, clay below is tired; the words say the same. A
 * pointer or the arrow keys read any day in the line above the chart.
 * Kadence's own names throughout; the trademarked ones appear nowhere.
 */
export function LoadChart({ days }: { days: LoadPoint[] }) {
  const t = useTranslations("load");
  const locale = useLocale();
  const { ref, width } = useWidth<HTMLDivElement>();
  const clip = useId().replace(/[^a-zA-Z0-9]/g, "");
  const n = days.length;
  const x = linearScale([0, Math.max(1, n - 1)], [LEFT, width - RIGHT]);
  const hover = useHoverIndex(n, x);

  const peak = Math.max(10, ...days.map((d) => Math.max(d.fitness, d.fatigue)));
  const ticks = niceTicks(0, peak, 3);
  const y = linearScale([0, ticks.at(-1)!], [TOP, 6]);
  const formMax = Math.max(10, ...days.map((d) => Math.abs(d.form)));
  const formTop = TOP + GAP;
  const formZero = formTop + FORM / 2;
  const yForm = linearScale([-formMax, formMax], [formTop + FORM, formTop]);
  const height = formTop + FORM + AXIS;

  const fitness = days.map((d, i) => [x(i), y(d.fitness)] as const);
  const fatigue = days.map((d, i) => [x(i), y(d.fatigue)] as const);
  const form = days.map((d, i) => [x(i), yForm(d.form)] as const);
  const months = days
    .map((d, i) => ({ i, date: d.date }))
    .filter(({ date }, i) => i > 3 && date.endsWith("-01"));
  const last = days.at(-1);
  const shown = hover.index !== null ? days[hover.index] : last;
  const labelsApart = last && Math.abs(y(last.fitness) - y(last.fatigue)) >= 12;

  const readout = shown
    ? t("readout", {
        date: dayMonthShort(shown.date, locale),
        fitness: num(shown.fitness, locale),
        fatigue: num(shown.fatigue, locale),
        form: signed(shown.form, locale),
      })
    : "";

  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <ChartLegend
        items={[
          { key: "fitness", label: t("fitness"), mark: "line", color: FITNESS },
          { key: "fatigue", label: t("fatigue"), mark: "line", color: FATIGUE },
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
          aria-label={
            last
              ? t("chartLabel", {
                  fitness: num(last.fitness, locale),
                  fatigue: num(last.fatigue, locale),
                  form: signed(last.form, locale),
                })
              : t("empty")
          }
          className="focus-visible:outline-ring block touch-pan-y rounded-md outline-none focus-visible:outline-2"
          {...hover.handlers}
        >
          <defs>
            <clipPath id={`${clip}-above`}>
              <rect x={0} y={formTop - 2} width={width} height={FORM / 2 + 2} />
            </clipPath>
            <clipPath id={`${clip}-below`}>
              <rect x={0} y={formZero} width={width} height={FORM / 2 + 2} />
            </clipPath>
          </defs>

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={LEFT}
                x2={width - RIGHT}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text x={LEFT - 6} y={y(tick) + 4} textAnchor="end" className="fill-meta text-2xs">
                {num(tick, locale)}
              </text>
            </g>
          ))}

          <path d={areaPath(fitness, TOP)} fill={FITNESS} opacity={0.1} />
          <path
            d={linePath(fatigue)}
            fill="none"
            stroke={FATIGUE}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={linePath(fitness)}
            fill="none"
            stroke={FITNESS}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {last && labelsApart && (
            <>
              <text
                x={width - RIGHT + 6}
                y={y(last.fitness) + 4}
                className="fill-foreground text-2xs font-medium"
              >
                {num(last.fitness, locale)}
              </text>
              <text x={width - RIGHT + 6} y={y(last.fatigue) + 4} className="fill-meta text-2xs">
                {num(last.fatigue, locale)}
              </text>
            </>
          )}

          <text x={LEFT} y={formTop - 8} className="fill-foreground text-2xs font-medium">
            {t("form")}
          </text>
          <line
            x1={LEFT}
            x2={width - RIGHT}
            y1={formZero}
            y2={formZero}
            stroke="var(--input)"
            strokeWidth={1}
          />
          <path
            d={areaPath(form, formZero)}
            fill={FITNESS}
            opacity={0.22}
            clipPath={`url(#${clip}-above)`}
          />
          <path
            d={areaPath(form, formZero)}
            fill={FATIGUE}
            opacity={0.3}
            clipPath={`url(#${clip}-below)`}
          />
          <path
            d={linePath(form)}
            fill="none"
            stroke={FITNESS}
            strokeWidth={1.5}
            clipPath={`url(#${clip}-above)`}
          />
          <path
            d={linePath(form)}
            fill="none"
            stroke={FATIGUE}
            strokeWidth={1.5}
            clipPath={`url(#${clip}-below)`}
          />
          <text x={LEFT - 6} y={formTop + 10} textAnchor="end" className="fill-meta text-2xs">
            +
          </text>
          <text x={LEFT - 6} y={formTop + FORM - 2} textAnchor="end" className="fill-meta text-2xs">
            −
          </text>
          <text x={width - RIGHT} y={formTop - 8} textAnchor="end" className="fill-meta text-2xs">
            {t("formScale")}
          </text>

          {months.map(({ i, date }) => (
            <text
              key={date}
              x={x(i)}
              y={height - 4}
              textAnchor="middle"
              className="fill-meta text-2xs"
            >
              {monthShort(date, locale)}
            </text>
          ))}

          {hover.index !== null && shown && (
            <g aria-hidden>
              <line
                x1={x(hover.index)}
                x2={x(hover.index)}
                y1={4}
                y2={formTop + FORM}
                stroke="var(--meta)"
                strokeWidth={1}
              />
              {[
                [y(shown.fitness), FITNESS],
                [y(shown.fatigue), FATIGUE],
                [yForm(shown.form), shown.form >= 0 ? FITNESS : FATIGUE],
              ].map(([cy, color], k) => (
                <circle
                  key={k}
                  cx={x(hover.index!)}
                  cy={cy as number}
                  r={4}
                  fill={color as string}
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}
        </svg>
      </div>
      <figcaption className="text-meta text-xs">{t("hint")}</figcaption>
      <LoadTable days={days} />
    </figure>
  );
}
