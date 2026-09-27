import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { calendarHref, type CalendarQuery } from "@/components/calendar/href";
import { RiderSelect } from "@/components/calendar/rider-select";
import { RiderWeek } from "@/components/calendar/rider-week";
import { TeamGrid } from "@/components/calendar/team-grid";
import { toActivityCard, toCard, toEventCard } from "@/components/calendar/to-card";
import { WeekNav } from "@/components/calendar/week-nav";
import { SessionSheet } from "@/components/session/session-sheet";
import { SessionView } from "@/components/session/session-view";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { basisText } from "@/components/season/basis-text";
import { Link, redirect } from "@/i18n/navigation";
import { seasonStartYear, weeklyCorridor } from "@/modules/dcu";
import { riderClass } from "@/modules/season/class";
import { whoAmI } from "@/modules/team/access";
import { getRiders } from "@/modules/team/riders";
import { listUnplanned } from "@/modules/training/activities";
import { listEvents } from "@/modules/training/events";
import { listSessions } from "@/modules/training/sessions";
import { listTemplates } from "@/modules/training/templates";
import { weekDates, weekFrom } from "@/modules/training/week";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calendar");
  return { title: t("title") };
}

type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * The calendar, the heart of Kadence: a week at a time, for one rider or
 * — for a coach — the whole team. `?week=` is the week's Monday (this
 * week in Copenhagen by default), `?rider=` whose week, `?view=team` the
 * team grid, and `?session=` the session whose panel is open. Who may see
 * which rider is the database's decision (ADR 0011): the list of riders
 * here is whatever it lets the caller read.
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
  const monday = weekFrom(param("week"), today);
  const days = weekDates(monday);
  const range = { from: monday, to: days[6] ?? monday };
  const riderRows = await getRiders(ctx);
  const visible = riderRows.map((r) => ({ id: r.id, name: r.name }));

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
  const teamView =
    me.isCoach && (param("view") === "team" || (!asked && !(own && visible.length === 1)));
  const rider = asked ?? own ?? visible[0]!;
  const riderIds = teamView ? visible.map((r) => r.id) : [rider.id];
  const canWrite = me.isCoach || me.rider?.id === rider.id;
  const choose = me.isCoach || visible.length > 1;
  const query: CalendarQuery = teamView
    ? { week: monday, view: "team" }
    : { week: monday, rider: choose ? rider.id : null };

  const [sessions, unplanned, events, templates] = await Promise.all([
    listSessions(ctx, { ...range, riderIds }),
    listUnplanned(ctx, { ...range, riderIds }),
    listEvents(ctx, { ...range, riderIds }),
    canWrite ? listTemplates(ctx) : Promise.resolve([]),
  ]);
  const templateOptions = templates.map((tpl) => ({
    id: tpl.id,
    name: tpl.name,
    sport: tpl.sport,
    plannedMinutes: tpl.plannedMinutes,
    source: tpl.source,
  }));
  const openSession = param("session");
  const row = riderRows.find((r) => r.id === rider.id);
  const basis = row ? riderClass(row, seasonStartYear(monday)).basis : null;
  const seasonT = await getTranslations("season");
  const corridor = basis
    ? {
        ...weeklyCorridor(basis, monday),
        klass: basisText(basis, (k, v) => seasonT(k, v)),
      }
    : null;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        title={t("title")}
        subtitle={teamView ? t("teamSubtitle") : rider.name}
        actions={
          choose ? (
            <RiderSelect
              riders={visible}
              value={teamView ? "team" : rider.id}
              week={monday}
              withTeam={me.isCoach}
            />
          ) : undefined
        }
      />
      <WeekNav monday={monday} today={today} query={query} />
      {teamView ? (
        <TeamGrid
          riders={visible}
          days={days}
          today={today}
          sessions={sessions.map(toCard)}
          activities={unplanned.map(toActivityCard)}
          events={events.map(toEventCard)}
          templates={templateOptions}
          query={query}
        />
      ) : (
        <RiderWeek
          riderId={rider.id}
          days={days}
          today={today}
          sessions={sessions.map(toCard)}
          activities={unplanned.map(toActivityCard)}
          events={events.map(toEventCard)}
          canWrite={canWrite}
          isCoach={me.isCoach}
          riders={me.isCoach ? visible : [rider]}
          templates={templateOptions}
          query={query}
          corridor={corridor}
        />
      )}
      {openSession && (
        <SessionSheet key={openSession} closeHref={calendarHref(query)} title={t("sessionPanel")}>
          <SessionView ctx={ctx} me={me} sessionId={openSession} closeHref={calendarHref(query)} />
        </SessionSheet>
      )}
    </div>
  );
}
