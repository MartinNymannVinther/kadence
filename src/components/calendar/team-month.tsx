import { Trophy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { stateKey } from "@/components/training/compliance-mark";
import { dayLong, weekdayShort } from "@/components/training/day-label";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Volume } from "@/modules/season/volume";
import { DOT } from "./month-day";
import type { TeamMonthDay } from "./month-days";

export type TeamMonthRow = {
  id: string;
  name: string;
  /** The rider's own month. */
  href: string;
  days: TeamMonthDay[];
  volume: Volume | null;
};

/**
 * The team's month, a coach's (docs/adr/0093): a row per rider and a
 * column per day, each day a dot per session in the load model's colours
 * — filled when ridden, hollow while still to ride — a dot for a ride
 * without a plan, and a trophy for a race; an empty cell is a day of
 * rest. The team's own races stand in the header. The month's hours on
 * the bike close each row; the name opens the rider's month. Wider than
 * a phone, the table scrolls sideways inside itself with the names held.
 */
export function TeamMonth({
  days,
  rows,
  teamRaces,
  today,
}: {
  days: string[];
  rows: TeamMonthRow[];
  /** The team's races by day: their titles. */
  teamRaces: Record<string, string[]>;
  today: string;
}) {
  const t = useTranslations("calendar.month");
  const states = useTranslations("training.state");
  const locale = useLocale();
  const h = (v: number) => num(v, locale, 1);
  const weekend = (date: string) => {
    const d = new Date(`${date}T12:00:00Z`).getUTCDay();
    return d === 0 || d === 6;
  };

  return (
    <div className="border-border bg-card overflow-x-auto rounded-xl border shadow-surface">
      <table className="w-full border-collapse text-xs">
        <caption className="sr-only">{t("teamCaption")}</caption>
        <thead>
          <tr className="border-border border-b">
            <th
              scope="col"
              className="bg-card sticky left-0 z-10 min-w-28 px-3 py-2 text-left font-medium"
            >
              {t("rider")}
            </th>
            {days.map((date) => (
              <th
                key={date}
                scope="col"
                aria-current={date === today ? "date" : undefined}
                className={cn(
                  "min-w-6 px-0 py-1.5 text-center font-normal tabular-nums",
                  weekend(date) && "bg-secondary/50",
                  date === today && "bg-accent text-accent-foreground font-semibold",
                )}
              >
                <span className="sr-only">
                  {dayLong(date, locale)}
                  {teamRaces[date] ? `: ${teamRaces[date]!.join(", ")}` : ""}
                </span>
                <span aria-hidden className="flex flex-col items-center leading-tight">
                  <span className="text-meta text-2xs">
                    {weekdayShort(date, locale).slice(0, 1)}
                  </span>
                  <span>{Number(date.slice(8))}</span>
                  {teamRaces[date] && <Trophy className="text-primary mt-0.5 size-3" />}
                </span>
              </th>
            ))}
            <th scope="col" className="min-w-20 px-2 py-2 text-right font-medium">
              {t("bikeHours")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-hairline divide-y">
          {rows.map((row) => (
            <tr key={row.id}>
              <th
                scope="row"
                className="bg-card sticky left-0 z-10 px-3 py-1.5 text-left font-semibold"
              >
                <Link
                  href={row.href}
                  className="focus-ring hover:text-primary rounded-sm text-2sm break-words"
                >
                  {row.name}
                </Link>
              </th>
              {row.days.map((day) => {
                const words = [
                  ...day.marks.map((m) =>
                    states(stateKey(m.colour, m.done, day.isToday) as "planned"),
                  ),
                  ...(day.race ? [day.race] : []),
                ];
                const label = `${row.name}, ${dayLong(day.date, locale)}: ${words.length ? words.join(", ") : t("rest")}`;
                const marks = (
                  <span
                    aria-hidden
                    className="flex min-h-7 flex-col items-center justify-center gap-0.5"
                  >
                    {day.race && <Trophy className="text-primary size-3" />}
                    <span className="flex flex-wrap justify-center gap-0.5">
                      {day.marks.slice(0, 3).map((mark, i) => (
                        <span key={i} className={cn("size-2 rounded-full", DOT[mark.colour])} />
                      ))}
                    </span>
                  </span>
                );
                return (
                  <td
                    key={day.date}
                    className={cn(
                      "p-0 text-center",
                      weekend(day.date) && "bg-secondary/50",
                      day.isToday && "bg-accent/50",
                    )}
                  >
                    {day.href ? (
                      <Link
                        href={day.href}
                        aria-label={label}
                        title={label}
                        className="focus-ring block rounded-sm hover:bg-accent/60"
                      >
                        {marks}
                      </Link>
                    ) : (
                      <span title={label}>
                        <span className="sr-only">{label}</span>
                        {marks}
                      </span>
                    )}
                  </td>
                );
              })}
              <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
                {row.volume ? (
                  <span className="flex flex-col items-end">
                    <span className="font-medium">
                      {t("of", { done: h(row.volume.done), planned: h(row.volume.planned) })}
                    </span>
                    {row.volume.goal !== null && (
                      <span className="text-meta text-2xs">
                        {t("goal", { hours: h(row.volume.goal) })}
                      </span>
                    )}
                  </span>
                ) : (
                  "–"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
