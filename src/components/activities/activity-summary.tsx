import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { durationText } from "@/components/training/duration";

export type ActivityFacts = {
  movingSeconds: number;
  elapsedSeconds: number | null;
  distanceM: number | null;
  ascentM: number | null;
  avgPower: number | null;
  weightedPower: number | null;
  maxPower: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgCadence: number | null;
  maxSpeed: number | null;
  hrDrift: number | null;
  workKj: number | null;
  load: number | null;
  loadMethod: string;
};

/**
 * What a ride or a session came to, in tiles: time, distance, speed,
 * climbing, watt, pulse and its drift, cadence, work, and the load with the method it was worked
 * out by in words — from watt, from pulse, or from how hard it felt
 * (ADR 0016). A tile appears only when the file had the number.
 */
export function ActivitySummary({ facts }: { facts: ActivityFacts }) {
  const t = useTranslations("activities.summary");
  const duration = useTranslations("training.duration");
  const locale = useLocale();
  const tiles: Array<{ key: string; label: string; value: string; hint?: string }> = [
    { key: "time", label: t("time"), value: durationText(facts.movingSeconds / 60, duration) },
  ];
  const add = (key: string, value: number | null, format: (v: number) => string, hint?: string) => {
    if (value !== null && value > 0)
      tiles.push({ key, label: t(key as "time"), value: format(value), hint });
  };
  if (facts.elapsedSeconds && facts.elapsedSeconds - facts.movingSeconds >= 120)
    add("elapsed", facts.elapsedSeconds, (v) => durationText(v / 60, duration));
  add("distance", facts.distanceM, (v) => t("km", { km: num(v / 1000, locale, 1) }));
  const avgSpeed =
    facts.distanceM && facts.movingSeconds > 0 ? facts.distanceM / facts.movingSeconds : null;
  const kmh = (v: number) => t("kmh", { kmh: num(v * 3.6, locale, 1) });
  add("avgSpeed", avgSpeed, kmh);
  add("maxSpeed", facts.maxSpeed, kmh);
  add("ascent", facts.ascentM, (v) => t("m", { m: num(v, locale) }));
  add("avgPower", facts.avgPower, (v) => t("watt", { w: v }));
  add("weightedPower", facts.weightedPower, (v) => t("watt", { w: v }), t("weightedHint"));
  add("maxPower", facts.maxPower, (v) => t("watt", { w: v }));
  add("avgHr", facts.avgHr, (v) => t("bpm", { bpm: v }));
  add("maxHr", facts.maxHr, (v) => t("bpm", { bpm: v }));
  if (facts.hrDrift !== null)
    tiles.push({
      key: "drift",
      label: t("drift"),
      value: t("pct", { pct: num(facts.hrDrift, locale, 1) }),
      hint: t("driftHint"),
    });
  add("cadence", facts.avgCadence, (v) => t("rpm", { rpm: v }));
  add("work", facts.workKj, (v) => t("kj", { kj: num(v, locale) }));
  if (facts.load !== null)
    tiles.push({
      key: "load",
      label: t("load"),
      value: num(facts.load, locale),
      hint: t(`method.${facts.loadMethod}` as "method.power"),
    });

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 @3xl:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className="border-border bg-card flex flex-col gap-0.5 rounded-lg border px-3 py-2.5"
        >
          <dt className="text-label text-xs">{tile.label}</dt>
          <dd className="text-base font-semibold">{tile.value}</dd>
          {tile.hint && <dd className="text-meta text-xs leading-snug">{tile.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
