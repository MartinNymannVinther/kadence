"use client";

import { Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { WellbeingZone } from "@/modules/load/wellbeing";
import { cn } from "@/lib/utils";
import type { CheckinValues } from "./checkin-card";
import { reasonSentence, resultParts, usualSentence } from "./checkin-why";
import { ZONE_STYLE } from "./zone-style";

/**
 * Today's check-in, answered: the zone in its tint, icon and word; for
 * yellow and red first why, in the rider's own answers ("Du sov under 6
 * timer i nat."), then one kind sentence and what happens next — in a
 * club, that the coach sees it; in a personal workspace there is no coach
 * to name (docs/adr/0097). A known pain that hurt as usual is said not to
 * colour the day. Advice for being ill or in pain follows ATK and the
 * parents' guide: never train ill, and pain at the top of the ladder waits
 * for a physiotherapist or a doctor; a known pain at its usual level
 * brings no advice to cut training down.
 */
export function CheckinResult({
  zone,
  values,
  club,
  onEdit,
}: {
  zone: WellbeingZone;
  values: CheckinValues;
  club: boolean;
  onEdit: () => void;
}) {
  const t = useTranslations("checkin");
  const why = useTranslations("checkin.why");
  const zones = useTranslations("wellbeing.zone");
  const locale = useLocale();
  const style = ZONE_STYLE[zone];
  const Icon = style.icon;
  const parts = resultParts(values, zone, club);
  const reasons = parts.reasons.map((r) => reasonSentence(r, why, locale));
  const usual = parts.usual;
  const advice = parts.advice.map((key) => t(key));

  return (
    <section
      aria-live="polite"
      className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-surface sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{t("doneTitle")}</h3>
        <span
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold",
            style.chip,
          )}
        >
          <Icon aria-hidden className="size-3.5" />
          {zones(zone)}
        </span>
      </div>
      {reasons.length > 0 && (
        <ul className="flex flex-col gap-1">
          {reasons.map((line) => (
            <li key={line} className="text-reading leading-relaxed font-medium">
              {line}
            </li>
          ))}
        </ul>
      )}
      <p className={cn("leading-relaxed", reasons.length > 0 ? "text-2sm" : "text-reading")}>
        {t(`result.${zone}`)}
      </p>
      {usual.length > 0 && (
        <p className="text-meta text-2sm leading-relaxed">{usualSentence(usual, why, locale)}</p>
      )}
      {parts.coachLine && <p className="text-2sm leading-relaxed">{t("next")}</p>}
      {advice.map((line) => (
        <p key={line} className="text-2sm leading-relaxed font-medium">
          {line}
        </p>
      ))}
      <Button type="button" variant="outline" className="self-start max-sm:h-11" onClick={onEdit}>
        <Pencil data-icon="inline-start" />
        {t("edit")}
      </Button>
    </section>
  );
}
