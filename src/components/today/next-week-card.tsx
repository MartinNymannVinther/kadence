import { CalendarRange } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { calendarHref, withQuery } from "@/components/calendar/href";
import { weekdayLong } from "@/components/training/day-label";
import { buttonVariants } from "@/components/ui/button";
import { addDaysIso, weekNumber } from "@/core/dates";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { nextWeekLine, type NextWeekSummary, type NextWeekWords } from "./next-week";

/**
 * Overblik's first card: whether next week is planned, and what is in it
 * that the plan has to go around (next-week.ts). Until every rider has a
 * session, the way in is the planner for that week (ADR 0059), with the
 * team's week beside it; once the week is laid, the team's week comes
 * first and the planner is the way to change it.
 */
export function NextWeekCard({ summary }: { summary: NextWeekSummary }) {
  const t = useTranslations("today.nextWeek");
  const locale = useLocale();
  const list = new Intl.ListFormat(locale === "en" ? "en-GB" : "da-DK", { type: "conjunction" });
  const words: NextWeekWords = {
    riders: (kind, count) => t("riders", { kind, count }),
    team: (kind, days) => t("team", { kind, days }),
    day: (iso) => t("day", { day: weekdayLong(iso, locale) }),
    span: (from, to) => t("span", { from: weekdayLong(from, locale), to: weekdayLong(to, locale) }),
    list: (items) => list.format(items),
    and: t("and"),
    locale,
  };
  const { monday, week, state } = summary;
  const plan = withQuery("/calendar/week-plan", { week: monday });
  const see = calendarHref({ view: "team", week: monday });
  const title =
    state === "none"
      ? t("none", { week })
      : state === "some"
        ? t("some", { week, planned: summary.planned, riders: summary.riders })
        : t("all", { week, sessions: summary.sessions, riders: summary.riders });
  const [primary, secondary] =
    state === "all"
      ? [
          { href: see, label: t("see", { week }) },
          { href: plan, label: t("edit") },
        ]
      : [
          { href: plan, label: t("plan", { week }) },
          { href: see, label: t("see", { week }) },
        ];

  return (
    <section
      aria-labelledby="next-week"
      className="bg-accent border-primary/20 flex gap-4 rounded-xl border p-4 sm:px-5 sm:py-[18px]"
    >
      <span
        aria-hidden
        className="bg-primary text-primary-foreground hidden size-10 shrink-0 items-center justify-center rounded-xl sm:flex"
      >
        <CalendarRange className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id="next-week" className="text-lg leading-snug font-semibold">
          {title}
        </h2>
        <p className="text-accent-foreground max-w-prose text-sm leading-relaxed">
          {nextWeekLine(summary.kinds, words) ?? t("quiet")}
          {state === "none" && ` ${t("start", { week: weekNumber(addDaysIso(monday, -7)) })}`}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={primary.href} className={cn(buttonVariants(), "max-sm:h-11")}>
            {primary.label}
          </Link>
          <Link
            href={secondary.href}
            className={cn(buttonVariants({ variant: "outline" }), "bg-card/70 max-sm:h-11")}
          >
            {secondary.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
