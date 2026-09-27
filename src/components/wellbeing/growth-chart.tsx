"use client";

import { useLocale, useTranslations } from "next-intl";
import { dayMonthShort, num } from "@/components/charts/format";
import { linePath, linearScale, niceTicks } from "@/components/charts/scale";
import { useWidth } from "@/components/charts/use-width";
import { diffDays } from "@/core/dates";

const PLOT = 110;
const AXIS = 18;
const LEFT = 34;
const RIGHT = 12;

/**
 * Height through the growth spurt: each measurement a dot, joined in time,
 * with the dates at the ends. A single series, so the title names it and
 * no legend is needed; the list beside it carries every number.
 */
export function GrowthChart({ points }: { points: Array<{ date: string; value: number }> }) {
  const t = useTranslations("measurements");
  const locale = useLocale();
  const { ref, width } = useWidth<HTMLDivElement>(480);
  if (points.length < 2) return null;
  const first = points[0]!.date;
  const span = Math.max(1, diffDays(first, points.at(-1)!.date));
  const x = linearScale([0, span], [LEFT, width - RIGHT]);
  const values = points.map((p) => p.value);
  const ticks = niceTicks(Math.min(...values) - 1, Math.max(...values) + 1, 3);
  const y = linearScale([ticks[0]!, ticks.at(-1)!], [PLOT, 6]);
  const xy = points.map((p) => [x(diffDays(first, p.date)), y(p.value)] as const);

  return (
    <div ref={ref} className="w-full">
      <svg
        width="100%"
        height={PLOT + AXIS}
        viewBox={`0 0 ${width} ${PLOT + AXIS}`}
        role="img"
        aria-label={t("chartLabel", {
          from: num(points[0]!.value, locale, 1),
          to: num(points.at(-1)!.value, locale, 1),
        })}
        className="block"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={LEFT} x2={width - RIGHT} y1={y(tick)} y2={y(tick)} stroke="var(--border)" />
            <text x={LEFT - 6} y={y(tick) + 4} textAnchor="end" className="fill-meta text-2xs">
              {num(tick, locale)}
            </text>
          </g>
        ))}
        <path
          d={linePath(xy)}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {xy.map(([cx, cy], i) => (
          <circle
            key={points[i]!.date}
            cx={cx}
            cy={cy}
            r={4}
            fill="var(--series-1)"
            stroke="var(--card)"
            strokeWidth={2}
          >
            <title>{`${dayMonthShort(points[i]!.date, locale)}: ${num(points[i]!.value, locale, 1)} cm`}</title>
          </circle>
        ))}
        <text x={LEFT} y={PLOT + AXIS - 3} className="fill-meta text-2xs">
          {dayMonthShort(first, locale)}
        </text>
        <text x={width - RIGHT} y={PLOT + AXIS - 3} textAnchor="end" className="fill-meta text-2xs">
          {dayMonthShort(points.at(-1)!.date, locale)}
        </text>
      </svg>
    </div>
  );
}
