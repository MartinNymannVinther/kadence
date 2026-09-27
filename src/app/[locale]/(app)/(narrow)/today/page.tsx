import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { withQuery } from "@/components/calendar/href";
import { toCard, toEventCard } from "@/components/calendar/to-card";
import { SessionSheet } from "@/components/session/session-sheet";
import { SessionView } from "@/components/session/session-view";
import { CoachToday } from "@/components/today/coach-today";
import { GettingStarted } from "@/components/today/getting-started";
import { TodaySession } from "@/components/today/today-session";
import { WeekGlance } from "@/components/today/week-glance";
import { dayLong } from "@/components/training/day-label";
import { getOrgContext } from "@/core/auth/session";
import { addDaysIso, maxIso, todayInCopenhagen } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { redirect } from "@/i18n/navigation";
import { whoAmI } from "@/modules/team/access";
import { getRiders } from "@/modules/team/riders";
import { listEvents } from "@/modules/training/events";
import { listSessions } from "@/modules/training/sessions";
import { weekDates, weekFrom } from "@/modules/training/week";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("today");
  return { title: t("title") };
}

const hrefFor = (sessionId: string) => withQuery("/today", { session: sessionId });

async function weekOf(ctx: OrgContext, riderId: string, from: string, to: string) {
  const [sessions, events] = await Promise.all([
    listSessions(ctx, { from, to, riderIds: [riderId] }),
    listEvents(ctx, { from, to, riderIds: [riderId] }),
  ]);
  return { sessions: sessions.map(toCard), events: events.map(toEventCard) };
}

/**
 * The front page, by who is looking. A rider sees today's and tomorrow's
 * sessions with a big "Udført", and the week at a glance; a coach sees
 * the team's day and the week's team events — or, on an empty team, the
 * three steps to start; a parent sees each confirmed child's week. One
 * person can be more than one of these, and sees each part.
 */
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("today");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const search = await searchParams;
  const openSession = typeof search.session === "string" ? search.session : undefined;
  const today = todayInCopenhagen();
  const tomorrow = addDaysIso(today, 1);
  const monday = weekFrom(undefined, today);
  const days = weekDates(monday);
  const sunday = days[6] ?? today;

  const riders = me?.isCoach ? await getRiders(ctx) : [];
  const soloRider = me?.rider && riders.length === 1 && riders[0]?.id === me.rider.id;
  const own = me?.rider ? await weekOf(ctx, me.rider.id, monday, maxIso([sunday, tomorrow])) : null;
  const team =
    me?.isCoach && riders.length > 0 && !soloRider
      ? await Promise.all([
          listSessions(ctx, { from: today, to: today, riderIds: riders.map((r) => r.id) }),
          listEvents(ctx, { from: monday, to: sunday }),
        ])
      : null;
  const children = await Promise.all(
    (me?.children ?? [])
      .filter((c) => c.confirmed)
      .map(async (c) => ({ ...c, week: await weekOf(ctx, c.riderId, monday, sunday) })),
  );
  const waiting = (me?.children ?? []).some((c) => !c.confirmed);
  const nothing = !me || (!me.isCoach && !me.rider && me.children.length === 0);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader
        title={t("title")}
        subtitle={<span className="first-letter:uppercase">{dayLong(today, locale)}</span>}
      />

      {nothing && <EmptyState title={t("none.title")} hint={t("none.body")} />}

      {own && me?.rider && (
        <>
          {(["today", "tomorrow"] as const).map((when) => {
            const date = when === "today" ? today : tomorrow;
            const list = own.sessions.filter((s) => s.onDate === date);
            return (
              <section key={when} aria-labelledby={`rider-${when}`} className="flex flex-col gap-3">
                <h2 id={`rider-${when}`} className="text-lg font-semibold">
                  {t(`rider.${when}`)}
                </h2>
                {list.length === 0 ? (
                  <p className="text-meta text-2sm">{t("rider.rest")}</p>
                ) : (
                  list.map((s) => (
                    <TodaySession
                      key={s.id}
                      session={s}
                      today={today}
                      href={hrefFor(s.id)}
                      canComplete={date <= today}
                    />
                  ))
                )}
              </section>
            );
          })}
          <section aria-labelledby="rider-week" className="flex flex-col gap-3">
            <h2 id="rider-week" className="text-lg font-semibold">
              {t("rider.week")}
            </h2>
            <WeekGlance
              days={days}
              today={today}
              sessions={own.sessions}
              events={own.events}
              hrefFor={hrefFor}
            />
          </section>
        </>
      )}

      {me?.isCoach && riders.length === 0 && <GettingStarted />}
      {team && (
        <CoachToday
          riders={riders.map((r) => ({ id: r.id, name: r.name }))}
          sessions={team[0].map(toCard)}
          teamEvents={team[1].filter((e) => e.riderId === null).map(toEventCard)}
          today={today}
          hrefFor={hrefFor}
        />
      )}

      {children.map((child) => (
        <section
          key={child.guardianId}
          aria-labelledby={`child-${child.riderId}`}
          className="flex flex-col gap-3"
        >
          <h2 id={`child-${child.riderId}`} className="text-lg font-semibold">
            {t("parent.week", { name: child.name ?? "" })}
          </h2>
          <WeekGlance
            days={days}
            today={today}
            sessions={child.week.sessions}
            events={child.week.events}
            hrefFor={hrefFor}
          />
        </section>
      ))}
      {waiting && <EmptyState title={t("parent.waitingTitle")} hint={t("parent.waitingBody")} />}

      {openSession && me && (
        <SessionSheet key={openSession} closeHref="/today" title={t("sessionPanel")}>
          <SessionView ctx={ctx} me={me} sessionId={openSession} closeHref="/today" />
        </SessionSheet>
      )}
    </div>
  );
}
