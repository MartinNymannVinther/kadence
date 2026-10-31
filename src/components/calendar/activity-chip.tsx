import { useTranslations } from "next-intl";
import { GarminLine } from "@/components/devices/garmin-attribution";
import { ComplianceMark } from "@/components/training/compliance-mark";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { Link } from "@/i18n/navigation";
import { rideNameText } from "@/modules/activities/ride-name";
import type { CalendarActivityCard } from "./types";

/**
 * Something ridden or trained that nobody planned: shown neutral, because
 * riding without a plan is not a failure (src/modules/load/compliance.ts).
 * It opens the activity's own page.
 */
export function ActivityChip({ activity }: { activity: CalendarActivityCard }) {
  const names = useTranslations("activities.names");
  const duration = useTranslations("training.duration");
  return (
    <Link
      href={`/activities/${activity.id}`}
      className="focus-ring bg-secondary/60 border-border hover:bg-secondary flex min-w-0 flex-col gap-1 rounded-lg border border-l-4 border-l-chart-3 p-2.5"
    >
      <span className="flex min-w-0 items-center gap-1.5 text-2sm font-medium">
        <SportIcon sport={activity.sport} className="size-3.5" />
        <span className="truncate">{rideNameText(activity.name, names)}</span>
      </span>
      <GarminLine line={activity.attribution} className="leading-tight break-words" />
      <span className="text-meta text-xs tabular-nums">
        {durationText(activity.movingSeconds / 60, duration)}
      </span>
      <ComplianceMark colour="none" done />
    </Link>
  );
}
