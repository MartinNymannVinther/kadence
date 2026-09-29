"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Course } from "@/modules/rulle";

const HEIGHT = 100;
/** Samples drawn across the width: enough for any hill, few enough for a phone. */
const POINTS = 400;

/**
 * The route's height over one lap, with the rider on it: what the bar
 * shows on a ride without a session, and beside the route before one.
 * Hand-drawn SVG; the hills are drawn a little taller than they are, so a
 * Danish climb of 80 metres still reads as a climb.
 */
export function RouteProfile({
  course,
  along = null,
  lap = 0,
  className,
}: {
  course: Course;
  /** Metres into the lap where the rider is, or null before the ride. */
  along?: number | null;
  lap?: number;
  className?: string;
}) {
  const t = useTranslations("rulle.ride");
  const locale = useLocale();
  const km = (m: number) =>
    new Intl.NumberFormat(locale === "en" ? "en-GB" : "da-DK", { maximumFractionDigits: 1 }).format(
      m / 1000,
    );
  const span = Math.max(30, course.maxEle - course.minEle);
  const floor = course.minEle - span * 0.35;
  const top = course.minEle + span * 1.15;
  const y = (ele: number) => HEIGHT - ((ele - floor) / (top - floor)) * HEIGHT;
  const n = course.ele.length;
  let d = `M0 ${HEIGHT}`;
  for (let i = 0; i <= POINTS; i++) {
    const index = Math.min(n - 1, Math.round((i / POINTS) * (n - 1)));
    d += ` L${((i / POINTS) * 1000).toFixed(1)} ${y(course.ele[index]!).toFixed(1)}`;
  }
  d += ` L1000 ${HEIGHT} Z`;
  const cursor = along === null ? null : (along / course.length) * 1000;

  return (
    <div className={cn("relative pt-3", className)}>
      <svg
        viewBox={`0 0 1000 ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={t("routeProfile", {
          km: km(course.length),
          along: km(along ?? 0),
          lap: lap + 1,
        })}
        className="bg-secondary/40 block h-full w-full rounded-lg"
      >
        <path d={d} style={{ fill: "var(--zone-2)" }} />
        {cursor !== null && (
          <>
            <rect
              x={0}
              y={0}
              width={cursor}
              height={HEIGHT}
              style={{ fill: "var(--card)" }}
              opacity={0.45}
            />
            <line
              x1={cursor}
              x2={cursor}
              y1={0}
              y2={HEIGHT}
              stroke="var(--foreground)"
              strokeWidth={4}
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>
      {cursor !== null && (
        <svg
          aria-hidden
          viewBox="0 0 20 12"
          className="text-foreground absolute top-0 h-3 w-5 -translate-x-1/2"
          style={{ left: `${cursor / 10}%` }}
        >
          <path d="M0 0 H20 L10 12 Z" fill="currentColor" />
        </svg>
      )}
    </div>
  );
}
