import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { withQuery } from "@/components/calendar/href";
import { RiderSwitch } from "@/components/common/rider-switch";
import { basisText } from "@/components/season/basis-text";
import { CreatePlan } from "@/components/season/create-plan";
import { DcuReference } from "@/components/season/dcu-reference";
import { IntensityWeeks } from "@/components/season/intensity-weeks";
import { ResetPlan } from "@/components/season/reset-plan";
import { SeasonChart } from "@/components/season/season-chart";
import { SeasonPlan } from "@/components/season/season-plan";
import { TeamPlans } from "@/components/season/team-plans";
import { TeamSeason } from "@/components/season/team-season";
import { ViewSwitch } from "@/components/season/view-switch";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { seasonStartYear } from "@/modules/dcu";
import { isSeniorBasis, referenceOf } from "@/modules/paradigms";
import { intensityWeeks } from "@/modules/season/intensity";
import { getSeasonPlan, riderClass } from "@/modules/season/plans";
import { teamPlanGaps } from "@/modules/season/team-plans";
import { seasonVolumes, teamSeasonVolumes } from "@/modules/season/volumes";
import { whoAmI } from "@/modules/team/access";
import { getRiders } from "@/modules/team/riders";
import { getTeamSettings } from "@/modules/team/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("season");
  return { title: t("title") };
}

type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * The season plan (ADR 0014, 0015): twelve months from October with the
 * plan's hours, DCU's beside them and what was ridden, the deviation in
 * words, and where the numbers come from. A coach picks the rider, a rider
 * sees their own, a parent their child's without a pen; `?season=` moves a
 * season back or forward — the coming one is planned in September. A
 * coach's `?view=team` shows every rider's month and season so far in the
 * four numbers (ADR 0040), and one press makes a plan for every rider who
 * has none this season. In this season, the weeks around today show
 * how the bike sessions spread over three zones (ADR 0053). A senior's
 * plan stands against their training profile's hours, Kadence's own,
 * and says so (ADR 0091).
 */
export default async function SeasonPage({ searchParams }: { searchParams: Search }) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("season");
  const search = await searchParams;
  const param = (key: string) => (typeof search[key] === "string" ? search[key] : undefined);
  const [me, visible] = await Promise.all([whoAmI(ctx.orgId, ctx.userId), getRiders(ctx)]);
  const today = todayInCopenhagen();
  const current = seasonStartYear(today);
  const asked = Number(param("season"));
  const season = Number.isInteger(asked) && Math.abs(asked - current) <= 3 ? asked : current;

  if (!me || visible.length === 0) {
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        <PageHeader title={t("title")} />
        {me?.isCoach ? (
          <EmptyState
            title={t("noRiders.coachTitle")}
            hint={t("noRiders.coachBody")}
            action={
              <Link href="/riders" className={buttonVariants()}>
                {t("noRiders.coachAction")}
              </Link>
            }
          />
        ) : (
          <EmptyState title={t("noRiders.title")} hint={t("noRiders.body")} />
        )}
      </div>
    );
  }

  if (me.isCoach && param("view") === "team") {
    const [volumes, gaps, settings] = await Promise.all([
      teamSeasonVolumes(
        ctx,
        visible.map((r) => r.id),
        today,
      ),
      teamPlanGaps(ctx, current),
      getTeamSettings(ctx),
    ]);
    return (
      <div className="flex min-w-0 max-w-4xl flex-col gap-7">
        <PageHeader title={t("title")} subtitle={t("team.subtitle")} />
        <ViewSwitch team riderHref="/season" />
        <TeamPlans gaps={gaps} seasonStartYear={current} guided={settings.guidance !== "none"} />
        <TeamSeason
          month={Number(today.slice(5, 7))}
          rows={visible.flatMap((r) => {
            const v = volumes.get(r.id);
            return v
              ? [{ id: r.id, name: r.name, href: withQuery("/season", { rider: r.id }), ...v }]
              : [];
          })}
        />
      </div>
    );
  }

  const rider =
    visible.find((r) => r.id === param("rider")) ??
    visible.find((r) => r.id === me.rider?.id) ??
    visible[0]!;
  const [plan, volumes, intensity] = await Promise.all([
    getSeasonPlan(ctx, rider.id, season),
    seasonVolumes(ctx, rider.id, season, today),
    // The weeks around today belong to this season only (ADR 0053).
    season === current ? intensityWeeks(ctx, rider.id, today) : null,
  ]);
  // The four numbers' two calendar sides, month by month (ADR 0040).
  const tenth = (v: number) => Math.round(v * 10) / 10;
  const ridden = volumes.map((v) => ({ month: v.month, hours: tenth(v.volume.done) }));
  const scheduled = volumes.map((v) => ({ month: v.month, hours: tenth(v.volume.planned) }));
  const canWrite = me.isCoach || me.rider?.id === rider.id;
  const href = (query: { rider?: string; season?: number }) =>
    withQuery("/season", {
      rider: visible.length > 1 ? (query.rider ?? rider.id) : null,
      season: (query.season ?? season) === current ? null : String(query.season ?? season),
    });
  // DCU's number beside the plan, when the team plans by DCU (ADR 0049) —
  // or a senior's profile's (ADR 0091), as the deviations were read.
  const dcu = plan && plan.guided ? plan.deviations.map((d) => d.dcu) : null;
  const reference = referenceOf(plan?.basis);
  const guided = plan ? plan.guided : (await getTeamSettings(ctx)).guidance !== "none";
  const tBasis = (k: "basis" | "basisSenior", v: Record<string, string | number>) => t(k, v);
  const riderBasis = riderClass(rider, season).basis;
  const senior = guided && (plan ? isSeniorBasis(plan.basis) : isSeniorBasis(riderBasis));

  return (
    <div className="flex min-w-0 max-w-4xl flex-col gap-7">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", { name: rider.name, from: season, to: season + 1 })}
        actions={
          visible.length > 1 ? (
            <RiderSwitch
              value={rider.id}
              options={visible.map((r) => ({
                id: r.id,
                name: r.name,
                href: href({ rider: r.id }),
              }))}
            />
          ) : undefined
        }
      />

      {me.isCoach && visible.length > 1 && <ViewSwitch team={false} riderHref={href({})} />}

      <nav aria-label={t("seasonNav")} className="flex flex-wrap items-center gap-2">
        <Link
          href={href({ season: season - 1 })}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "max-sm:h-11")}
        >
          <ChevronLeft data-icon="inline-start" />
          {t("previous")}
        </Link>
        <span className="text-sm font-semibold tabular-nums">
          {t("seasonLabel", { from: season, to: String(season + 1).slice(2) })}
        </span>
        <Link
          href={href({ season: season + 1 })}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "max-sm:h-11")}
        >
          {t("next")}
          <ChevronRight data-icon="inline-end" />
        </Link>
        {season !== current && (
          <Link
            href={href({ season: current })}
            className="focus-ring text-primary px-1 text-2sm hover:underline"
          >
            {t("thisSeason")}
          </Link>
        )}
      </nav>

      {plan ? (
        <>
          <section aria-labelledby="season-chart" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 id="season-chart" className="text-lg font-semibold">
                  {t("chart.title")}
                </h2>
                <p className="text-meta text-2sm">
                  {t(
                    !guided
                      ? "basisOwn"
                      : isSeniorBasis(plan.basis)
                        ? "basisNowSenior"
                        : "basisNow",
                    { basis: basisText(plan.basis, tBasis) },
                  )}
                </p>
              </div>
              {canWrite && guided && <ResetPlan planId={plan.id} basis={plan.basis} />}
            </div>
            <div className="border-border bg-card rounded-xl border p-4 shadow-surface sm:p-5">
              <SeasonChart
                reference={reference}
                months={plan.months.map((m, i) => ({
                  month: m.month,
                  planned: m.hours,
                  dcu: dcu ? (dcu[i] ?? 0) : null,
                  scheduled: scheduled.find((r) => r.month === m.month)?.hours ?? 0,
                  ridden: ridden.find((r) => r.month === m.month)?.hours ?? 0,
                }))}
              />
            </div>
          </section>
          <section aria-labelledby="season-months" className="flex flex-col gap-3">
            <h2 id="season-months" className="text-lg font-semibold">
              {t("monthsTitle")}
            </h2>
            {!canWrite && <p className="text-meta text-2sm">{t("readOnlyNote")}</p>}
            <SeasonPlan
              plan={{
                id: plan.id,
                basis: plan.basis,
                months: plan.months,
                dcu,
                reference,
                note: plan.note,
              }}
              ridden={ridden}
              scheduled={scheduled}
              canWrite={canWrite}
            />
          </section>
        </>
      ) : canWrite ? (
        <CreatePlan
          key={`${rider.id}-${season}`}
          riderId={rider.id}
          seasonStartYear={season}
          riderBasis={riderBasis}
          guided={guided}
        />
      ) : (
        <EmptyState title={t("none.title")} hint={t("none.readOnly")} />
      )}

      {intensity && (
        <IntensityWeeks
          data={intensity}
          today={today}
          guided={guided && !senior}
          isCoach={me.isCoach}
        />
      )}

      {senior && (
        <section
          aria-labelledby="season-reference"
          className="border-border flex flex-col gap-1 border-t pt-6"
        >
          <h2 id="season-reference" className="text-lg font-semibold">
            {t("senior.referenceTitle")}
          </h2>
          <p className="text-meta text-2sm leading-relaxed">{t("senior.referenceBody")}</p>
        </section>
      )}

      {guided && !senior && (
        <section
          aria-labelledby="season-reference"
          className="border-border flex flex-col gap-4 border-t pt-6"
        >
          <div className="flex flex-col gap-1">
            <h2 id="season-reference" className="text-lg font-semibold">
              {t("reference.title")}
            </h2>
            <p className="text-meta text-2sm leading-relaxed">{t("reference.body")}</p>
          </div>
          <DcuReference />
        </section>
      )}
    </div>
  );
}
