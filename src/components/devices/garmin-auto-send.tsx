"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { SwitchRow } from "@/components/team/switch-row";
import { setAutoSendAction } from "@/modules/devices/actions";

/**
 * "Send mine pas til Garmin af sig selv" on the rider's own Garmin card
 * (docs/adr/0114): the rider's choice and nobody else's, on by default.
 * Without Garmin's permission to take workouts the switch rests and the
 * card says what to do in Garmin Connect; until Kadence knows, it says so.
 */
export function GarminAutoSend({ on, allowed }: { on: boolean; allowed: boolean | null }) {
  const t = useTranslations("devices.autoSend");
  const { run, pending } = useRun();
  const [value, setValue] = useState(on);

  async function change(next: boolean) {
    setValue(next);
    const saved = await run(() => setAutoSendAction({ provider: "garmin", on: next }), {
      success: next ? t("turnedOn") : t("turnedOff"),
    });
    if (saved === null) setValue(!next);
  }

  return (
    <div className="border-border flex flex-col gap-2 border-t pt-1">
      <SwitchRow
        label={t("label")}
        hint={t("hint")}
        checked={value && allowed !== false}
        disabled={pending || allowed === false}
        stateText={value && allowed !== false ? t("on") : t("off")}
        onChange={(next) => void change(next)}
      />
      {allowed === false && (
        <p className="bg-warning-tint rounded-md px-3 py-2 text-2sm leading-relaxed">
          {t("noPermission")}
        </p>
      )}
      {allowed === null && (
        <p className="text-meta text-xs leading-relaxed">{t("unknownPermission")}</p>
      )}
    </div>
  );
}
