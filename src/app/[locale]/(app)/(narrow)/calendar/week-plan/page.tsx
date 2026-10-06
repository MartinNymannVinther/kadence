import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { calendarHref, withQuery } from "@/components/calendar/href";
import { WeekNav } from "@/components/calendar/week-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { WeekPlanner } from "@/components/week-plan/week-planner";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import { seasonStartYear } from "@/modules/dcu";
import { riderClass } from "@/modules/season/class";
import { whoAmI } from "@/modules/team/access";
import { getRiders } from "@/modules/team/riders";
import { blockPlanItem } from "@/modules/training/block-items";
import { listBlocks } from "@/modules/training/blocks";
import { listTemplates } from "@/modules/training/templates";
import { weekFrom } from "@/modules/training/week";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("weekPlan");
  return { title: t("title") };
}

/**
 * "Planlæg ugen" (ADR 0043, 0058): the one place a coach plans a week —
 * for the whole team, chosen riders, or the one rider whose calendar it
 * was opened from — with its own way between weeks. `?week=` is the
 * week's Monday, this week's by default; `?rider=` the rider it was
 * opened for; `?start=ai` when a rider's "Foreslå ugen" led here.
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
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const riders = me?.isCoach ? await getRiders(ctx) : [];
  // Only a rider of this team is preselected; the database decided who that is.
  const rider = riders.find((r) => r.id === param("rider"));
  const backHref = rider
    ? calendarHref({ week: monday, rider: rider.id })
    : calendarHref({ week: monday, view: "team" });
  const back = (
    <Link
      href={backHref}
      className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm"
    >
      <ChevronLeft aria-hidden className="size-4" />
      {rider ? t("backRider") : t("back")}
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
  const [templates, blocks] = await Promise.all([listTemplates(ctx), listBlocks(ctx)]);

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
        backHref={backHref}
        preselect={rider?.id}
        start={param("start") === "ai" ? "ai" : undefined}
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
