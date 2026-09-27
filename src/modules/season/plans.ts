import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { riders, seasonPlans } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import {
  buildSeasonPlan,
  compareToDcu,
  isClassBasis,
  PHASES,
  type ClassBasis,
  type MonthDeviation,
  type SeasonPlanMonth,
} from "@/modules/dcu";
import { requireWriteFor } from "@/modules/team/access";
import { riderClass } from "./class";

export { riderClass };

/**
 * A rider's season plan (ADR 0014, 0015): twelve months from October,
 * filled from DCU's hours for the rider's class and year in it, then the
 * coach's to change. Every read comes with DCU's number beside the plan's,
 * so a deviation is always in view.
 */

const monthSchema = z.object({
  month: z.number().int().min(1).max(12),
  hours: z.coerce.number().min(0).max(200),
  phase: z.enum(PHASES),
  note: z.string().trim().max(500).default(""),
});

export const SeasonMonthsInput = z
  .array(monthSchema)
  .length(12)
  .refine((months) => new Set(months.map((m) => m.month)).size === 12);

export type SeasonPlanView = {
  id: string;
  riderId: string;
  seasonStartYear: number;
  basis: ClassBasis;
  months: SeasonPlanMonth[];
  deviations: MonthDeviation[];
  note: string;
};

function view(row: typeof seasonPlans.$inferSelect): SeasonPlanView | null {
  if (!isClassBasis(row.basis)) return null;
  const parsed = SeasonMonthsInput.safeParse(row.months);
  if (!parsed.success) return null;
  return {
    id: row.id,
    riderId: row.riderId,
    seasonStartYear: row.seasonStartYear,
    basis: row.basis,
    months: parsed.data,
    deviations: compareToDcu(parsed.data, row.basis),
    note: row.note,
  };
}

export async function getSeasonPlan(
  ctx: OrgContext,
  riderId: string,
  seasonStartYear: number,
): Promise<SeasonPlanView | null> {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx
      .select()
      .from(seasonPlans)
      .where(
        and(eq(seasonPlans.riderId, riderId), eq(seasonPlans.seasonStartYear, seasonStartYear)),
      );
    return row ? view(row) : null;
  });
}

/** A new plan from DCU's table for the rider's class — or for the basis the coach chose. */
export async function createSeasonPlan(
  ctx: OrgContext,
  riderId: string,
  seasonStartYear: number,
  basis?: ClassBasis,
): Promise<{ id: string }> {
  return withOrgContext(ctx, async (tx) => {
    await requireWriteFor(tx, ctx, riderId);
    const [rider] = await tx.select().from(riders).where(eq(riders.id, riderId));
    if (!rider) throw new Refused("notFound");
    const chosen = basis ?? riderClass(rider, seasonStartYear).basis;
    if (!chosen) throw new Refused("invalid", "noDcuClass");
    const plan = buildSeasonPlan(chosen, seasonStartYear);
    const [row] = await tx
      .insert(seasonPlans)
      .values({ orgId: ctx.orgId, riderId, seasonStartYear, basis: chosen, months: plan.months })
      .onConflictDoNothing()
      .returning({ id: seasonPlans.id });
    if (!row) throw new Refused("conflict", "planExists");
    return row;
  });
}

export async function saveSeasonMonths(
  ctx: OrgContext,
  planId: string,
  months: z.infer<typeof SeasonMonthsInput>,
  note: string,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(seasonPlans).where(eq(seasonPlans.id, planId));
    if (!row) throw new Refused("notFound");
    await requireWriteFor(tx, ctx, row.riderId);
    await tx.update(seasonPlans).set({ months, note }).where(eq(seasonPlans.id, planId));
  });
}

/**
 * The plan filled again from DCU's table for another class-year — a rider
 * who starts late and plans from an earlier year's hours, say. The months
 * start over from DCU; the plan's note is kept. The deviation from then on
 * is against the basis chosen here.
 */
export async function resetSeasonPlan(
  ctx: OrgContext,
  planId: string,
  basis: ClassBasis,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(seasonPlans).where(eq(seasonPlans.id, planId));
    if (!row) throw new Refused("notFound");
    await requireWriteFor(tx, ctx, row.riderId);
    const plan = buildSeasonPlan(basis, row.seasonStartYear);
    await tx
      .update(seasonPlans)
      .set({ basis, months: plan.months })
      .where(eq(seasonPlans.id, planId));
  });
}

export async function deleteSeasonPlan(ctx: OrgContext, planId: string): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(seasonPlans).where(eq(seasonPlans.id, planId));
    if (!row) throw new Refused("notFound");
    await requireWriteFor(tx, ctx, row.riderId);
    await tx.delete(seasonPlans).where(eq(seasonPlans.id, planId));
  });
}
