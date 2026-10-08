import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { riders, type RiderRow } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { requireCoach, whoAmIIn } from "./access";
import { BIRTH_YEAR_MIN, birthYearMax } from "./birth-year";

/**
 * The riders on a team. A coach adds them, with or without an account yet;
 * a rider keeps their own thresholds and decides what their parents see
 * (docs/adr/0011). Who sees which row is the database's decision: the
 * lists here are plain selects under RLS.
 */

const thisYear = () => new Date().getFullYear();

export const RiderInput = z.object({
  name: z.string().trim().min(1).max(120),
  birthYear: z.coerce.number().int().min(BIRTH_YEAR_MIN).max(birthYearMax(thisYear())),
  sex: z.enum(["female", "male"]).nullable().default(null),
  categoryOverride: z
    .enum(["U17-1", "U17-2", "U19-1", "U19-2", "U23-1", "U23-2", "U23-3", "U23-4", "senior"])
    .nullable()
    .default(null),
});

const watts = z.coerce.number().int().min(50).max(700).nullable();
const bpm = z.coerce.number().int().min(30).max(240).nullable();

export const ThresholdsInput = z.object({
  ftpWatts: watts.default(null),
  thresholdHr: bpm.default(null),
  maxHr: bpm.default(null),
  restingHr: bpm.default(null),
  thresholdsOn: z.iso.date().nullable().default(null),
});

export const SharingInput = z.object({
  shareTraining: z.boolean(),
  shareWellbeing: z.boolean(),
});

export async function listRiders(tx: AppTransaction, includeArchived = false): Promise<RiderRow[]> {
  return tx
    .select()
    .from(riders)
    .where(includeArchived ? undefined : eq(riders.archived, false))
    .orderBy(asc(riders.name));
}

export async function getRiders(ctx: OrgContext, includeArchived = false): Promise<RiderRow[]> {
  return withOrgContext(ctx, (tx) => listRiders(tx, includeArchived));
}

export async function getRider(ctx: OrgContext, riderId: string): Promise<RiderRow | null> {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(riders).where(eq(riders.id, riderId)).limit(1);
    return row ?? null;
  });
}

export async function createRider(
  ctx: OrgContext,
  input: z.infer<typeof RiderInput> & { userId?: string | null },
): Promise<{ id: string }> {
  return withOrgContext(ctx, (tx) => createRiderIn(tx, ctx, input));
}

/** The same, inside a transaction a caller already holds — a whole team at once (bulk-invite.ts). */
export async function createRiderIn(
  tx: AppTransaction,
  ctx: OrgContext,
  input: z.infer<typeof RiderInput> & { userId?: string | null },
): Promise<{ id: string }> {
  await requireCoach(tx, ctx);
  const [row] = await tx
    .insert(riders)
    .values({ orgId: ctx.orgId, ...input, userId: input.userId ?? null })
    .returning({ id: riders.id });
  return row!;
}

/** The coach's edit: name, birth year and class. */
export async function updateRider(
  ctx: OrgContext,
  riderId: string,
  input: z.infer<typeof RiderInput>,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const rows = await tx
      .update(riders)
      .set(input)
      .where(and(eq(riders.id, riderId), eq(riders.orgId, ctx.orgId)))
      .returning({ id: riders.id });
    if (rows.length === 0) throw new Refused("notFound");
  });
}

/** Thresholds: the coach's or the rider's own to set. */
export async function setThresholds(
  ctx: OrgContext,
  riderId: string,
  input: z.infer<typeof ThresholdsInput>,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me || (!me.isCoach && me.rider?.id !== riderId)) throw new Refused("forbidden");
    const rows = await tx
      .update(riders)
      .set(input)
      .where(eq(riders.id, riderId))
      .returning({ id: riders.id });
    if (rows.length === 0) throw new Refused("notFound");
  });
}

/** What the parents see is the rider's decision alone — not the coach's (ADR 0011). */
export async function setSharing(
  ctx: OrgContext,
  input: z.infer<typeof SharingInput>,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me?.rider) throw new Refused("forbidden");
    await tx.update(riders).set(input).where(eq(riders.id, me.rider.id));
  });
}

/** A rider who has left the team keeps their history; archiving hides them from the lists. */
export async function archiveRider(
  ctx: OrgContext,
  riderId: string,
  archived: boolean,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const rows = await tx
      .update(riders)
      .set({ archived })
      .where(eq(riders.id, riderId))
      .returning({ id: riders.id });
    if (rows.length === 0) throw new Refused("notFound");
  });
}

/** Records the invitation a rider's row was sent with, so joining links it. */
export async function attachRiderInvitation(
  ctx: OrgContext,
  riderId: string,
  invitationId: string,
): Promise<void> {
  await withOrgContext(ctx, (tx) => attachRiderInvitationIn(tx, ctx, riderId, invitationId));
}

export async function attachRiderInvitationIn(
  tx: AppTransaction,
  ctx: OrgContext,
  riderId: string,
  invitationId: string,
): Promise<void> {
  await requireCoach(tx, ctx);
  await tx.update(riders).set({ invitationId }).where(eq(riders.id, riderId));
}

/**
 * A rider's right to erasure: the rider, everything about them and the
 * audit trail's copies of it, gone (drizzle/0006 `erase_rider`, which
 * checks the caller coaches the team itself). Archiving keeps history;
 * this does not. A coach does it at the rider's or the parents' request.
 */
export async function eraseRider(ctx: OrgContext, riderId: string): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const [row] = await tx.select({ id: riders.id }).from(riders).where(eq(riders.id, riderId));
    if (!row) throw new Refused("notFound");
    await tx.execute(sql`select erase_rider(${riderId})`);
  });
}
