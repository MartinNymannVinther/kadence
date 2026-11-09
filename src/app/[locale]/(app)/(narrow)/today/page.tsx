import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GarminDerivedNote } from "@/components/devices/garmin-attribution";
import { PageHeader } from "@/components/ui/page-header";
import { garminRidesLately } from "@/modules/devices/garmin-rides";
import { calendarHref, withQuery } from "@/components/calendar/href";
import { toCard, toEventCard } from "@/components/calendar/to-card";
import { SessionSheet } from "@/components/session/session-sheet";
import { SessionView } from "@/components/session/session-view";
import { AttentionTop } from "@/components/today/attention-top";
import { CoachToday } from "@/components/today/coach-today";
import { GettingStarted } from "@/components/today/getting-started";
import { NextWeekCard } from "@/components/today/next-week-card";
import { RiderNews } from "@/components/today/rider-news";
import { SharedNotice } from "@/components/today/shared-notice";
import { coverShown, todayElsewhere } from "@/components/today/where";
import { dayLong } from "@/components/training/day-label";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen, weekNumber } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { whoAmI } from "@/modules/team/access";
import { orgImageUrls } from "@/modules/team/images";
import { getRiders } from "@/modules/team/riders";
import { workspaceKind } from "@/modules/team/workspace-kind";
import { coachOverview } from "./coach-data";
import { riderDay } from "./rider-data";
import { RiderToday } from "./rider-today";

/**
 * A coach's front page is Overblik, as the menu calls it (nav-items.ts);
 * everyone else's is I dag, and so is the person's in a personal
 * workspace, who is their own coach (ADR 0080).
 */
async function coachFront(ctx: { orgId: string; userId: string }, isCoach: boolean) {
  return isCoach && (await workspaceKind(ctx.orgId, ctx.userId)) !== "personal";
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("today");
  const ctx = await getOrgContext();
  const me = ctx ? await whoAmI(ctx.orgId, ctx.userId) : null;
  const overview = ctx && me ? await coachFront(ctx, me.isCoach) : false;
  return { title: overview ? t("overview.title") : t("title") };
}

const hrefFor = (sessionId: string) => withQuery("/today", { session: sessionId });

/**
 * The front page, by who is looking (docs/adr/0063). A rider's is I dag:
 * the first steps while they are not done, today's session with a big
 * "Udført", "how hard" about the last ride, the check-in and tomorrow;
 * the rest of their picture is on Mig. A coach's is Overblik, because a
 * coach's unit is the week: whether next week is planned and what is in
 * it, the three riders most worth a look this week — the whole list is in
 * the team's week — what the riders have written lately, then the team's
 * day and the week's events; on an empty team, the three steps to start.
 * A parent who is nothing else has one page, the child's (/parents). One
 * person can be more than one of these, and sees each part. The club's
 * picture shows on an empty day only. A ride shared to Kadence from the
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
  const elsewhere = todayElsewhere(me);
  if (elsewhere) {
    redirect({ href: withQuery(elsewhere, { session: openSession }), locale });
    return null;
  }
  const word = (key: string) => (typeof search[key] === "string" ? search[key] : undefined);
  const today = todayInCopenhagen();

  const riders = me?.isCoach ? await getRiders(ctx) : [];
  const overview = me ? await coachFront(ctx, me.isCoach) : false;
  // A parent who owns their child's workspace and does not ride lands on
  // the child's page, which is their menu's first place (ADR 0080).
  if (me?.isCoach && !overview && !me.rider && riders.length === 1) {
    redirect({ href: `/riders/${riders[0]!.id}`, locale });
    return null;
  }
  const soloRider = me?.rider && riders.length === 1 && riders[0]?.id === me.rider.id;
  const mine = me?.rider
    ? await riderDay(ctx, me.rider.id, today, {
        today: t("rpe.today"),
        yesterday: t("rpe.yesterday"),
        locale,
      })
    : null;
  const team =
    overview && riders.length > 0 && !soloRider ? await coachOverview(ctx, riders, today) : null;
  const nothing = !me || (!me.isCoach && !me.rider && me.children.length === 0);
  const fromGarmin = await garminRidesLately(
    ctx,
    [...new Set([...riders.map((r) => r.id), ...(me?.rider ? [me.rider.id] : [])])],
    today,
  );
  const sessionsToday = (mine?.today.length ?? 0) + (team?.sessionsToday.length ?? 0);
  const cover = coverShown({ sessionsToday, waiting: Boolean(mine?.toRate) })
    ? (await orgImageUrls(ctx)).cover
    : null;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      {cover && (
        // The club's own picture (ADR 0048), behind its login, on an empty day.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="border-border -mb-3 h-32 w-full rounded-xl border object-cover sm:h-40"
        />
      )}
      <PageHeader
        title={overview ? t("overview.title") : t("title")}
        subtitle={
          // Inline-block, so the weekday's first letter can be a capital.
          <span className="inline-block first-letter:uppercase">
            {overview
              ? t("overview.subtitle", { day: dayLong(today, locale), week: weekNumber(today) })
              : dayLong(today, locale)}
          </span>
        }
        actions={
          team && (
            <>
              <Link
                href={calendarHref({ view: "team" })}
                className={cn(buttonVariants({ variant: "outline" }), "max-sm:h-11")}
              >
                {t("overview.teamWeek")}
              </Link>
              <Link href="/calendar/week-plan" className={cn(buttonVariants(), "max-sm:h-11")}>
                {t("overview.plan")}
              </Link>
            </>
          )
        }
      />
      <GarminDerivedNote show={fromGarmin} className="-mt-5" />

      <SharedNotice shared={word("shared")} count={word("count")} reason={word("reason")} />

      {nothing && <EmptyState title={t("none.title")} hint={t("none.body")} />}

      {mine && me?.rider && (
        <RiderToday riderId={me.rider.id} day={mine} today={today} hrefFor={hrefFor} />
      )}

      {me?.isCoach && riders.length === 0 && <GettingStarted />}
      {team && (
        <>
          <NextWeekCard summary={team.nextWeek} />
          <AttentionTop insights={team.insights} />
          <RiderNews items={team.news} today={today} />
          <CoachToday
            riders={riders.map((r) => ({ id: r.id, name: r.name }))}
            sessions={team.sessionsToday.map(toCard)}
            teamEvents={team.teamEvents.map(toEventCard)}
            today={today}
            hrefFor={hrefFor}
          />
        </>
      )}

      {me && me.children.length > 0 && (
        // A coach or rider who is also a parent: the child's page is one tap away.
        <Link
          href="/parents"
          className="focus-ring text-primary flex min-h-11 w-fit items-center text-2sm font-medium hover:underline"
        >
          {t("parent.link", { count: me.children.length })}
        </Link>
      )}

      {openSession && me && (
        <SessionSheet key={openSession} closeHref="/today" title={t("sessionPanel")}>
          <SessionView ctx={ctx} me={me} sessionId={openSession} closeHref="/today" />
        </SessionSheet>
      )}
    </div>
  );
}
