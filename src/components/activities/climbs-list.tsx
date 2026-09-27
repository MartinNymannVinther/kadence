import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { clockText } from "@/components/training/duration";
import type { ClimbSummary } from "@/modules/fit";

/**
 * The climbs found in the ride's altitude, each as a card: where it
 * started, how long and how steep, how many metres up, how long it took,
 * and the watt and pulse on the way up. A small profile bar shows the
 * gradient against the steepest climb of the ride.
 */
export function ClimbsList({ climbs }: { climbs: ClimbSummary[] }) {
  const t = useTranslations("activities.climbs");
  const locale = useLocale();
  const steepest = Math.max(...climbs.map((c) => c.gradePct), 1);

  return (
    <ol className="grid gap-2 sm:grid-cols-2">
      {climbs.map((climb, i) => (
        <li
          key={climb.startS}
          className="border-border bg-card flex flex-col gap-1.5 rounded-lg border px-3 py-2.5"
        >
          <p className="flex items-baseline justify-between gap-2">
            <span className="font-semibold">{t("name", { n: i + 1 })}</span>
            <span className="text-meta text-xs">
              {t("at", { km: num(climb.atM / 1000, locale, 1) })}
            </span>
          </p>
          <p className="text-2sm tabular-nums">
            {[
              t("km", { km: num(climb.distanceM / 1000, locale, 1) }),
              t("grade", { pct: num(climb.gradePct, locale, 1) }),
              t("gain", { m: num(climb.gainM, locale) }),
              t("time", { time: clockText(climb.endS - climb.startS) }),
            ].join(" · ")}
          </p>
          {(climb.avgPower !== undefined || climb.avgHr !== undefined) && (
            <p className="text-meta text-xs tabular-nums">
              {[
                climb.avgPower !== undefined ? t("watt", { w: climb.avgPower }) : null,
                climb.avgHr !== undefined ? t("bpm", { bpm: climb.avgHr }) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <span className="bg-secondary h-1.5 overflow-hidden rounded-full" aria-hidden>
            <span
              className="bg-chart-4 block h-full rounded-full"
              style={{ width: `${(climb.gradePct / steepest) * 100}%` }}
            />
          </span>
        </li>
      ))}
    </ol>
  );
}
