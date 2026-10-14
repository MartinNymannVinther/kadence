import { useTranslations } from "next-intl";
import { CheckinCard, type CheckinValues } from "@/components/wellbeing/checkin-card";
import type { ZoneDay } from "@/components/wellbeing/zone-days";
import { ZoneStrip } from "@/components/wellbeing/zone-strip";
import type { KnownPainView } from "@/modules/wellbeing/known-pains";
import type { CheckinStart } from "@/modules/wellbeing/prefill";

/**
 * The rider's check-in on today's page: the card, and — where it is asked
 * for, on Mig — the last two weeks of zones under it, so a rider sees
 * their own pattern before anyone else does.
 */
export function CheckinSection({
  riderId,
  today,
  initial,
  start,
  knownPains,
  club,
  days,
}: {
  riderId: string;
  today: string;
  initial: CheckinValues | null;
  /** Where a new check-in starts: the three first questions blank, the rest from the last. */
  start: CheckinStart;
  /** The rider's known pains (docs/adr/0097). */
  knownPains: KnownPainView[];
  /** A club, where a coach reads the check-in. */
  club: boolean;
  /** The last two weeks under the card; Today leaves them to Mig. */
  days?: ZoneDay[];
}) {
  const t = useTranslations("wellbeing");
  return (
    <section aria-labelledby="rider-checkin" className="flex flex-col gap-3">
      <h2 id="rider-checkin" className="sr-only">
        {t("title")}
      </h2>
      <CheckinCard
        riderId={riderId}
        today={today}
        initial={initial}
        start={start}
        knownPains={knownPains}
        club={club}
      />
      {days && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t("stripTitle")}</h3>
          <ZoneStrip days={days} today={today} />
        </div>
      )}
    </section>
  );
}
