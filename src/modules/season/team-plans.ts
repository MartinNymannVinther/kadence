import { eq } from "drizzle-orm";
import { riders, seasonPlans, type RiderRow } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { isPlanBasis, isSeniorBasis, type PlanBasis } from "@/modules/paradigms";
import { requireCoach } from "@/modules/team/access";
import { teamParadigm } from "@/modules/team/settings";
import { riderClass } from "./class";
import { startingMonths } from "./plans";

/**
 * Season plans for the whole team at once (docs/plan-fokus-vinter.md,
 * wave 4): every rider on the team without a plan for the season gets
 * one, filled the way "Opret fra DCU" fills a single rider's — DCU's
 * hours and phases for the rider's own class and year, or empty months
 * when the team plans without DCU (ADR 0049). A senior is planned on
 * their training profile — Motionist when none is chosen — as their own
 * page would plan them (ADR 0092, changing ADR 0091's choice to leave
 * them out). A rider in none of the classes, younger than U17, is left
 * for the coach to plan on the rider's own page, where the class is
 * chosen. A plan that exists is never touched. Coaches only.
 */

export type TeamPlanGaps = {
  /** Riders on the team without a plan for the season, who can get one here. */
  missing: number;
  /** Riders without a plan who are in none of the classes or profiles this season. */
  noClass: number;
  /** Of `missing`, the adults, planned on their training profile (ADR 0092). */
  seniors: number;
};

async function gaps(tx: AppTransaction, seasonStartYear: number) {
  const team = await tx.select().from(riders).where(eq(riders.archived, false));
  const planned = await tx
    .select({ riderId: seasonPlans.riderId })
    .from(seasonPlans)
    .where(eq(seasonPlans.seasonStartYear, seasonStartYear));
  const has = new Set(planned.map((p) => p.riderId));
  const without = team.filter((r) => !has.has(r.id));
  const withClass: { rider: RiderRow; basis: PlanBasis }[] = [];
  for (const rider of without) {
    // A senior's basis is their training profile, Motionist by default (ADR 0091, 0092).
    const basis = riderClass(rider, seasonStartYear).basis;
    if (isPlanBasis(basis)) withClass.push({ rider, basis });
  }
  return { withClass, noClass: without.length - withClass.length };
}

/** How many of the team's riders lack a plan for the season, for the button's words. */
export async function teamPlanGaps(
  ctx: OrgContext,
  seasonStartYear: number,
): Promise<TeamPlanGaps> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const { withClass, noClass } = await gaps(tx, seasonStartYear);
    const seniors = withClass.filter((w) => isSeniorBasis(w.basis)).length;
    return { missing: withClass.length, noClass, seniors };
  });
}

/**
 * Creates the missing plans in one transaction and says how many were
 * made, and how many riders were left because they have no class.
 */
export async function createTeamSeasonPlans(
  ctx: OrgContext,
  seasonStartYear: number,
): Promise<{ created: number; noClass: number }> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const { withClass, noClass } = await gaps(tx, seasonStartYear);
    if (withClass.length === 0) return { created: 0, noClass };
    const paradigm = await teamParadigm(tx, ctx.orgId);
    const rows = await tx
      .insert(seasonPlans)
      .values(
        withClass.map(({ rider, basis }) => ({
          orgId: ctx.orgId,
          riderId: rider.id,
          seasonStartYear,
          basis,
          months: startingMonths(basis, seasonStartYear, paradigm),
        })),
      )
      // A plan made in the meantime — by the rider, say — stays as it is.
      .onConflictDoNothing()
      .returning({ id: seasonPlans.id });
    return { created: rows.length, noClass };
  });
}
