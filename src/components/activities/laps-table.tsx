import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { clockText } from "@/components/training/duration";
import type { LapSummary } from "@/modules/fit";

/**
 * The device's laps in a table: time, distance, speed, and watt, pulse,
 * cadence and climbing when the ride had them. A column the ride has no
 * number for is left out rather than filled with dashes. On a phone the
 * table scrolls sideways inside its own box; the lap number stays put.
 */
export function LapsTable({ laps }: { laps: LapSummary[] }) {
  const t = useTranslations("activities.laps");
  const locale = useLocale();
  const has = (key: keyof LapSummary) =>
    laps.some((lap) => typeof lap[key] === "number" && (lap[key] as number) > 0);
  const columns = [
    {
      key: "time",
      show: true,
      cell: (l: LapSummary) => clockText(l.movingSeconds || l.elapsedSeconds),
    },
    {
      key: "distance",
      show: has("distanceM"),
      cell: (l: LapSummary) => (l.distanceM ? num(l.distanceM / 1000, locale, 2) : "–"),
    },
    {
      key: "speed",
      show: has("avgSpeed"),
      cell: (l: LapSummary) => (l.avgSpeed ? num(l.avgSpeed * 3.6, locale, 1) : "–"),
    },
    {
      key: "power",
      show: has("avgPower"),
      cell: (l: LapSummary) => (l.avgPower !== undefined ? String(l.avgPower) : "–"),
    },
    {
      key: "hr",
      show: has("avgHr"),
      cell: (l: LapSummary) => (l.avgHr !== undefined ? String(l.avgHr) : "–"),
    },
    {
      key: "cadence",
      show: has("avgCadence"),
      cell: (l: LapSummary) => (l.avgCadence !== undefined ? String(l.avgCadence) : "–"),
    },
    {
      key: "ascent",
      show: has("ascentM"),
      cell: (l: LapSummary) => (l.ascentM ? num(l.ascentM, locale) : "–"),
    },
  ].filter((c) => c.show);

  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <table className="w-full text-2sm tabular-nums">
        <caption className="sr-only">{t("caption", { count: laps.length })}</caption>
        <thead className="bg-secondary text-label text-xs">
          <tr>
            <th scope="col" className="bg-secondary sticky left-0 px-3 py-2 text-left font-medium">
              {t("lap")}
            </th>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className="px-3 py-2 text-right font-medium whitespace-nowrap"
              >
                {t(c.key as "time")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {laps.map((lap, i) => (
            <tr key={lap.startS} className="border-border border-t">
              <th scope="row" className="bg-card sticky left-0 px-3 py-2 text-left font-semibold">
                {i + 1}
              </th>
              {columns.map((c) => (
                <td key={c.key} className="bg-card px-3 py-2 text-right whitespace-nowrap">
                  {c.cell(lap)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
