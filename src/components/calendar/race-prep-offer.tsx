"use client";

import { Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { weekdayLong } from "@/components/training/day-label";
import { Button } from "@/components/ui/button";
import { addDaysIso } from "@/core/dates";

/**
 * A race's race prep, offered where the race is opened (docs/adr/0106):
 * what the day before holds, and a button that opens "Tilføj pas" on that
 * day with the race prep built, for the coach to change and lay in.
 */
export function RacePrepOffer({ startsOn, onPrep }: { startsOn: string; onPrep: () => void }) {
  const t = useTranslations("calendar.event.racePrep");
  const locale = useLocale();
  return (
    <section className="bg-accent/40 flex flex-col gap-2 rounded-lg border p-3 text-2sm">
      <h3 className="font-medium">{t("title")}</h3>
      <p className="text-meta">{t("body")}</p>
      <Button type="button" variant="outline" className="self-start max-sm:h-11" onClick={onPrep}>
        <Zap data-icon="inline-start" />
        {t("add", { day: weekdayLong(addDaysIso(startsOn, -1), locale) })}
      </Button>
    </section>
  );
}
