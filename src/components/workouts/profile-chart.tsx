"use client";

import { useTranslations } from "next-intl";
import { flattenSteps, type BikeStructure } from "@/modules/workouts/structure";
import { cn } from "@/lib/utils";
import { clockText, durationText } from "@/components/training/duration";
import { drawPct, zoneFill, zoneOfTarget } from "./step-zone";

const HEIGHT = 100;
/** The lowest top the drawing has, in percent of threshold power, so threshold never sits at the edge. */
const MIN_CEILING = 125;
/** The highest: a sprint reaches it, and nothing is drawn taller. */
const MAX_CEILING = 200;

/**
 * A bike session as a picture: one bar per step in riding order, as wide
 * as it is long and as tall as it is hard, coloured by zone, with a dashed
 * line at threshold. Hand-drawn SVG (CLAUDE.md); each bar names itself for
 * a pointer, and the whole says what it shows for a screen reader.
 */
export function ProfileChart({
  structure,
  className,
}: {
  structure: BikeStructure;
  className?: string;
}) {
  const t = useTranslations("workouts.profile");
  const intents = useTranslations("workouts.intent");
  const duration = useTranslations("training.duration");
  const steps = flattenSteps(structure);
  const total = steps.reduce((sum, s) => sum + s.seconds, 0);

  if (steps.length === 0 || total === 0) {
    return (
      <div
        className={cn(
          "border-input text-meta flex h-20 items-center rounded-lg border border-dashed px-3 text-xs",
          className,
        )}
      >
        {t("empty")}
      </div>
    );
  }

  // The drawing is as tall as the hardest step, so an easy ride does not
  // shrink to a sliver under empty space.
  const pcts = steps.map((step) => drawPct(step.target, step.intent));
  const ceiling = Math.min(MAX_CEILING, Math.max(MIN_CEILING, Math.max(...pcts) * 1.1));
  // Where each bar starts: the seconds ridden before it, as a share of the whole.
  const starts = steps.reduce<number[]>(
    (acc, step, i) => [...acc, (acc[i] ?? 0) + (step.seconds / total) * 1000],
    [0],
  );
  const bars = steps.map((step, i) => {
    const pct = Math.min(ceiling, Math.max(20, pcts[i] ?? 0));
    return {
      key: i,
      x: starts[i] ?? 0,
      width: (step.seconds / total) * 1000,
      height: (pct / ceiling) * HEIGHT,
      fill: zoneFill(zoneOfTarget(step.target, step.intent)),
      title: `${intents(step.intent)} · ${clockText(step.seconds)}`,
    };
  });
  const threshold = HEIGHT - (100 / ceiling) * HEIGHT;

  return (
    <svg
      viewBox={`0 0 1000 ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={t("label", {
        steps: steps.length,
        duration: durationText(total / 60, duration),
      })}
      className={cn("bg-secondary/40 block h-20 w-full rounded-lg", className)}
    >
      {bars.map((bar) => (
        <rect
          key={bar.key}
          x={bar.x}
          y={HEIGHT - bar.height}
          width={Math.max(bar.width - 1.5, 1)}
          height={bar.height}
          rx={1.5}
          style={{ fill: bar.fill }}
        >
          <title>{bar.title}</title>
        </rect>
      ))}
      <line
        x1={0}
        x2={1000}
        y1={threshold}
        y2={threshold}
        stroke="var(--meta)"
        strokeDasharray="4 4"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        opacity={0.6}
      />
    </svg>
  );
}
