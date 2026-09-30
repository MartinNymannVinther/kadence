"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { gradeHere, type Course } from "@/modules/rulle";

/**
 * The road under the wheels, in the corner of the picture opposite the
 * little map: the climb's or the descent's percent where there is one —
 * from 2 %, as a bike computer reads it (`gradeHere`) — and the speed,
 * when the rider has asked for it. The speed is the route's for the
 * rider's watts and a standard rider's mass (ADR 0033), so it is a guide,
 * not a measure. Nothing shows on the flat with the speed hidden.
 */
export function RoadCard({
  course,
  distance,
  speed,
  speedShown,
}: {
  course: Course;
  distance: number;
  /** Metres a second. */
  speed: number;
  speedShown: boolean;
}) {
  const t = useTranslations("rulle.ride");
  const pct = Math.round(gradeHere(course, distance) * 100);
  const hill = Math.abs(pct) >= 2;
  if (!hill && !speedShown) return null;
  const Icon = pct > 0 ? TrendingUp : TrendingDown;
  return (
    <div className="bg-card/85 border-border pointer-events-none absolute bottom-3 left-3 flex gap-6 rounded-xl border px-4 py-2.5 shadow-[var(--surface-shadow)] sm:left-4 lg:left-6 lg:px-5">
      {hill && (
        <div className="flex flex-col gap-1">
          <span className="text-ride-label leading-tight font-medium tracking-wide uppercase opacity-80">
            {t(pct > 0 ? "climb" : "descent")}
          </span>
          <span className="text-ride-value flex items-center gap-2 leading-none font-semibold tabular-nums">
            <Icon aria-hidden className="size-[0.8em]" strokeWidth={2.5} />
            {t("percent", { pct: pct > 0 ? String(pct) : `−${-pct}` })}
          </span>
        </div>
      )}
      {speedShown && (
        <div className="flex flex-col gap-1">
          <span className="text-ride-label leading-tight font-medium tracking-wide uppercase opacity-80">
            {t("speed")}
          </span>
          <span className="text-ride-value leading-none font-semibold tabular-nums">
            {Math.round(speed * 3.6)}{" "}
            <span className="text-ride-label font-medium">{t("speedUnit")}</span>
          </span>
        </div>
      )}
    </div>
  );
}
