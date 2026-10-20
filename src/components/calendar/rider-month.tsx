import { useLocale, useTranslations } from "next-intl";
import { VolumeBar } from "@/components/season/volume-bar";
import { ComplianceMark } from "@/components/training/compliance-mark";
import { weekdayShort } from "@/components/training/day-label";
import { weekNumber } from "@/core/dates";
import { Link } from "@/i18n/navigation";
import type { Volume } from "@/modules/season/volume";
import { calendarHref, type CalendarQuery } from "./href";
import { MonthDay } from "./month-day";
import type { MonthCell } from "./month-days";

/**
 * One rider's month (docs/adr/0093): the weeks Monday first, the days of
 * the months either side dimmed, and each week ending in its hours on
 * the bike against the season plan in the four numbers' bar (ADR 0040) —
 * the paradigm's corridor too, when the team plans by one. On a phone
 * each week is a row of seven small days with its total under it. What
 * a session was, its comments and its ride are the week's to show.
 */
export function RiderMonth({
  weeks,
  volumes,
  query,
}: {
  weeks: Array<{ monday: string; cells: MonthCell[] }>;
  /** Each week's four numbers by Monday. */
  volumes: Record<string, Volume>;
  query: CalendarQuery;
}) {
  const t = useTranslations("calendar.month");
  const nav = useTranslations("calendar.nav");
  const locale = useLocale();
  const first = weeks[0]?.cells ?? [];

  return (
    <section aria-label={t("label")} className="flex min-w-0 flex-col gap-3">
      <div
        aria-hidden
        className="text-meta hidden grid-cols-[minmax(0,1fr)_11rem] gap-3 text-xs font-medium @3xl:grid"
      >
        <span className="grid grid-cols-7 gap-1">
          {first.map((cell) => (
            <span key={cell.date} className="px-1.5 first-letter:uppercase">
              {weekdayShort(cell.date, locale)}
            </span>
          ))}
        </span>
        <span>{t("weekTotal")}</span>
      </div>
      <ol className="flex flex-col gap-3 @3xl:gap-1.5">
        {weeks.map((week) => {
          const volume = volumes[week.monday];
          const n = weekNumber(week.monday);
          return (
            <li
              key={week.monday}
              className="border-border bg-secondary/30 grid gap-2 rounded-xl border p-2 @3xl:grid-cols-[minmax(0,1fr)_11rem] @3xl:items-stretch @3xl:gap-3 @3xl:border-0 @3xl:bg-transparent @3xl:p-0"
            >
              <ol aria-label={nav("week", { n })} className="grid grid-cols-7 gap-1">
                {week.cells.map((cell) => (
                  <li key={cell.date} className="min-w-0">
                    <MonthDay cell={cell} />
                  </li>
                ))}
              </ol>
              <div className="flex min-w-0 flex-col gap-1 @3xl:py-1">
                <Link
                  href={calendarHref({ rider: query.rider, week: week.monday })}
                  className="focus-ring hover:text-primary self-start rounded-sm text-xs font-semibold"
                >
                  {nav("week", { n })}
                </Link>
                {volume ? (
                  <VolumeBar volume={volume} />
                ) : (
                  <span className="text-meta text-xs">{t("noHours")}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <ul aria-label={t("legend")} className="flex flex-wrap gap-2">
        <li>
          <ComplianceMark colour="green" done />
        </li>
        <li>
          <ComplianceMark colour="yellow" done />
        </li>
        <li>
          <ComplianceMark colour="red" done={false} />
        </li>
        <li>
          <ComplianceMark colour="grey" done={false} />
        </li>
        <li>
          <ComplianceMark colour="none" done />
        </li>
      </ul>
    </section>
  );
}
