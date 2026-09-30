"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { courseAt, type Course } from "@/modules/rulle";

/**
 * The little map of the route (ADR 0035), north up, drawn by hand in SVG:
 * the lap in grey, the part of it ridden in moss, the start — a finish,
 * checkered, on a race's course — and where the rider is. For the corner
 * of the picture: what a rider reads is the numbers and the bar.
 */

const SIZE = 100;
const PAD = 8;

export function RouteMap({
  course,
  distance,
  finish,
  className,
}: {
  course: Course;
  /** Metres ridden since the start, laps and all. */
  distance: number;
  finish: boolean;
  className?: string;
}) {
  const t = useTranslations("rulle.ride");
  const fit = useMemo(() => {
    const n = course.x.length;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      minX = Math.min(minX, course.x[i]!);
      maxX = Math.max(maxX, course.x[i]!);
      minY = Math.min(minY, course.y[i]!);
      maxY = Math.max(maxY, course.y[i]!);
    }
    const scale = (SIZE - 2 * PAD) / Math.max(maxX - minX, maxY - minY, 1);
    const ox = (SIZE - (maxX - minX) * scale) / 2;
    const oy = (SIZE - (maxY - minY) * scale) / 2;
    // North up: the course's y grows north, the picture's down.
    const at = (x: number, y: number) =>
      [ox + (x - minX) * scale, SIZE - (oy + (y - minY) * scale)] as const;
    const every = Math.max(1, Math.floor(n / 400));
    const points: (readonly [number, number])[] = [];
    for (let i = 0; i < n; i += every) points.push(at(course.x[i]!, course.y[i]!));
    points.push(at(course.x[0]!, course.y[0]!));
    return { at, points, every };
  }, [course]);

  const along = distance - Math.floor(distance / course.length) * course.length;
  const here = courseAt(course, distance);
  const [hx, hy] = fit.at(here.x, here.y);
  const ridden = fit.points.slice(0, Math.floor(along / course.step / fit.every) + 1);
  const line = (points: (readonly [number, number])[]) =>
    points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const [sx, sy] = fit.points[0]!;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={t("map")} className={className}>
      <path
        d={line(fit.points)}
        fill="none"
        className="stroke-muted-foreground/45"
        strokeWidth={3.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={line([...ridden, [hx, hy]])}
        fill="none"
        className="stroke-primary"
        strokeWidth={3.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {finish ? (
        // A finish flag, checkered.
        <g transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)})`}>
          <rect
            x={-4}
            y={-4}
            width={8}
            height={8}
            className="fill-card stroke-foreground"
            strokeWidth={0.8}
          />
          <rect x={-4} y={-4} width={4} height={4} className="fill-foreground" />
          <rect x={0} y={0} width={4} height={4} className="fill-foreground" />
        </g>
      ) : (
        <circle cx={sx} cy={sy} r={3} className="fill-card stroke-foreground" strokeWidth={1} />
      )}
      <circle cx={hx} cy={hy} r={4.6} className="fill-primary stroke-card" strokeWidth={1.8} />
    </svg>
  );
}
