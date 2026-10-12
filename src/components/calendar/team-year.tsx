import { ArrowDown, ArrowUp, Check, Trophy, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { monthShort, num } from "@/components/charts/format";
import { dayMonth } from "@/components/training/day-label";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { SeasonMonth } from "@/modules/calendar/season-data";
import type { Standing } from "@/modules/calendar/standing";
import { monthTitle } from "./month-title";

export type TeamYearRow = {
  id: string;
  name: string;
  /** The rider's own season. */
  href: string;
  months: SeasonMonth[];
};

const STANDING: Record<Standing, { tint: string; icon: LucideIcon }> = {
  on: { tint: "bg-success-tint text-success", icon: Check },
  under: { tint: "bg-sticky text-sticky-ink", icon: ArrowDown },
  over: { tint: "bg-warning-tint text-destructive", icon: ArrowUp },
};

/**
 * The team's season, a coach's (docs/adr/0093): a row per rider and a
 * column per month from October, each cell the month's hours ridden on
 * the bike, tinted — with an arrow or a tick and a word for the screen
 * reader — by where the month is heading against the season plan, or the
 * paradigm's corridor without one (standing.ts). A month not begun shows
 * the hours put in the calendar, quietly. The team's races stand above
 * their month; a name opens the rider's season and a cell their month.
 */
export function TeamYear({
  months,
  rows,
  races,
  monthHref,
}: {
  months: string[];
  rows: TeamYearRow[];
  races: Array<{ id: string; title: string; startsOn: string }>;
  monthHref: (riderId: string, month: string) => string;
}) {
  const t = useTranslations("calendar.year");
  const locale = useLocale();
  const h = (n: number) => num(n, locale, 1);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="border-border bg-card overflow-x-auto rounded-xl border shadow-surface">
        <table className="w-full border-collapse text-xs">
          <caption className="sr-only">{t("teamCaption")}</caption>
          <thead>
            <tr className="border-border border-b">
              <th
                scope="col"
                className="bg-card sticky left-0 z-10 min-w-32 px-3 py-2 text-left font-medium"
              >
                {t("rider")}
              </th>
              {months.map((month) => {
                const mine = races.filter((r) => r.startsOn.slice(0, 7) === month);
                const said = mine
                  .map((r) => `${dayMonth(r.startsOn, locale)} ${r.title}`)
                  .join(", ");
                return (
                  <th
                    key={month}
                    scope="col"
                    className="min-w-14 px-1 py-1.5 text-center font-medium"
                  >
                    <span className="sr-only">{monthTitle(month, locale)}</span>
                    <span aria-hidden className="capitalize">
                      {monthShort(`${month}-01`, locale).replace(".", "")}
                    </span>
                    {mine.length > 0 && (
                      <span
                        title={said}
                        className="text-primary mt-0.5 flex items-center justify-center gap-0.5"
                      >
                        <Trophy aria-hidden className="size-3" />
                        <span className="text-2xs tabular-nums" aria-hidden>
                          {mine.length}
                        </span>
                        <span className="sr-only">{t("races", { list: said })}</span>
                      </span>
                    )}
                  </th>
                );
              })}
              <th scope="col" className="min-w-16 px-3 py-2 text-right font-medium">
                {t("total")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-hairline divide-y">
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row" className="bg-card sticky left-0 z-10 px-3 py-1.5 text-left">
                  <Link
                    href={row.href}
                    className="focus-ring hover:text-primary rounded-sm text-2sm font-semibold break-words"
                  >
                    {row.name}
                  </Link>
                </th>
                {row.months.map((m) => {
                  const style = m.standing ? STANDING[m.standing] : null;
                  const Icon = style?.icon;
                  const future = m.standing === null && m.volume.done === 0;
                  const label = `${row.name}, ${monthTitle(m.month, locale)}: ${
                    future
                      ? t("plannedOnly", { hours: h(m.volume.planned) })
                      : t("cell", { hours: h(m.volume.done) })
                  }${m.standing ? `, ${t(`standing.${m.standing}`)}` : ""}`;
                  return (
                    <td key={m.month} className="p-0.5 text-center">
                      <Link
                        href={monthHref(row.id, m.month)}
                        aria-label={label}
                        title={label}
                        className={cn(
                          "focus-ring flex min-h-8 items-center justify-center gap-0.5 rounded-sm tabular-nums hover:opacity-85",
                          style?.tint,
                          future && "text-meta",
                        )}
                      >
                        {Icon && <Icon aria-hidden className="size-3 shrink-0" />}
                        <span aria-hidden>
                          {future
                            ? m.volume.planned > 0
                              ? h(m.volume.planned)
                              : "–"
                            : h(m.volume.done)}
                        </span>
                      </Link>
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                  {h(row.months.reduce((sum, m) => sum + m.volume.done, 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul aria-label={t("legend")} className="text-meta flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {(["on", "under", "over"] as const).map((key) => {
          const Icon = STANDING[key].icon;
          return (
            <li key={key} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-sm",
                  STANDING[key].tint,
                )}
              >
                <Icon aria-hidden className="size-3" />
              </span>
              {t(`standing.${key}`)}
            </li>
          );
        })}
        <li>{t("futureNote")}</li>
      </ul>
    </div>
  );
}
