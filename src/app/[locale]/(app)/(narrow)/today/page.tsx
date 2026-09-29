import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { withQuery } from "@/components/calendar/href";
import { toCard, toEventCard } from "@/components/calendar/to-card";
import { SessionSheet } from "@/components/session/session-sheet";
import { SessionView } from "@/components/session/session-view";
import { FitUpload } from "@/components/activities/fit-upload";
import { SendToDeviceButton } from "@/components/session/send-to-device-button";
import { GoalsCard, type GoalView } from "@/components/activities/goals-card";
import { RecordsCard } from "@/components/activities/records-card";
import { LoadPanel } from "@/components/load/load-panel";
import { AttentionSection } from "@/components/today/attention-section";
import { CheckinSection } from "@/components/today/checkin-section";
import { CoachTips } from "@/components/coach/coach-tips";
import { teamTips } from "@/components/coach/team-tips";
import { CoachToday } from "@/components/today/coach-today";
import { GettingStarted } from "@/components/today/getting-started";
import { SharedNotice } from "@/components/today/shared-notice";
import { TodaySession } from "@/components/today/today-session";
import { WeekGlance } from "@/components/today/week-glance";
import { checkinValues } from "@/components/wellbeing/checkin-values";
import { zoneDays } from "@/components/wellbeing/zone-days";
import { dayLong } from "@/components/training/day-label";
import { getOrgContext } from "@/core/auth/session";
import { addDaysIso, maxIso, todayInCopenhagen } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { redirect } from "@/i18n/navigation";
import { getInsights } from "@/modules/insight/service";
import { whoAmI } from "@/modules/team/access";
import { getRider, getRiders } from "@/modules/team/riders";
import { getTeamSettings } from "@/modules/team/settings";
import { listEvents } from "@/modules/training/events";
import { dcuProposalFor, listGoals } from "@/modules/training/goals";
import { getRiderRecords } from "@/modules/training/records";
import { listSessions } from "@/modules/training/sessions";
import { readStructure } from "@/modules/workouts/structure";
import { weekDates, weekFrom } from "@/modules/training/week";
import { getCheckin, listCheckins } from "@/modules/wellbeing/checkins";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("today");
  return { title: t("title") };
}

const hrefFor = (sessionId: string) => withQuery("/today", { session: sessionId });

async function weekOf(ctx: OrgContext, riderId: string, from: string, to: string, today: string) {
  const [sessions, events] = await Promise.all([
    listSessions(ctx, { from, to, riderIds: [riderId] }),
    listEvents(ctx, { from, to, riderIds: [riderId] }),
  ]);
  // The next seven days' bike sessions with steps: what a bike computer can ride (ADR 0031).
  const lastDay = addDaysIso(today, 6);
  const toDevice = sessions
    .filter((s) => s.onDate >= today && s.onDate <= lastDay && s.sport === "bike")
    .filter((s) => {
      const structure = readStructure(s.structure, "bike");
      return structure.kind === "bike" && structure.steps.length > 0;
    })
    .map((s) => ({ id: s.id, title: s.title, onDate: s.onDate }));
  return { sessions: sessions.map(toCard), events: events.map(toEventCard), toDevice };
}

/** The rider's own extras for today: the check-in, two weeks of zones and their load. */
async function riderDay(ctx: OrgContext, riderId: string, today: string) {
  const [checkin, recent, insights, records, goals, rider] = await Promise.all([
    getCheckin(ctx, riderId, today),
    listCheckins(ctx, { from: addDaysIso(today, -13), to: today, riderIds: [riderId] }),
    getInsights(ctx, { riderIds: [riderId], today }),
    getRiderRecords(ctx, riderId, { today }),
    listGoals(ctx, riderId, today),
    getRider(ctx, riderId),
  ]);
  return {
    checkin: checkinValues(checkin),
    days: zoneDays(recent, today),
    insight: insights[0] ?? null,
    records,
    goals,
    dcuProposal: rider ? dcuProposalFor(rider, goals, today) : null,
  };
}

/**
 * The front page, by who is looking. A rider sees today's and tomorrow's
 * sessions with a big "Udført", the check-in, the week at a glance, the
 * upload and their form; a coach sees who needs attention, the team's day
 * and the week's team events — or, on an empty team, the three steps to
 * start; a parent sees each confirmed child's week. One person can be more
 * than one of these, and sees each part. A ride shared to Kadence from the
 * phone lands here with what became of it (`?shared=`, ADR 0029).
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
  const word = (key: string) => (typeof search[key] === "string" ? search[key] : undefined);
  const today = todayInCopenhagen();
  const tomorrow = addDaysIso(today, 1);
  const monday = weekFrom(undefined, today);
  const days = weekDates(monday);
  const sunday = days[6] ?? today;

  const riders = me?.isCoach ? await getRiders(ctx) : [];
  const soloRider = me?.rider && riders.length === 1 && riders[0]?.id === me.rider.id;
  const own = me?.rider
    ? await weekOf(ctx, me.rider.id, monday, maxIso([sunday, addDaysIso(today, 6)]), today)
    : null;
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
      .map(async (c) => ({ ...c, week: await weekOf(ctx, c.riderId, monday, sunday, today) })),
  );
  const waiting = (me?.children ?? []).some((c) => !c.confirmed);
  // Confirmed, but the rider does not share training: the database hides the row (ADR 0011).
  const hidden = (me?.children ?? []).some((c) => c.confirmed && c.name === null);
  const mine = me?.rider ? await riderDay(ctx, me.rider.id, today) : null;
  const [attention, settings] = team
    ? await Promise.all([getInsights(ctx, { today }), getTeamSettings(ctx)])
    : [null, null];
  const tips =
    attention && settings
      ? await teamTips(ctx, {
          today,
          locale,
          riders,
          flagKinds: attention.flatMap((i) => i.flags.map((f) => f.kind)),
          allowYouthWeight: settings.allowYouthWeight,
        })
      : [];
  const nothing = !me || (!me.isCoach && !me.rider && me.children.length === 0);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader
        title={t("title")}
        subtitle={<span className="first-letter:uppercase">{dayLong(today, locale)}</span>}
      />

      <SharedNotice shared={word("shared")} count={word("count")} reason={word("reason")} />

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
          {mine && (
            <CheckinSection
              riderId={me.rider.id}
              today={today}
              initial={mine.checkin}
              days={mine.days}
            />
          )}
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
            <SendToDeviceButton sessions={own.toDevice} week />
          </section>
          <section aria-labelledby="rider-upload" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="rider-upload" className="text-lg font-semibold">
                {t("rider.upload")}
              </h2>
              <p className="text-meta text-2sm leading-relaxed">{t("rider.uploadBody")}</p>
            </div>
            <FitUpload riderId={me.rider.id} compact />
          </section>
          {mine?.insight && (
            <section aria-labelledby="rider-form" className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h2 id="rider-form" className="text-lg font-semibold">
                  {t("rider.form")}
                </h2>
                <p className="text-meta text-2sm leading-relaxed">{t("rider.formBody")}</p>
              </div>
              <LoadPanel insight={mine.insight} />
            </section>
          )}
          {mine && (
            <section aria-labelledby="rider-goals" className="flex flex-col gap-3">
              <h2 id="rider-goals" className="text-lg font-semibold">
                {t("rider.goals")}
              </h2>
              <GoalsCard
                riderId={me.rider.id}
                goals={mine.goals.map((g) => ({ ...g, kind: g.kind as GoalView["kind"] }))}
                today={today}
                dcuProposal={mine.dcuProposal}
                canWrite
              />
            </section>
          )}
          {mine && (
            <section aria-labelledby="rider-records" className="flex flex-col gap-3">
              <h2 id="rider-records" className="text-lg font-semibold">
                {t("rider.records")}
              </h2>
              <RecordsCard byPeriod={mine.records.byPeriod} />
            </section>
          )}
        </>
      )}

      {me?.isCoach && riders.length === 0 && <GettingStarted />}
      {attention && (
        <AttentionSection insights={attention} aiAllowed={Boolean(settings?.aiOnRiderData)} />
      )}
      {tips.length > 0 && <CoachTips tips={tips} />}
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
      {hidden && <EmptyState title={t("parent.hiddenTitle")} hint={t("parent.hiddenBody")} />}

      {openSession && me && (
        <SessionSheet key={openSession} closeHref="/today" title={t("sessionPanel")}>
          <SessionView ctx={ctx} me={me} sessionId={openSession} closeHref="/today" />
        </SessionSheet>
      )}
    </div>
  );
}
