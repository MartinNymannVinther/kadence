import { ChevronLeft, ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { seasonLabel, shiftMonth } from "@/modules/calendar/grid";
import { calendarHref, type CalendarQuery } from "./href";
import { MonthJump } from "./month-jump";
import { monthTitle } from "./month-title";

/**
 * The month's and the season's way back, forward and home, as the week
 * has its own (week-nav.tsx): links, with the place shown as the page's
 * second heading (docs/adr/0093).
 */

const icon = cn(buttonVariants({ variant: "outline", size: "icon" }), "max-sm:size-11");
const home = cn(buttonVariants({ variant: "ghost" }), "max-sm:h-11");

export async function MonthNav({
  month,
  today,
  query,
}: {
  month: string;
  today: string;
  query: CalendarQuery;
}) {
  const t = await getTranslations("calendar.month");
  const locale = await getLocale();
  const href = (m: string) => calendarHref({ ...query, view: "month", month: m, session: null });
  const now = today.slice(0, 7);
  return (
    <nav aria-label={t("nav")} className="flex flex-wrap items-center gap-2">
      <Link href={href(shiftMonth(month, -1))} className={icon} aria-label={t("previous")}>
        <ChevronLeft />
      </Link>
      <Link href={href(shiftMonth(month, 1))} className={icon} aria-label={t("next")}>
        <ChevronRight />
      </Link>
      <MonthJump at={`${month}-01`} today={today} href={href("__AT__")} target="month" />
      {month !== now && (
        <Link href={href(now)} className={home}>
          {t("thisMonth")}
        </Link>
      )}
      <h2 className="ml-1 text-base font-semibold">{monthTitle(month, locale)}</h2>
    </nav>
  );
}

export async function SeasonNav({
  season,
  current,
  query,
}: {
  season: number;
  current: number;
  query: CalendarQuery;
}) {
  const y = await getTranslations("calendar.year");
  const href = (s: number) => calendarHref({ ...query, view: "year", year: s, session: null });
  return (
    <nav aria-label={y("nav")} className="flex flex-wrap items-center gap-2">
      <Link href={href(season - 1)} className={icon} aria-label={y("previous")}>
        <ChevronLeft />
      </Link>
      <Link href={href(season + 1)} className={icon} aria-label={y("next")}>
        <ChevronRight />
      </Link>
      {season !== current && (
        <Link href={href(current)} className={home}>
          {y("thisSeason")}
        </Link>
      )}
      <h2 className="ml-1 text-base font-semibold">
        {y("title", { season: seasonLabel(season) })}
      </h2>
    </nav>
  );
}
