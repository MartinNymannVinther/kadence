import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { withQuery } from "@/components/calendar/href";
import { toCard, toEventCard } from "@/components/calendar/to-card";
import { SessionSheet } from "@/components/session/session-sheet";
import { SessionView } from "@/components/session/session-view";
import { AttentionCount } from "@/components/today/attention-count";
import { CoachToday } from "@/components/today/coach-today";
import { GettingStarted } from "@/components/today/getting-started";
import { SharedNotice } from "@/components/today/shared-notice";
import { coverShown, todayElsewhere } from "@/components/today/where";
import { dayLong } from "@/components/training/day-label";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import { getInsights } from "@/modules/insight/service";
import { whoAmI } from "@/modules/team/access";
import { orgImageUrls } from "@/modules/team/images";
import { getRiders } from "@/modules/team/riders";
import { listEvents } from "@/modules/training/events";
import { listSessions } from "@/modules/training/sessions";
import { weekDates, weekFrom } from "@/modules/training/week";
import { riderDay } from "./rider-data";
import { RiderToday } from "./rider-today";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("today");
  return { title: t("title") };
}

const hrefFor = (sessionId: string) => withQuery("/today", { session: sessionId });

/**
 * The front page, by who is looking, and about today (docs/adr/0062). A
 * rider sees the first steps while they are not done, today's session
 * with a big "Udført", "how hard" about the last ride, the check-in and
 * tomorrow; the rest of their picture is on Mig. A coach sees how many
 * riders have something worth a look — the list itself is in the team's
 * week — and the team's day, or, on an empty team, the three steps to
 * start. A parent who is nothing else has one page, the child's
 * (/parents). One person can be more than one of these, and sees each
 * part. The club's picture shows on an empty day only. A ride shared to
 * Kadence from the phone lands here with what became of it (`?shared=`,
 * ADR 0029).
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
  const monday = weekFrom(undefined, today);
  const sunday = weekDates(monday)[6] ?? today;

  const riders = me?.isCoach ? await getRiders(ctx) : [];
  const soloRider = me?.rider && riders.length === 1 && riders[0]?.id === me.rider.id;
  const mine = me?.rider
    ? await riderDay(ctx, me.rider.id, today, {
        today: t("rpe.today"),
        yesterday: t("rpe.yesterday"),
        locale,
      })
    : null;
  const team =
    me?.isCoach && riders.length > 0 && !soloRider
      ? await Promise.all([
          listSessions(ctx, { from: today, to: today, riderIds: riders.map((r) => r.id) }),
          listEvents(ctx, { from: monday, to: sunday }),
          getInsights(ctx, { today }),
        ])
      : null;
  const nothing = !me || (!me.isCoach && !me.rider && me.children.length === 0);
  const sessionsToday = (mine?.today.length ?? 0) + (team?.[0].length ?? 0);
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
        title={t("title")}
        subtitle={<span className="first-letter:uppercase">{dayLong(today, locale)}</span>}
      />

      <SharedNotice shared={word("shared")} count={word("count")} reason={word("reason")} />

      {nothing && <EmptyState title={t("none.title")} hint={t("none.body")} />}

      {mine && me?.rider && (
        <RiderToday riderId={me.rider.id} day={mine} today={today} hrefFor={hrefFor} />
      )}

      {me?.isCoach && riders.length === 0 && <GettingStarted />}
      {team && (
        <>
          <AttentionCount count={team[2].filter((i) => i.flags.length > 0).length} />
          <CoachToday
            riders={riders.map((r) => ({ id: r.id, name: r.name }))}
            sessions={team[0].map(toCard)}
            teamEvents={team[1].filter((e) => e.riderId === null).map(toEventCard)}
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
