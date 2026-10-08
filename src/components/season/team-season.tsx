"use client";

import { useLocale, useTranslations } from "next-intl";
import { monthLong, num } from "@/components/charts/format";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";
import type { Volume } from "@/modules/season/volume";
import { VolumeBar } from "./volume-bar";

export type TeamSeasonRow = {
  id: string;
  name: string;
  href: string;
  month: Volume;
  toDate: Volume;
};

/**
 * The team's season on one screen, a coach's (ADR 0040): for each rider
 * this month in the four numbers' bar, and the season so far — October to
 * today — written out beside it. Each name opens the rider's own plan.
 */
export function TeamSeason({ rows, month }: { rows: TeamSeasonRow[]; month: number }) {
  const t = useTranslations("season.team");
  const v = useTranslations("volume");
  const locale = useLocale();
  const h = (n: number) => num(n, locale, 0);
  if (rows.length === 0) return <EmptyState title={t("empty")} />;

  return (
    <ul className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-surface">
      {rows.map((row) => {
        const so = row.toDate;
        return (
          <li
            key={row.id}
            className="grid gap-2 px-4 py-3.5 @3xl:grid-cols-[10rem_minmax(0,16rem)_minmax(0,1fr)] @3xl:items-start @3xl:gap-5"
          >
            <Link
              href={row.href}
              className="focus-ring hover:text-primary text-sm font-semibold break-words"
            >
              {row.name}
            </Link>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-meta text-xs first-letter:uppercase">
                {monthLong(month, locale)}
              </span>
              <VolumeBar compact volume={row.month} />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-meta text-xs">{t("toDate")}</span>
              <p className="text-2sm tabular-nums">
                {t("toDateValue", {
                  done: h(so.done),
                  planned: h(so.planned),
                  goal: so.goal !== null ? v("hours", { hours: h(so.goal) }) : v("noGoal"),
                  dcu: so.dcu ? v("hours", { hours: h(so.dcu.target) }) : v("noDcu"),
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
