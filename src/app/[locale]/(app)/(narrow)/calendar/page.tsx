import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { calendarHref, type CalendarQuery } from "@/components/calendar/href";
import { RiderSelect } from "@/components/calendar/rider-select";
import { ScaleSwitch } from "@/components/calendar/scale-switch";
import { MonthView } from "@/components/calendar/views/month-view";
import { WeekView } from "@/components/calendar/views/week-view";
import { YearView } from "@/components/calendar/views/year-view";
import { SessionSheet } from "@/components/session/session-sheet";
import { SessionView } from "@/components/session/session-view";
import { getOrgContext } from "@/core/auth/session";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import {
  monthBounds,
  monthFrom,
  scaleFrom,
  seasonBounds,
  seasonFrom,
} from "@/modules/calendar/grid";
import { seasonStartYear } from "@/modules/dcu";
import { riderClass } from "@/modules/season/class";
import { whoAmI } from "@/modules/team/access";
import { getRiders } from "@/modules/team/riders";
import { weekFrom } from "@/modules/training/week";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calendar");
  return { title: t("title") };
}

type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * The calendar, the heart of Kadence, at three scales (docs/adr/0093): a
 * week (`?week=`, its Monday), a month (`?view=month&month=2026-11`) or a
 * season from October (`?view=year&year=2026`) — for one rider
 * (`?rider=`) or, for a coach, the whole team (`?view=team` for the
 * week, `team=1` beside the month and the year). `?session=` is the
 * session whose panel is open, on any scale. Who may see which rider is
 * the database's decision (ADR 0011): the list of riders here is
 * whatever it lets the caller read.
 */
export default async function CalendarPage({ searchParams }: { searchParams: Search }) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("calendar");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const search = await searchParams;
  const param = (key: string) => (typeof search[key] === "string" ? search[key] : undefined);

  const today = todayInCopenhagen();
  const scale = scaleFrom(param("view"));
  const monday = weekFrom(param("week"), today);
  const month = monthFrom(param("month"), today);
  const season = seasonFrom(param("year"), today);
  const shown =
    scale === "month"
      ? monthBounds(month)
      : scale === "year"
        ? seasonBounds(season)
        : { from: monday, to: addDaysIso(monday, 6) };
  const riderRows = await getRiders(ctx);
  const visible = riderRows.map((r) => ({
    id: r.id,
    name: r.name,
    // An adult's strength series is measured against their profile (ADR 0092).
    basis: riderClass(r, seasonStartYear(shown.from)).basis,
  }));

  if (!me || visible.length === 0) {
    const waiting = me?.children.some((c) => !c.confirmed);
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        <PageHeader title={t("title")} />
        {me?.isCoach ? (
          <EmptyState
            title={t("empty.coachTitle")}
            hint={t("empty.coachBody")}
            action={
              <Link href="/riders" className={buttonVariants()}>
                {t("empty.coachAction")}
              </Link>
            }
          />
        ) : waiting ? (
          <EmptyState title={t("empty.waitingTitle")} hint={t("empty.waitingBody")} />
        ) : (
          <EmptyState title={t("empty.noneTitle")} hint={t("empty.noneBody")} />
        )}
      </div>
    );
  }

  const own = me.rider ? visible.find((r) => r.id === me.rider?.id) : undefined;
  const asked = visible.find((r) => r.id === param("rider"));
  const teamAsked = param("view") === "team" || param("team") === "1";
  const teamView = me.isCoach && (teamAsked || (!asked && !(own && visible.length === 1)));
  const rider = asked ?? own ?? visible[0]!;
  const choose = me.isCoach || visible.length > 1;
  const who = teamView
    ? { team: true, rider: null }
    : { team: false, rider: choose ? rider.id : null };
  const query: CalendarQuery =
    scale === "month"
      ? { ...who, view: "month", month }
      : scale === "year"
        ? { ...who, view: "year", year: season }
        : { ...who, view: teamView ? "team" : null, week: monday };
  const props = { ctx, me, today, locale, riderRows, visible, rider, teamView, query };
  const openSession = param("session");
  const subtitle = teamView
    ? t(
        scale === "month"
          ? "month.teamSubtitle"
          : scale === "year"
            ? "year.teamSubtitle"
            : "teamSubtitle",
      )
    : rider.name;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        title={t("title")}
        subtitle={subtitle}
        actions={
          choose ? (
            <RiderSelect
              riders={visible}
              value={teamView ? "team" : rider.id}
              query={query}
              withTeam={me.isCoach}
            />
          ) : undefined
        }
      />
      <ScaleSwitch scale={scale} query={query} shown={shown} today={today} />
      {scale === "month" ? (
        <MonthView {...props} month={month} />
      ) : scale === "year" ? (
        <YearView {...props} season={season} />
      ) : (
        <WeekView {...props} monday={monday} />
      )}
      {openSession && (
        <SessionSheet key={openSession} closeHref={calendarHref(query)} title={t("sessionPanel")}>
          <SessionView ctx={ctx} me={me} sessionId={openSession} closeHref={calendarHref(query)} />
        </SessionSheet>
      )}
    </div>
  );
}
