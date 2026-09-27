"use client";

import { useTranslations } from "next-intl";
import { linePath } from "@/components/charts/scale";
import { useWidth } from "@/components/charts/use-width";
import { projectRoute } from "./route-geometry";

const MAX_HEIGHT = 360;

/**
 * The ride's route, drawn from its GPS positions alone: no map tiles, so
 * no position of a young rider is sent to a map service (dogmas 2 and 4).
 * Start and finish are marked, and `at` — the sample the streams chart is
 * being read at — shows where the rider was at that moment.
 */
export function RouteMap({
  lat,
  lon,
  at,
  km,
}: {
  lat: (number | null)[];
  lon: (number | null)[];
  at: number | null;
  km: string;
}) {
  const t = useTranslations("activities.route");
  const { ref, width } = useWidth<HTMLDivElement>();
  const route = projectRoute(lat, lon, width, MAX_HEIGHT);
  if (!route) return <p className="text-meta text-2sm">{t("none")}</p>;

  const solid = route.points.filter((p): p is readonly [number, number] => p !== null);
  const start = solid[0]!;
  const finish = solid.at(-1)!;
  const here = at === null ? null : nearestFix(route.points, at);

  return (
    <div ref={ref} className="border-border bg-card w-full overflow-hidden rounded-lg border">
      <svg
        width="100%"
        height={route.height}
        viewBox={`0 0 ${width} ${route.height}`}
        role="img"
        aria-label={t("label", { km })}
        className="block"
      >
        <path
          d={linePath(route.points)}
          fill="none"
          stroke="var(--card)"
          strokeWidth={6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={linePath(route.points)}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={finish[0]}
          cy={finish[1]}
          r={6}
          fill="var(--card)"
          stroke="var(--foreground)"
          strokeWidth={2.5}
        >
          <title>{t("finish")}</title>
        </circle>
        <circle
          cx={start[0]}
          cy={start[1]}
          r={5}
          fill="var(--series-1)"
          stroke="var(--card)"
          strokeWidth={2}
        >
          <title>{t("start")}</title>
        </circle>
        {here && (
          <circle
            cx={here[0]}
            cy={here[1]}
            r={7}
            fill="var(--series-2)"
            stroke="var(--card)"
            strokeWidth={2.5}
            aria-hidden
          />
        )}
      </svg>
    </div>
  );
}

/** The point at `index`, or the nearest one before it with a fix. */
function nearestFix(
  points: ReadonlyArray<readonly [number, number] | null>,
  index: number,
): readonly [number, number] | null {
  for (let i = Math.min(index, points.length - 1); i >= 0; i--) {
    const p = points[i];
    if (p) return p;
  }
  return null;
}
