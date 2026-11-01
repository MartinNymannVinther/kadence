import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { GarminLine } from "@/components/devices/garmin-attribution";
import { ComplianceMark } from "@/components/training/compliance-mark";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { Link } from "@/i18n/navigation";
import { rideNameText, type RideName } from "@/modules/activities/ride-name";

export type TodayRide = {
  id: string;
  name: RideName;
  sport: string;
  movingSeconds: number;
  distanceM: number | null;
  attribution: string | null;
};

/**
 * A ride from today that no session claims, on the rider's Today: shown
 * neutral like the calendar's card for it, because riding without a plan
 * is not a failure (src/modules/load/compliance.ts). It opens the ride's
 * own page; a ride from Garmin says so under its name.
 */
export function TodayRideCard({ ride }: { ride: TodayRide }) {
  const names = useTranslations("activities.names");
  const duration = useTranslations("training.duration");
  const t = useTranslations("today.rider");
  const locale = useLocale();
  return (
    <article className="bg-card border-border border-l-chart-3 flex flex-col gap-1.5 rounded-xl border border-l-4 p-4 shadow-surface">
      <Link
        href={`/activities/${ride.id}`}
        className="focus-ring hover:text-primary flex items-center gap-2 text-lg leading-snug font-semibold"
      >
        <SportIcon sport={ride.sport} className="size-4 shrink-0" />
        {rideNameText(ride.name, names)}
      </Link>
      <GarminLine line={ride.attribution} className="break-words" />
      <p className="text-meta flex flex-wrap items-center gap-x-3 gap-y-1 text-2sm tabular-nums">
        <span>{durationText(ride.movingSeconds / 60, duration)}</span>
        {ride.distanceM ? (
          <span>{t("km", { km: num(ride.distanceM / 1000, locale, 1) })}</span>
        ) : null}
        <ComplianceMark colour="none" done />
      </p>
    </article>
  );
}
