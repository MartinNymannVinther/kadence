import { useTranslations } from "next-intl";
import { CheckinCard, type CheckinValues } from "@/components/wellbeing/checkin-card";
import type { ZoneDay } from "@/components/wellbeing/zone-days";
import { ZoneStrip } from "@/components/wellbeing/zone-strip";

/**
 * The rider's check-in on today's page: the card, and the last two weeks
 * of zones under it, so a rider sees their own pattern before anyone else
 * does.
 */
export function CheckinSection({
  riderId,
  today,
  initial,
  days,
}: {
  riderId: string;
  today: string;
  initial: CheckinValues | null;
  days: ZoneDay[];
}) {
  const t = useTranslations("wellbeing");
  return (
    <section aria-labelledby="rider-checkin" className="flex flex-col gap-3">
      <h2 id="rider-checkin" className="sr-only">
        {t("title")}
      </h2>
      <CheckinCard riderId={riderId} today={today} initial={initial} />
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t("stripTitle")}</h3>
        <ZoneStrip days={days} today={today} />
      </div>
    </section>
  );
}
