import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { withQuery } from "@/components/calendar/href";
import { toCard, toEventCard } from "@/components/calendar/to-card";
import { ChildCard, type ChildView } from "@/components/parents/child-card";
import { ParentBasics } from "@/components/parents/parent-basics";
import { ParentGuide } from "@/components/parents/parent-guide";
import { SessionSheet } from "@/components/session/session-sheet";
import { SessionView } from "@/components/session/session-view";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { zoneDays } from "@/components/wellbeing/zone-days";
import { getOrgContext } from "@/core/auth/session";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { redirect } from "@/i18n/navigation";
import { getInsights } from "@/modules/insight/service";
import { whoAmI } from "@/modules/team/access";
import { getRider } from "@/modules/team/riders";
import { listEvents } from "@/modules/training/events";
import { listSessions } from "@/modules/training/sessions";
import { weekDates, weekFrom } from "@/modules/training/week";
import { listCheckins } from "@/modules/wellbeing/checkins";
import { GuidesCard } from "@/components/guides/guides-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parents");
  return { title: t("title") };
}

const hrefFor = (sessionId: string) => withQuery("/parents", { session: sessionId });

/** What a parent may see of one child this week, as the database lets them (ADR 0011). */
async function childView(
  ctx: OrgContext,
  riderId: string,
  week: { monday: string; sunday: string; today: string },
): Promise<ChildView | null> {
  const rider = await getRider(ctx, riderId);
  if (!rider) return null;
  const ahead = addDaysIso(week.today, 30);
  const [sessions, events, insights, checkins] = await Promise.all([
    listSessions(ctx, { from: week.monday, to: week.sunday, riderIds: [riderId] }),
    listEvents(ctx, { from: week.monday, to: ahead, riderIds: [riderId] }),
    getInsights(ctx, { riderIds: [riderId], today: week.today }),
    listCheckins(ctx, { from: addDaysIso(week.today, -13), to: week.today, riderIds: [riderId] }),
  ]);
  const cards = events.map(toEventCard);
  return {
    riderId,
    name: rider.name,
    shareTraining: rider.shareTraining,
    shareWellbeing: rider.shareWellbeing,
    sessions: sessions.map(toCard),
    events: cards.filter((e) => e.startsOn <= week.sunday),
    upcoming: cards
      .filter((e) => e.endsOn >= week.today && e.kind !== "holiday")
      .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
      .slice(0, 6),
    load: (insights[0]?.series ?? []).map((d) => ({
      date: d.date,
      fitness: d.fitness,
      fatigue: d.fatigue,
      form: d.form,
    })),
    zones: zoneDays(checkins, week.today),
  };
}

/**
 * The parents' page. For a parent, each confirmed child's week: the
 * sessions and whether they were done, the hours, the form in plain
 * words, what is coming, and how the child is doing if the child shares
 * it — never a pen. For everyone, "Forældreguiden" in Kadence's own words
 * with links to Team Danmark's originals, and three plain sections: sleep,
 * school beside sport, and what a parent can see here and why.
 */
export default async function ParentsPage({
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
  const t = await getTranslations("parents");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const search = await searchParams;
  const openSession = typeof search.session === "string" ? search.session : undefined;
  const today = todayInCopenhagen();
  const monday = weekFrom(undefined, today);
  const days = weekDates(monday);
  const week = { monday, sunday: days[6] ?? today, today };
  const confirmed = (me?.children ?? []).filter((c) => c.confirmed);
  const waiting = (me?.children ?? []).some((c) => !c.confirmed);
  // Confirmed, but the rider does not share training: the database hides the row (ADR 0011).
  const hidden = (me?.children ?? []).some((c) => c.confirmed && c.name === null);
  const children = (
    await Promise.all(confirmed.map((c) => childView(ctx, c.riderId, week)))
  ).filter((c): c is ChildView => c !== null);

  return (
    <div className="flex min-w-0 max-w-4xl flex-col gap-10">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {children.map((child) => (
        <ChildCard key={child.riderId} child={child} days={days} today={today} hrefFor={hrefFor} />
      ))}
      {waiting && <EmptyState title={t("waitingTitle")} hint={t("waitingBody")} />}
      {hidden && <EmptyState title={t("hiddenTitle")} hint={t("hiddenBody")} />}

      <GuidesCard body="fromParents" />

      <section aria-labelledby="parent-guide" className="flex flex-col gap-4">
        <ParentGuide />
      </section>

      <section aria-labelledby="parent-basics" className="flex flex-col gap-4">
        <h2 id="parent-basics" className="text-lg font-semibold">
          {t("basicsTitle")}
        </h2>
        <ParentBasics />
      </section>

      {openSession && me && (
        <SessionSheet key={openSession} closeHref="/parents" title={t("sessionPanel")}>
          <SessionView ctx={ctx} me={me} sessionId={openSession} closeHref="/parents" />
        </SessionSheet>
      )}
    </div>
  );
}
