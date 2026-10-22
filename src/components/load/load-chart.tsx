"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { monthShort, num, signed } from "@/components/charts/format";
import { areaPath, linePath, linearScale, niceTicks } from "@/components/charts/scale";
import { useHoverIndex } from "@/components/charts/use-hover-index";
import { useWidth } from "@/components/charts/use-width";
import { FATIGUE_COLOUR, FITNESS_COLOUR, FORM_COLOUR } from "./form-state";
import { FormStrip } from "./form-strip";
import { LoadTable } from "./load-table";
import { LoadTiles } from "./load-tiles";

export type LoadPoint = { date: string; fitness: number; fatigue: number; form: number };
export type AheadRace = { title: string; date: string; priority: "A" | "B" };

const TOP = 150;
const FORM = 80;
const GAP = 34;
const AXIS = 20;
const LEFT = 34;
const RIGHT = 12;

/**
 * Kondition, træthed and friskhed over the last 90 days (ADR 0016, 0108):
 * the first two as lines on one scale — kondition heavier with its area
 * under it, træthed lighter — and friskhed, the difference, in a strip of
 * its own colour below with zero in the middle, so no chart needs two
 * axes. Three tiles above the chart are legend and readout at once; a
 * pointer or the arrow keys move the day they show. `ahead` continues the
 * three dashed past today over a shaded field — where they head if the
 * plan is ridden (src/modules/load/forecast.ts) — to the race it names.
 * Kadence's own names throughout; the trademarked ones appear nowhere.
 */
export function LoadChart({
  days: past,
  ahead = [],
  race = null,
}: {
  days: LoadPoint[];
  ahead?: LoadPoint[];
  race?: AheadRace | null;
}) {
  const t = useTranslations("load");
  const locale = useLocale();
  const { ref, width } = useWidth<HTMLDivElement>();
  const clip = useId().replace(/[^a-zA-Z0-9]/g, "");
  const days = [...past, ...ahead];
  const todayIndex = past.length - 1;
  const n = days.length;
  const x = linearScale([0, Math.max(1, n - 1)], [LEFT, width - RIGHT]);
  const hover = useHoverIndex(n, x);

  const peak = Math.max(10, ...days.map((d) => Math.max(d.fitness, d.fatigue)));
  const ticks = niceTicks(0, peak, 3);
  const y = linearScale([0, ticks.at(-1)!], [TOP, 6]);
  const formLimit = niceTicks(0, Math.max(10, ...days.map((d) => Math.abs(d.form))), 2).at(-1)!;
  const formTop = TOP + GAP;
  const yForm = linearScale([-formLimit, formLimit], [formTop + FORM, formTop]);
  const bottom = formTop + FORM;
  const height = bottom + AXIS;

  const all = {
    fitness: days.map((d, i) => [x(i), y(d.fitness)] as const),
    fatigue: days.map((d, i) => [x(i), y(d.fatigue)] as const),
    form: days.map((d, i) => [x(i), yForm(d.form)] as const),
  };
  // Drawn solid to today, dashed from today on: the dashed part starts at
  // today's point so the two meet.
  const fitness = all.fitness.slice(0, past.length);
  const fatigue = all.fatigue.slice(0, past.length);
  const aheadFrom = Math.max(0, todayIndex);
  const dashed = ahead.length > 0;
  const raceIndex = race ? days.findIndex((d) => d.date === race.date) : -1;
  const months = days
    .map((d, i) => ({ i, date: d.date }))
    .filter(({ date }, i) => i > 3 && date.endsWith("-01"));
  const last = past.at(-1);
  const shown = hover.index !== null ? days[hover.index] : last;
  const shownAhead = hover.index !== null && hover.index > todayIndex;
  const raceLabelLeft = raceIndex >= 0 && x(raceIndex) + 140 < width - RIGHT;

  return (
    <figure className="flex min-w-0 flex-col gap-3">
      {shown && <LoadTiles shown={shown} ahead={shownAhead} dashed={dashed} race={race !== null} />}
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
          className="focus-visible:outline-ring block touch-pan-y rounded-md outline-none focus-visible:outline-2 focus-visible:outline-solid"
          {...hover.handlers}
        >
          {dashed && (
            // The plan's field: everything to the right of today is not ridden yet.
            <rect
              x={x(todayIndex)}
              y={4}
              width={Math.max(0, x(n - 1) - x(todayIndex))}
              height={bottom - 4}
              fill="var(--chart-5)"
              opacity={0.4}
            />
          )}

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

          <path d={areaPath(fitness, TOP)} fill={FITNESS_COLOUR} opacity={0.12} />
          <path
            d={linePath(fatigue)}
            fill="none"
            stroke={FATIGUE_COLOUR}
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={linePath(fitness)}
            fill="none"
            stroke={FITNESS_COLOUR}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {dashed && (
            <g aria-hidden>
              <line
                x1={x(todayIndex)}
                x2={x(todayIndex)}
                y1={4}
                y2={bottom}
                stroke="var(--input)"
                strokeWidth={1}
              />
              <text x={x(todayIndex) - 4} y={14} textAnchor="end" className="fill-meta text-2xs">
                {t("today")}
              </text>
              <path
                d={linePath(all.fatigue.slice(aheadFrom))}
                fill="none"
                stroke={FATIGUE_COLOUR}
                strokeWidth={1.75}
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
              <path
                d={linePath(all.fitness.slice(aheadFrom))}
                fill="none"
                stroke={FITNESS_COLOUR}
                strokeWidth={2.5}
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
            </g>
          )}

          <FormStrip
            clip={clip}
            left={LEFT}
            right={width - RIGHT}
            top={formTop}
            height={FORM}
            limit={formLimit}
            yForm={yForm}
            past={all.form.slice(0, past.length)}
            ahead={dashed ? all.form.slice(aheadFrom) : []}
            wordsFit={width >= 420}
          />

          {raceIndex >= 0 && (
            <g aria-hidden>
              <line
                x1={x(raceIndex)}
                x2={x(raceIndex)}
                y1={4}
                y2={bottom}
                stroke="var(--foreground)"
                strokeWidth={1.5}
              />
              <text
                x={x(raceIndex) + (raceLabelLeft ? 4 : -4)}
                y={28}
                textAnchor={raceLabelLeft ? "start" : "end"}
                className="fill-foreground text-2xs font-medium"
              >
                {race!.priority}: {race!.title.slice(0, 24)}
              </text>
              <circle
                cx={x(raceIndex)}
                cy={yForm(days[raceIndex]!.form)}
                r={4}
                fill="var(--foreground)"
                stroke="var(--card)"
                strokeWidth={2}
              />
            </g>
          )}

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
                y2={bottom}
                stroke="var(--meta)"
                strokeWidth={1}
              />
              {[
                [y(shown.fitness), FITNESS_COLOUR],
                [y(shown.fatigue), FATIGUE_COLOUR],
                [yForm(shown.form), FORM_COLOUR],
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
      <LoadTable days={past} />
    </figure>
  );
}
