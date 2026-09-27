import { useTranslations } from "next-intl";
import { ComplianceMark } from "@/components/training/compliance-mark";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import type { CalendarActivityCard } from "./types";

/**
 * Something ridden or trained that nobody planned: shown neutral, because
 * riding without a plan is not a failure (src/modules/load/compliance.ts).
 */
export function ActivityChip({ activity }: { activity: CalendarActivityCard }) {
  const sports = useTranslations("training.sport");
  const duration = useTranslations("training.duration");
  return (
    <div className="bg-secondary/60 border-border flex min-w-0 flex-col gap-1 rounded-lg border border-l-4 border-l-chart-3 p-2.5">
      <span className="flex min-w-0 items-center gap-1.5 text-2sm font-medium">
        <SportIcon sport={activity.sport} className="size-3.5" />
        <span className="truncate">{activity.title || sports(activity.sport as "bike")}</span>
      </span>
      <span className="text-meta text-xs tabular-nums">
        {durationText(activity.movingSeconds / 60, duration)}
      </span>
      <ComplianceMark colour="none" done />
    </div>
  );
}
