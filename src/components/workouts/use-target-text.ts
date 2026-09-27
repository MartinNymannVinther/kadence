"use client";

import { useTranslations } from "next-intl";
import { targetRange, type Thresholds } from "@/modules/load";
import type { Target } from "@/modules/workouts/structure";
import { rpeText } from "@/components/training/rpe";

/**
 * A target in words, and — when the rider's thresholds are known — in
 * the watts and beats it comes to for them (src/modules/load/zones.ts):
 * "Zone 4 · tærskel" and "228–263 W · 160–168 slag/min". Zone 1 has no
 * floor worth naming and zone 7 no ceiling, so they read "op til" and
 * "over".
 */
export function useTargetText() {
  const t = useTranslations("workouts.view");
  const zones = useTranslations("training.zone");
  const rpe = useTranslations("training.rpe");

  return function targetText(target: Target, rider: Thresholds | null) {
    const main =
      target.kind === "zone"
        ? t("zone", { zone: target.zone, name: zones(String(target.zone)) })
        : target.kind === "ftp_pct"
          ? t("ftpPct", { low: target.low, high: target.high })
          : target.kind === "hr_pct"
            ? t("hrPct", { low: target.low, high: target.high })
            : target.kind === "rpe"
              ? t("rpe", { value: rpeText(target.value, (key) => rpe(key as "1")) })
              : t("open");
    const range = rider ? targetRange(target, rider) : null;
    const zone = target.kind === "zone" ? target.zone : null;
    const parts: string[] = [];
    for (const [unit, band] of [
      ["watts", range?.watts],
      ["bpm", range?.bpm],
    ] as const) {
      if (!band) continue;
      if (zone === 1) parts.push(t(`${unit}UpTo`, { high: band.high }));
      else if (zone === 7) parts.push(t(`${unit}From`, { low: band.low }));
      else if (band.low === band.high) parts.push(t(`${unit}One`, { value: band.low }));
      else parts.push(t(unit, { low: band.low, high: band.high }));
    }
    return { main, detail: parts.length > 0 ? parts.join(" · ") : null };
  };
}
