import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { calendarHref, withQuery } from "@/components/calendar/href";
import { WeekNav } from "@/components/calendar/week-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { planAudience } from "@/components/week-plan/audience";
import { WeekPlanner } from "@/components/week-plan/week-planner";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import { seasonStartYear } from "@/modules/dcu";
import { riderClass } from "@/modules/season/class";
import { whoAmI } from "@/modules/team/access";
import { getRiders } from "@/modules/team/riders";
import { workspaceKind } from "@/modules/team/workspace-kind";
import { blockPlanItem } from "@/modules/training/block-items";
import { listBlocks } from "@/modules/training/blocks";
import { listTemplates } from "@/modules/training/templates";
import { weekFrom } from "@/modules/training/week";
import { TEAM_SCOPE } from "@/modules/training/week-draft-merge";
import { getWeekPlanDraft } from "@/modules/training/week-plan-draft";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("weekPlan");
  return { title: t("title") };
}

/**
 * "Planlæg ugen" (ADR 0043, 0059): the one place a coach plans a week —
 * for the whole team, chosen riders, or the one rider whose calendar it
 * was opened from — with its own way between weeks. `?week=` is the
 * week's Monday, this week's by default; `?rider=` the rider it was
 * opened for; `?start=ai` when a rider's "Foreslå ugen" led here. The
 * week's draft so far, shared by the team's coaches, comes along (ADR
 * 0043, amended 2026-10-07). In a personal workspace the week is the
 * person's own, or their child's, and the page says so (ADR 0080).
 */
export default async function WeekPlanPage({
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
  const t = await getTranslations("weekPlan");
  const search = await searchParams;
  const param = (key: string) => (typeof search[key] === "string" ? search[key] : undefined);
  const today = todayInCopenhagen();
  const monday = weekFrom(param("week"), today);
  const [me, kind] = await Promise.all([
    whoAmI(ctx.orgId, ctx.userId),
    workspaceKind(ctx.orgId, ctx.userId),
  ]);
  const riders = me?.isCoach ? await getRiders(ctx) : [];
  const audience = planAudience({
    workspace: kind,
    selfRiderId: me?.rider?.id ?? null,
    riders: riders.map((r) => ({ id: r.id, name: r.name })),
  });
  const team = audience.kind === "team";
  // Only a rider of this team is preselected; the database decided who that is.
  const rider = riders.find((r) => r.id === param("rider"));
  // A personal workspace has no team's week to go back to: its calendar is the one rider's.
  const backHref =
    rider || !team
      ? calendarHref({ week: monday, rider: rider?.id ?? riders[0]?.id })
      : calendarHref({ week: monday, view: "team" });
  const back = (
    <Link
      href={backHref}
      className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm"
    >
      <ChevronLeft aria-hidden className="size-4" />
      {!team ? t("backCalendar") : rider ? t("backRider") : t("back")}
    </Link>
  );
  const header = <PageHeader size="detail" title={t("title")} />;
  if (!me?.isCoach)
    return (
      <div className="flex min-w-0 flex-col gap-5">
        {back}
        {header}
        <EmptyState title={t("coachOnly")} />
      </div>
    );

  const season = seasonStartYear(monday);
  const scope = rider?.id ?? TEAM_SCOPE;
  const [templates, blocks, shared] = await Promise.all([
    listTemplates(ctx),
    listBlocks(ctx),
    getWeekPlanDraft(ctx, { monday, scope }),
  ]);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {back}
      {header}
      <WeekNav
        monday={monday}
        today={today}
        hrefFor={(week) => withQuery("/calendar/week-plan", { week, rider: rider?.id })}
      />
      <WeekPlanner
        key={`${monday} ${rider?.id ?? ""}`}
        monday={monday}
        today={today}
        scope={scope}
        shared={shared}
        backHref={backHref}
        preselect={rider?.id}
        start={param("start") === "ai" ? "ai" : undefined}
        audience={audience}
        riders={riders.map((r) => ({
          id: r.id,
          name: r.name,
          basis: riderClass(r, season).basis,
        }))}
        templates={templates.map((tpl) => ({
          id: tpl.id,
          name: tpl.name,
          sport: tpl.sport,
          plannedMinutes: tpl.plannedMinutes,
          source: tpl.source,
        }))}
        blocks={blocks.map((b) => ({
          id: b.id,
          name: b.name,
          weeks: b.weeks,
          items: b.items.map(blockPlanItem),
        }))}
      />
    </div>
  );
}
