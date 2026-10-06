import { ChevronLeft, ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { dayMonth } from "@/components/training/day-label";
import { addDaysIso, mondayOf, weekNumber } from "@/core/dates";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { calendarHref, type CalendarQuery } from "./href";
import { MonthJump } from "./month-jump";

/**
 * Which week, and the way to the one before, the one after, this one,
 * and any month of any year ("Gå til"). Links, not buttons: a week is a
 * place, and the back button knows it. The calendar's by default; the
 * week planner gives its own addresses (ADR 0058).
 */
export async function WeekNav({
  monday,
  today,
  query = {},
  hrefFor,
}: {
  monday: string;
  today: string;
  query?: CalendarQuery;
  /** Where a week is, when it is not the calendar. */
  hrefFor?: (week: string) => string;
}) {
  const t = await getTranslations("calendar.nav");
  const locale = await getLocale();
  const sunday = addDaysIso(monday, 6);
  const thisWeek = mondayOf(today);
  const href = (week: string) =>
    hrefFor ? hrefFor(week) : calendarHref({ ...query, week, session: null });
  const icon = cn(buttonVariants({ variant: "outline", size: "icon" }), "max-sm:size-11");

  return (
    <nav aria-label={t("label")} className="flex flex-wrap items-center gap-2">
      <Link href={href(addDaysIso(monday, -7))} className={icon} aria-label={t("previous")}>
        <ChevronLeft />
      </Link>
      <Link href={href(addDaysIso(monday, 7))} className={icon} aria-label={t("next")}>
        <ChevronRight />
      </Link>
      <MonthJump monday={monday} today={today} weekHref={href("__WEEK__")} />
      {monday !== thisWeek && (
        <Link
          href={href(thisWeek)}
          className={cn(buttonVariants({ variant: "ghost" }), "max-sm:h-11")}
        >
          {t("thisWeek")}
        </Link>
      )}
      <p className="ml-1 flex flex-col leading-tight">
        <span className="text-base font-semibold">{t("week", { n: weekNumber(monday) })}</span>
        <span className="text-meta text-xs">
          {dayMonth(monday, locale)} – {dayMonth(sunday, locale)}
        </span>
      </p>
    </nav>
  );
}
