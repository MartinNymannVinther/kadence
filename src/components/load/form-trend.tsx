"use client";

import { useTranslations } from "next-intl";
import { areaPath, linePath, linearScale } from "@/components/charts/scale";
import { useWidth } from "@/components/charts/use-width";
import { formState, FITNESS_COLOUR } from "./form-state";
import type { LoadPoint } from "./load-chart";

const HEIGHT = 56;

/** Where the last four weeks went, and how the rider is today: words a parent can use. Pure. */
export function formWords(
  days: LoadPoint[],
): { trend: "up" | "flat" | "down"; now: "rested" | "tired" | "veryTired" } | null {
  const last = days.at(-1);
  const before = days.at(-29);
  if (!last || !before) return null;
  const change = last.fitness - before.fitness;
  const trend = change > 3 ? "up" : change < -3 ? "down" : "flat";
  return { trend, now: formState(last.form) };
}

/**
 * The parents' view of the load (ADR 0011: they see the training the rider
 * shares): the fitness line alone, no numbers, and two sentences — which
 * way the last four weeks went, and whether the rider is rested or tired
 * today. The coach's chart has the rest; a parent is not a second coach.
 */
export function FormTrend({ days, name }: { days: LoadPoint[]; name: string }) {
  const t = useTranslations("load.trend");
  const { ref, width } = useWidth<HTMLDivElement>(480);
  const words = formWords(days);
  const peak = Math.max(10, ...days.map((d) => d.fitness));
  const x = linearScale([0, Math.max(1, days.length - 1)], [2, width - 2]);
  const y = linearScale([0, peak], [HEIGHT - 2, 4]);
  const points = days.map((d, i) => [x(i), y(d.fitness)] as const);
  return (
    <div className="flex flex-col gap-2">
      <div ref={ref} className="w-full">
        <svg
          width="100%"
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={t("label")}
          className="block"
        >
          <path d={areaPath(points, HEIGHT - 2)} fill={FITNESS_COLOUR} opacity={0.1} />
          <path
            d={linePath(points)}
            fill="none"
            stroke={FITNESS_COLOUR}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <line x1={0} x2={width} y1={HEIGHT - 1} y2={HEIGHT - 1} stroke="var(--border)" />
        </svg>
      </div>
      {words && (
        <p className="text-2sm leading-relaxed">
          {t(words.trend)} {t(words.now, { name })}
        </p>
      )}
    </div>
  );
}
