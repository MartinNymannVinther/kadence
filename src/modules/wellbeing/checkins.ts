import { and, asc, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { checkins, type CheckinRow } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { requireHealthConsent } from "@/modules/consent/service";
import { isRedCheckin } from "@/modules/load/wellbeing";
import { requireWriteFor } from "@/modules/team/access";

/**
 * The daily check-in: how the rider slept, how much energy and mood they
 * have, how sore the legs are, how much is going on at school, and whether
 * anything hurts (ATK's four steps). Short enough to do on the way out of
 * the door; one per day, written again if the rider changes their mind.
 * The rider writes it (a coach may, after a conversation); parents read
 * it only when the rider shares wellbeing (ADR 0011). In a personal
 * workspace whose consent to health data is withdrawn, nobody writes it
 * (docs/adr/0088).
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

/**
 * Saves the day's check-in, or changes it. `red_since` says when it last
 * turned red (`isRedCheckin`): set when it becomes red, kept as it was
 * while it stays red, cleared when it is put right. A coach's wellbeing
 * reminder counts from it (docs/adr/0060), so saving a red check-in again
 * is not news, and one changed from green to red later in the day is.
 */
export async function saveCheckin(ctx: OrgContext, input: CheckinInputT): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireWriteFor(tx, ctx, input.riderId);
    // Off once the person withdrew their consent to health data (ADR 0088).
    await requireHealthConsent(tx);
    const { riderId, onDate, ...values } = input;
    const red = isRedCheckin(values);
    await tx
      .insert(checkins)
      .values({ orgId: ctx.orgId, riderId, onDate, ...values, redSince: red ? sql`now()` : null })
      .onConflictDoUpdate({
        target: [checkins.riderId, checkins.onDate],
        // On conflict, the column names the row as it was before this save.
        set: { ...values, redSince: red ? sql`coalesce(${checkins.redSince}, now())` : null },
      });
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

/**
 * The rider's last check-in before a day: what the shorter check-in starts
 * the answers behind "Mere" from (src/modules/wellbeing/prefill.ts).
 */
export async function getLastCheckin(
  ctx: OrgContext,
  riderId: string,
  before: string,
): Promise<CheckinRow | null> {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx
      .select()
      .from(checkins)
      .where(and(eq(checkins.riderId, riderId), lt(checkins.onDate, before)))
      .orderBy(desc(checkins.onDate))
      .limit(1);
    return row ?? null;
  });
}
