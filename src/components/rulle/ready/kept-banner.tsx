"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { durationText } from "@/components/training/duration";
import { totals } from "@/modules/rulle";
import type { KeptRide } from "../ride/ride-store";

/**
 * A ride this device kept that Kadence does not have yet: one that ended
 * while the connection was gone, or one a closed tab or a crash cut off.
 * It is offered back, to be saved as it is or thrown away — the latter
 * behind a question, since nothing else has a copy.
 */
export function KeptBanner({
  kept,
  onSave,
  onDiscard,
}: {
  kept: KeptRide;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const t = useTranslations("rulle.kept");
  const duration = useTranslations("training.duration");
  const locale = useLocale();
  const when = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Copenhagen",
  }).format(kept.recording.startedAt);
  const minutes = totals(kept.recording).timerSeconds / 60;

  return (
    <div role="status" className="bg-sticky text-sticky-ink flex flex-col gap-3 rounded-xl p-4">
      <p className="text-reading leading-relaxed">
        {kept.state === "finished"
          ? t("waiting", { when })
          : t("unfinished", { when, duration: durationText(minutes, duration) })}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button className="max-sm:h-11" onClick={onSave}>
          {t("save")}
        </Button>
        <ConfirmButton
          title={t("discardTitle")}
          body={t("discardBody")}
          confirmLabel={t("discard")}
          onConfirm={onDiscard}
          variant="ghost"
          size="default"
        >
          {t("discard")}
        </ConfirmButton>
      </div>
    </div>
  );
}
