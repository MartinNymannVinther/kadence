import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { checkins, type CheckinRow } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { requireWriteFor } from "@/modules/team/access";

/**
 * The daily check-in: how the rider slept, how much energy and mood they
 * have, how sore the legs are, how much is going on at school, and whether
 * anything hurts (ATK's four steps). Short enough to do on the way out of
 * the door; one per day, written again if the rider changes their mind.
 * The rider writes it (a coach may, after a conversation); parents read
 * it only when the rider shares wellbeing (ADR 0011).
 */

const scale = z.coerce.number().int().min(1).max(5).nullable().default(null);

export const CheckinInput = z.object({
  riderId: z.string().min(1).max(100),
  onDate: z.iso.date(),
  sleepHours: z.coerce.number().min(0).max(24).nullable().default(null),
  sleepQuality: scale,
  energy: scale,
  mood: scale,
  soreness: scale,
  stress: scale,
  pain: z.coerce.number().int().min(0).max(3).default(0),
  painWhere: z.string().trim().max(200).default(""),
  ill: z.coerce.number().int().min(0).max(1).default(0),
  note: z.string().trim().max(2000).default(""),
});
export type CheckinInputT = z.infer<typeof CheckinInput>;

export async function saveCheckin(ctx: OrgContext, input: CheckinInputT): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireWriteFor(tx, ctx, input.riderId);
    const { riderId, onDate, ...values } = input;
    await tx
      .insert(checkins)
      .values({ orgId: ctx.orgId, riderId, onDate, ...values })
      .onConflictDoUpdate({ target: [checkins.riderId, checkins.onDate], set: values });
  });
}

export async function listCheckins(
  ctx: OrgContext,
  range: { from: string; to: string; riderIds?: string[] },
): Promise<CheckinRow[]> {
  return withOrgContext(ctx, (tx) => {
    const where = [gte(checkins.onDate, range.from), lte(checkins.onDate, range.to)];
    if (range.riderIds)
      where.push(inArray(checkins.riderId, range.riderIds.length ? range.riderIds : [""]));
    return tx
      .select()
      .from(checkins)
      .where(and(...where))
      .orderBy(asc(checkins.riderId), asc(checkins.onDate));
  });
}

export async function getCheckin(
  ctx: OrgContext,
  riderId: string,
  onDate: string,
): Promise<CheckinRow | null> {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx
      .select()
      .from(checkins)
      .where(and(eq(checkins.riderId, riderId), eq(checkins.onDate, onDate)));
    return row ?? null;
  });
}
