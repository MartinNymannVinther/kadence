"use client";

import { useTranslations } from "next-intl";
import { durationText } from "@/components/training/duration";
import { drawPct, zoneFill, zoneOfTarget } from "@/components/workouts/step-zone";
import { cn } from "@/lib/utils";
import type { SessionTimeline } from "@/modules/rulle";
import { TRACE_SECONDS } from "./ride/trace";

const HEIGHT = 100;
/** The lowest top the drawing has, in percent of threshold power, as the builder's profile. */
const MIN_CEILING = 125;
const MAX_CEILING = 200;

/**
 * The session as the rider rides it, and the centre of Rulle's screen
 * (ADR 0032): every block from the first to the last, as wide as it is
 * long and as tall as it is hard, in the zone colours of the workout
 * builder's profile. A line moves across it; what is ridden is quieter
 * than what is ahead; the block under way is outlined; and the watts
 * actually ridden are drawn over the plan, when the rider's FTP puts
 * them on the same scale. Hand-drawn SVG (CLAUDE.md), stretched to its
 * box: the strokes keep their width, and the marker above is HTML so it
 * keeps its shape.
 */
export function IntervalBar({
  timeline,
  second,
  trace = [],
  ftp = null,
  className,
}: {
  timeline: SessionTimeline;
  /** Seconds into the plan. */
  second: number;
  /** The watts ridden, one average per TRACE_SECONDS of the plan. */
  trace?: readonly (number | null)[];
  ftp?: number | null;
  className?: string;
}) {
  const t = useTranslations("rulle.ride");
  const duration = useTranslations("training.duration");
  const total = Math.max(1, timeline.seconds);
  const pcts = timeline.blocks.map((b) => drawPct(b.target, b.intent));
  const ceiling = Math.min(MAX_CEILING, Math.max(MIN_CEILING, Math.max(0, ...pcts) * 1.1));
  const x = (s: number) => (Math.min(total, Math.max(0, s)) / total) * 1000;
  const y = (pct: number) => HEIGHT - (Math.min(ceiling, Math.max(0, pct)) / ceiling) * HEIGHT;
  const cursor = x(second);
  const current = timeline.blocks.findIndex((b) => second < b.to);
  const block = timeline.blocks[current];
  const line = ftp
    ? tracePath(
        trace,
        (i) => x((i + 0.5) * TRACE_SECONDS),
        (w) => y((w / ftp) * 100),
      )
    : "";

  return (
    <div className={cn("relative pt-3", className)}>
      <svg
        viewBox={`0 0 1000 ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={t("profile", {
          duration: durationText(total / 60, duration),
          elapsed: durationText(second / 60, duration),
        })}
        className="bg-secondary/40 block h-full w-full rounded-lg"
      >
        {timeline.blocks.map((b, i) => {
          const top = y(Math.max(20, pcts[i] ?? 0));
          return (
            <rect
              key={i}
              x={x(b.from)}
              y={top}
              width={Math.max(x(b.to) - x(b.from) - 1.5, 1)}
              height={HEIGHT - top}
              rx={1.5}
              style={{ fill: zoneFill(zoneOfTarget(b.target, b.intent)) }}
            />
          );
        })}
        <rect
          x={0}
          y={0}
          width={cursor}
          height={HEIGHT}
          style={{ fill: "var(--card)" }}
          opacity={0.55}
        />
        {block && (
          <rect
            x={x(block.from)}
            y={y(Math.max(20, pcts[current] ?? 0))}
            width={Math.max(x(block.to) - x(block.from) - 1.5, 1)}
            height={HEIGHT - y(Math.max(20, pcts[current] ?? 0))}
            rx={1.5}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
        )}
        <line
          x1={0}
          x2={1000}
          y1={y(100)}
          y2={y(100)}
          stroke="var(--meta)"
          strokeDasharray="6 6"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          opacity={0.7}
        />
        {line && (
          <path
            d={line}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth={3}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <line
          x1={cursor}
          x2={cursor}
          y1={0}
          y2={HEIGHT}
          stroke="var(--foreground)"
          strokeWidth={4}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 20 12"
        className="text-foreground absolute top-0 h-3 w-5 -translate-x-1/2"
        style={{ left: `${cursor / 10}%` }}
      >
        <path d="M0 0 H20 L10 12 Z" fill="currentColor" />
      </svg>
    </div>
  );
}

/** The ridden watts as one path, broken where a stretch has no reading. */
function tracePath(
  trace: readonly (number | null)[],
  xOf: (index: number) => number,
  yOf: (watts: number) => number,
): string {
  let d = "";
  let pen = false;
  // By index: a skipped block leaves holes in the array, and forEach would step over them.
  for (let i = 0; i < trace.length; i++) {
    const watts = trace[i];
    if (watts === null || watts === undefined) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${xOf(i).toFixed(1)} ${yOf(watts).toFixed(1)} `;
    pen = true;
  }
  return d.trim();
}
