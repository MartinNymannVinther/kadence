import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { riders, seasonPlans } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import {
  MONTH_NOTES,
  PHASES,
  SEASON_MONTHS,
  phaseOf,
  type MonthDeviation,
  type SeasonPlanMonth,
} from "@/modules/dcu";
import { isPlanBasis, isSeniorBasis, type Paradigm, type PlanBasis } from "@/modules/paradigms";
import { requireWriteFor } from "@/modules/team/access";
import { teamParadigm } from "@/modules/team/settings";
import { riderClass } from "./class";

export { riderClass };

/**
 * A rider's season plan (ADR 0014, 0015): twelve months from October,
 * filled from DCU's hours for the rider's class and year in it, then the
 * coach's to change. Every read comes with DCU's number beside the plan's,
 * so a deviation is always in view. A team that plans without DCU
 * (ADR 0049) starts from empty months, and no number stands beside them.
 * A senior plans from their training profile, Kadence's own numbers
 * where DCU has none (docs/adr/0091), and the profile's hours stand
 * beside the plan in DCU's place.
 */

/**
 * The twelve months a new plan starts with: the paradigm's hours, phases
 * and notes, or, without a paradigm, the same months at nought hours and
 * with no note — the coach's own to fill. DCU's notes are written for
 * young riders; a senior's months start without them.
 */
export function startingMonths(
  basis: PlanBasis,
  seasonStartYear: number,
  paradigm: Paradigm | null,
): SeasonPlanMonth[] {
  void seasonStartYear;
  const dcuNotes = paradigm !== null && !isSeniorBasis(basis);
  return SEASON_MONTHS.map((month) => ({
    month,
    hours: paradigm ? paradigm.monthHours(basis, month) : 0,
    phase: phaseOf(month),
    note: dcuNotes ? (MONTH_NOTES[month] ?? "") : "",
  }));
}

/**
 * Each planned month beside the paradigm's hours for the basis, in the
 * order given: the same numbers as DCU's `compareToDcu` for a
 * class-year, the profile's for a senior. Unrounded; format at the edge.
 */
export function compareToReference(
  months: ReadonlyArray<{ month: number; hours: number }>,
  basis: PlanBasis,
  paradigm: Paradigm,
): MonthDeviation[] {
  return months.map(({ month, hours }) => {
    const dcu = paradigm.monthHours(basis, month);
    const diff = hours - dcu;
    return { month, planned: hours, dcu, diff, diffPct: dcu === 0 ? null : (diff / dcu) * 100 };
  });
}

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
  basis: PlanBasis;
  months: SeasonPlanMonth[];
  /** Empty when the team plans without DCU; for a senior, against the profile's hours. */
  deviations: MonthDeviation[];
  /** Whether the team plans by DCU (ADR 0049), so DCU's numbers stand beside the plan. */
  guided: boolean;
  note: string;
};

function view(
  row: typeof seasonPlans.$inferSelect,
  paradigm: Paradigm | null,
): SeasonPlanView | null {
  if (!isPlanBasis(row.basis)) return null;
  const parsed = SeasonMonthsInput.safeParse(row.months);
  if (!parsed.success) return null;
  return {
    id: row.id,
    riderId: row.riderId,
    seasonStartYear: row.seasonStartYear,
    basis: row.basis,
    months: parsed.data,
    deviations: paradigm ? compareToReference(parsed.data, row.basis, paradigm) : [],
    guided: paradigm !== null,
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
    return row ? view(row, await teamParadigm(tx, ctx.orgId)) : null;
  });
}

/**
 * A new plan from DCU's table for the rider's class, or the senior's
 * profile — or for the basis the coach chose.
 */
export async function createSeasonPlan(
  ctx: OrgContext,
  riderId: string,
  seasonStartYear: number,
  basis?: PlanBasis,
): Promise<{ id: string }> {
  return withOrgContext(ctx, async (tx) => {
    await requireWriteFor(tx, ctx, riderId);
    const [rider] = await tx.select().from(riders).where(eq(riders.id, riderId));
    if (!rider) throw new Refused("notFound");
    const chosen = basis ?? riderClass(rider, seasonStartYear).basis;
    if (!chosen) throw new Refused("invalid", "noDcuClass");
    const months = startingMonths(chosen, seasonStartYear, await teamParadigm(tx, ctx.orgId));
    const [row] = await tx
      .insert(seasonPlans)
      .values({ orgId: ctx.orgId, riderId, seasonStartYear, basis: chosen, months })
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
  basis: PlanBasis,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(seasonPlans).where(eq(seasonPlans.id, planId));
    if (!row) throw new Refused("notFound");
    await requireWriteFor(tx, ctx, row.riderId);
    const months = startingMonths(basis, row.seasonStartYear, await teamParadigm(tx, ctx.orgId));
    await tx.update(seasonPlans).set({ basis, months }).where(eq(seasonPlans.id, planId));
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
