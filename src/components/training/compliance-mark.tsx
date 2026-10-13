import {
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CircleX,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { compliance, type ComplianceColour, type LoadMethod } from "@/modules/load";
import { cn } from "@/lib/utils";

/**
 * How a session went against its plan, in the load model's colours
 * (src/modules/load/compliance.ts) — and always with an icon and a word
 * beside the colour, so nobody has to tell green from red to read it.
 */

export type PlannedLike = {
  onDate: string;
  plannedMinutes: number;
  plannedLoad: number | null;
  /** `loadMethod` decides whether the load counts: one from RPE alone only when far off (compliance.ts). */
  activity: { movingSeconds: number; load: number | null; loadMethod?: string | null } | null;
};

export function colourOf(session: PlannedLike, today: string): ComplianceColour {
  const done = session.activity
    ? {
        minutes: session.activity.movingSeconds / 60,
        load: session.activity.load,
        method: (session.activity.loadMethod ?? null) as LoadMethod | null,
      }
    : null;
  return compliance(
    { minutes: session.plannedMinutes, load: session.plannedLoad },
    done,
    session.onDate,
    today,
  );
}

/** Tinted ground, dark ink, and the edge a card is marked with (2a: states are tints, never solids). */
export const COLOUR_STYLE: Record<
  ComplianceColour,
  { chip: string; edge: string; icon: LucideIcon }
> = {
  green: { chip: "bg-success-tint text-success", edge: "border-l-success", icon: CircleCheck },
  yellow: { chip: "bg-sticky text-sticky-ink", edge: "border-l-zone-4", icon: CircleAlert },
  red: { chip: "bg-warning-tint text-destructive", edge: "border-l-destructive", icon: CircleX },
  grey: { chip: "bg-muted text-meta", edge: "border-l-input", icon: Circle },
  none: { chip: "bg-muted text-meta", edge: "border-l-chart-3", icon: CircleDot },
};

/** The word for a colour: red is "missed" when nothing was done, "far off" when something was. */
export function stateKey(colour: ComplianceColour, done: boolean, isToday: boolean): string {
  switch (colour) {
    case "green":
      return "asPlanned";
    case "yellow":
      return "offPlan";
    case "red":
      return done ? "farOff" : "missed";
    case "grey":
      return isToday ? "today" : "planned";
    case "none":
      return "unplanned";
  }
}

export function ComplianceMark({
  colour,
  done,
  isToday = false,
  compact = false,
  className,
}: {
  colour: ComplianceColour;
  done: boolean;
  isToday?: boolean;
  /** Icon only; the word is still there for a screen reader. */
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("training.state");
  const style = COLOUR_STYLE[colour];
  const Icon = style.icon;
  const word = t(stateKey(colour, done, isToday) as "planned");
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full text-2xs font-medium whitespace-nowrap",
        compact ? "size-5 justify-center" : "h-5 px-2",
        style.chip,
        className,
      )}
      title={compact ? word : undefined}
    >
      <Icon aria-hidden className="size-3" />
      {compact ? <span className="sr-only">{word}</span> : word}
    </span>
  );
}
