import { and, asc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { activities, riderGoals, riders, type RiderGoalRow } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { seasonStartYear } from "@/modules/dcu";
import { GOAL_KINDS, dcuWinterGoal, progressOf, type GoalKind } from "@/modules/load/goals";
import { riderClass } from "@/modules/season/class";
import { requireWriteFor } from "@/modules/team/access";

/**
 * A rider's process goals (ADR 0024): the coach's or the rider's to set,
 * whoever may read the rider's training reads them (RLS), and the
 * progress is read off the rider's activities each time — nothing is
 * counted twice or left stale. The one goal Kadence proposes, DCU's
 * winter strength sessions, is added only when someone presses it.
 */

export const GoalInput = z
  .object({
    riderId: z.string().min(1).max(100),
    title: z.string().trim().min(1).max(80),
    kind: z.enum(GOAL_KINDS),
    target: z.coerce.number().positive().max(9999),
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
    minHours: z.coerce.number().min(0.5).max(12).nullable().default(null),
    note: z.string().trim().max(300).default(""),
  })
  .refine((g) => g.endsOn >= g.startsOn, { path: ["endsOn"] });
export type GoalInputT = z.infer<typeof GoalInput>;

export type GoalWithProgress = RiderGoalRow & { done: number };

export async function addGoal(ctx: OrgContext, input: GoalInputT): Promise<{ id: string }> {
  return withOrgContext(ctx, async (tx) => {
    await requireWriteFor(tx, ctx, input.riderId);
    const [row] = await tx
      .insert(riderGoals)
      .values({ orgId: ctx.orgId, ...input, createdBy: ctx.userId })
      .returning({ id: riderGoals.id });
    return row!;
  });
}

/** DCU's winter strength goal for the rider's class this season, once. */
export async function addDcuWinterGoal(
  ctx: OrgContext,
  riderId: string,
  title: string,
): Promise<{ id: string } | null> {
  return withOrgContext(ctx, async (tx) => {
    await requireWriteFor(tx, ctx, riderId);
    const [rider] = await tx.select().from(riders).where(eq(riders.id, riderId));
    if (!rider) throw new Refused("notFound");
    const today = todayInCopenhagen();
    const klass = riderClass(rider, seasonStartYear(today));
    if (klass.category !== "U17" && klass.category !== "U19") return null;
    const proposal = dcuWinterGoal(klass.category, today);
    if (!proposal) return null;
    const [existing] = await tx
      .select({ id: riderGoals.id })
      .from(riderGoals)
      .where(
        and(
          eq(riderGoals.riderId, riderId),
          eq(riderGoals.source, "dcu"),
          eq(riderGoals.startsOn, proposal.startsOn),
        ),
      );
    if (existing) return existing;
    const [row] = await tx
      .insert(riderGoals)
      .values({
        orgId: ctx.orgId,
        riderId,
        title,
        kind: proposal.kind,
        target: proposal.target,
        startsOn: proposal.startsOn,
        endsOn: proposal.endsOn,
        source: "dcu",
        createdBy: ctx.userId,
      })
      .returning({ id: riderGoals.id });
    return row!;
  });
}

/** One more done, for a goal kept by hand. */
export async function bumpGoal(ctx: OrgContext, id: string, by: 1 | -1): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(riderGoals).where(eq(riderGoals.id, id));
    if (!row) throw new Refused("notFound");
    if (row.kind !== "manual") throw new Refused("invalid", "notManual");
    await requireWriteFor(tx, ctx, row.riderId);
    await tx
      .update(riderGoals)
      .set({ progress: Math.max(0, row.progress + by) })
      .where(eq(riderGoals.id, id));
  });
}

export async function deleteGoal(ctx: OrgContext, id: string): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(riderGoals).where(eq(riderGoals.id, id));
    if (!row) throw new Refused("notFound");
    await requireWriteFor(tx, ctx, row.riderId);
    await tx.delete(riderGoals).where(eq(riderGoals.id, id));
  });
}

async function withProgress(
  tx: AppTransaction,
  goals: RiderGoalRow[],
): Promise<GoalWithProgress[]> {
  if (goals.length === 0) return [];
  const from = goals.reduce((m, g) => (g.startsOn < m ? g.startsOn : m), goals[0]!.startsOn);
  const to = goals.reduce((m, g) => (g.endsOn > m ? g.endsOn : m), goals[0]!.endsOn);
  const acts = await tx
    .select({
      riderId: activities.riderId,
      onDate: activities.onDate,
      sport: activities.sport,
      movingSeconds: activities.movingSeconds,
    })
    .from(activities)
    .where(and(gte(activities.onDate, from), lte(activities.onDate, to)));
  return goals.map((g) => ({
    ...g,
    done: progressOf(
      { ...g, kind: g.kind as GoalKind },
      acts.filter((a) => a.riderId === g.riderId),
    ),
  }));
}

/** A rider's goals, current and recent: those ending within the last month, or later. */
export async function listGoals(
  ctx: OrgContext,
  riderId: string,
  today = todayInCopenhagen(),
): Promise<GoalWithProgress[]> {
  return withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .select()
      .from(riderGoals)
      .where(and(eq(riderGoals.riderId, riderId), gte(riderGoals.endsOn, addDaysIso(today, -30))))
      .orderBy(asc(riderGoals.endsOn), asc(riderGoals.createdAt));
    return withProgress(tx, rows);
  });
}

/**
 * DCU's winter goal to offer for a rider: the class's, when it has one and
 * the rider does not have this winter's yet. Pure apart from the rows given.
 */
export function dcuProposalFor(
  rider: Parameters<typeof riderClass>[0],
  goals: readonly Pick<RiderGoalRow, "source" | "startsOn">[],
  today: string,
): { target: number; startsOn: string; endsOn: string } | null {
  const klass = riderClass(rider, seasonStartYear(today));
  if (klass.category !== "U17" && klass.category !== "U19") return null;
  const proposal = dcuWinterGoal(klass.category, today);
  if (!proposal) return null;
  const has = goals.some((g) => g.source === "dcu" && g.startsOn === proposal.startsOn);
  return has
    ? null
    : { target: proposal.target, startsOn: proposal.startsOn, endsOn: proposal.endsOn };
}
