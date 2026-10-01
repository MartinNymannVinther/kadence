import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { calendarHref } from "@/components/calendar/href";
import { dayMonth } from "@/components/training/day-label";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { WeekPlanner } from "@/components/week-plan/week-planner";
import { getOrgContext } from "@/core/auth/session";
import { addDaysIso, todayInCopenhagen, weekNumber } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import { seasonStartYear } from "@/modules/dcu";
import { riderClass } from "@/modules/season/class";
import { whoAmI } from "@/modules/team/access";
import { getRiders } from "@/modules/team/riders";
import { listBlocks } from "@/modules/training/blocks";
import { listTemplates } from "@/modules/training/templates";
import { weekFrom } from "@/modules/training/week";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("weekPlan");
  return { title: t("title") };
}

/**
 * "Planlæg ugen" (ADR 0043): a coach's week for the whole team or chosen
 * riders, built in one place and laid into every calendar at once.
 * `?week=` is the week's Monday, this week's by default.
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
  const asked = (await searchParams).week;
  const monday = weekFrom(typeof asked === "string" ? asked : undefined, todayInCopenhagen());
  const backHref = calendarHref({ week: monday, view: "team" });
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const back = (
    <Link
      href={backHref}
      className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm"
    >
      <ChevronLeft aria-hidden className="size-4" />
      {t("back")}
    </Link>
  );
  const header = (
    <PageHeader
      size="detail"
      title={t("title")}
      subtitle={t("subtitle", {
        n: weekNumber(monday),
        from: dayMonth(monday, locale),
        to: dayMonth(addDaysIso(monday, 6), locale),
      })}
    />
  );
  if (!me?.isCoach)
    return (
      <div className="flex min-w-0 flex-col gap-5">
        {back}
        {header}
        <EmptyState title={t("coachOnly")} />
      </div>
    );

  const season = seasonStartYear(monday);
  const [riders, templates, blocks] = await Promise.all([
    getRiders(ctx),
    listTemplates(ctx),
    listBlocks(ctx),
  ]);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {back}
      {header}
      <WeekPlanner
        key={monday}
        monday={monday}
        backHref={backHref}
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
          items: b.items.map((i) => ({ day: i.day, templateId: i.templateId })),
        }))}
      />
    </div>
  );
}
