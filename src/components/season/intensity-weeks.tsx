import { useLocale, useTranslations } from "next-intl";
import { monthLong } from "@/components/charts/format";
import { mondayOf, weekNumber } from "@/core/dates";
import { THREE_ZONES, counted, intensityShares, type IntensityCount } from "@/modules/load";
import { LOW_INTENSITY_FIRST } from "@/modules/paradigms";
import type { IntensityWeeks as Data } from "@/modules/season/intensity";

/** The colour of each of the three zones: Kadence's zone colours at the middle of each. */
const COLOUR = { low: "var(--zone-2)", mid: "var(--zone-4)", high: "var(--zone-6)" } as const;
/** The months DCU's year wheel gives a share of higher intensity for (src/modules/dcu/intensity.ts). */
const DCU_MONTHS = [11, 12, 1, 2];

/**
 * "Intensitet uge for uge" (ADR 0053): the weeks around today, each bike
 * session counted once in the zone it is planned for and each race day as
 * a hard one, with the last four weeks in shares beside DCU's year wheel
 * and, when the team uses it, the profile "Lav intensitet først". Every
 * bar carries its numbers in words, so the colours are never read alone.
 */
export function IntensityWeeks({
  data,
  today,
  guided,
  isCoach,
}: {
  data: Data;
  today: string;
  guided: boolean;
  isCoach: boolean;
}) {
  const t = useTranslations("season.intensity");
  const locale = useLocale();
  const month = Number(today.slice(5, 7));
  const thisMonday = mondayOf(today);
  const most = Math.max(1, ...data.weeks.map((w) => counted(w.count)));
  const shares = intensityShares(data.recent);

  return (
    <section aria-labelledby="season-intensity" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="season-intensity" className="text-lg font-semibold">
          {t("title")}
        </h2>
        <p className="text-meta text-2sm leading-relaxed">{t("body")}</p>
      </div>
      <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-surface sm:p-5">
        <ul className="text-2sm flex flex-wrap gap-x-4 gap-y-1">
          {THREE_ZONES.map((zone) => (
            <li key={zone} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: COLOUR[zone] }}
              />
              {t(zone)}
            </li>
          ))}
        </ul>
        <ol className="flex flex-col gap-2">
          {data.weeks.map(({ monday, count }) => (
            <li key={monday} className="flex flex-col gap-0.5">
              <div className="text-2sm grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-2">
                <span className="truncate">
                  <span className={monday === thisMonday ? "font-semibold" : undefined}>
                    {t("week", { week: weekNumber(monday) })}
                  </span>
                  {monday === thisMonday && <span className="text-meta"> · {t("thisWeek")}</span>}
                </span>
                {counted(count) > 0 ? (
                  <Bar count={count} most={most} label={t("bar", count)} />
                ) : (
                  <span className="text-meta">{t("empty")}</span>
                )}
                <span className="text-right whitespace-nowrap tabular-nums" aria-hidden>
                  {count.low} · {count.mid} · {count.high}
                </span>
              </div>
              {(count.races > 0 || count.unknown > 0) && (
                <p className="text-meta pl-[8rem] text-xs">
                  {[
                    count.races > 0 ? t("races", { count: count.races }) : "",
                    count.unknown > 0 ? t("unknown", { count: count.unknown }) : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ol>
        <div className="border-hairline text-2sm flex flex-col gap-1.5 border-t pt-3 leading-relaxed">
          <p className="font-medium">
            {shares ? t("recent", { ...shares, sessions: counted(data.recent) }) : t("recentNone")}
          </p>
          {data.lowIntensityFirst ? (
            <p>{t("profile", LOW_INTENSITY_FIRST)}</p>
          ) : (
            isCoach && <p className="text-meta">{t("profileOff")}</p>
          )}
          {guided && DCU_MONTHS.includes(month) && (
            <p className="text-meta">
              {t("dcu", {
                month: monthLong(month, locale),
                share: t(`dcuShare.${month}` as "dcuShare.1"),
              })}
            </p>
          )}
          <p className="text-meta">{t("zones")}</p>
        </div>
      </div>
    </section>
  );
}

/** One week as a bar as long as its number of sessions, split by zone. */
function Bar({ count, most, label }: { count: IntensityCount; most: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="bg-secondary h-3 overflow-hidden rounded-full">
      <span className="flex h-full" style={{ width: `${(counted(count) / most) * 100}%` }}>
        {THREE_ZONES.map((zone) =>
          count[zone] > 0 ? (
            <span
              key={zone}
              className="block h-full"
              style={{
                width: `${(count[zone] / counted(count)) * 100}%`,
                backgroundColor: COLOUR[zone],
              }}
            />
          ) : null,
        )}
      </span>
    </span>
  );
}
