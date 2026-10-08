"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { WellbeingZone } from "@/modules/load/wellbeing";
import { cn } from "@/lib/utils";
import type { CheckinValues } from "./checkin-card";
import { ZONE_STYLE } from "./zone-style";

/**
 * Today's check-in, answered: the zone in its tint, icon and word, one kind
 * sentence, and — for yellow and red — what happens next. Advice for being
 * ill or in pain follows ATK and the parents' guide: never train ill, and
 * pain at the top of the ladder waits for a physiotherapist or a doctor.
 */
export function CheckinResult({
  zone,
  values,
  onEdit,
}: {
  zone: WellbeingZone;
  values: CheckinValues;
  onEdit: () => void;
}) {
  const t = useTranslations("checkin");
  const zones = useTranslations("wellbeing.zone");
  const style = ZONE_STYLE[zone];
  const Icon = style.icon;
  const advice = [
    values.ill ? t("illAdvice") : null,
    values.pain >= 3 ? t("pain3Advice") : values.pain === 2 ? t("pain2Advice") : null,
  ].filter(Boolean);

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
      <p className="text-reading leading-relaxed">{t(`result.${zone}`)}</p>
      {zone !== "green" && <p className="text-2sm leading-relaxed">{t("next")}</p>}
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
