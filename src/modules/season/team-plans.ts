import { eq } from "drizzle-orm";
import { riders, seasonPlans, type RiderRow } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { isClassBasis, type ClassBasis } from "@/modules/dcu";
import { requireCoach } from "@/modules/team/access";
import { teamParadigm } from "@/modules/team/settings";
import { riderClass } from "./class";
import { startingMonths } from "./plans";

/**
 * Season plans for the whole team at once (docs/plan-fokus-vinter.md,
 * wave 4): every rider on the team without a plan for the season gets
 * one, filled the way "Opret fra DCU" fills a single rider's — DCU's
 * hours and phases for the rider's own class and year, or empty months
 * when the team plans without DCU (ADR 0049). A rider outside DCU's
 * classes is left for the coach to plan on the rider's own page, where
 * the class is chosen — a senior too, whose training profile is chosen
 * there (ADR 0091). A plan that exists is never touched. Coaches only.
 */

export type TeamPlanGaps = {
  /** Riders on the team without a plan for the season, who can get one here. */
  missing: number;
  /** Riders without a plan who are in none of DCU's classes this season. */
  noClass: number;
};

async function gaps(tx: AppTransaction, seasonStartYear: number) {
  const team = await tx.select().from(riders).where(eq(riders.archived, false));
  const planned = await tx
    .select({ riderId: seasonPlans.riderId })
    .from(seasonPlans)
    .where(eq(seasonPlans.seasonStartYear, seasonStartYear));
  const has = new Set(planned.map((p) => p.riderId));
  const without = team.filter((r) => !has.has(r.id));
  const withClass: { rider: RiderRow; basis: ClassBasis }[] = [];
  for (const rider of without) {
    const basis = riderClass(rider, seasonStartYear).basis;
    // A senior's plan is made on their page, where the profile is chosen (ADR 0091).
    if (isClassBasis(basis)) withClass.push({ rider, basis });
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
    return { missing: withClass.length, noClass };
  });
}

/**
 * Creates the missing plans in one transaction and says how many were
 * made, and how many riders were left because they have no DCU class.
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
