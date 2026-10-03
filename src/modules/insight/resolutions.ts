import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { addDaysIso, mondayOf, todayInCopenhagen } from "@/core/dates";
import { flagResolutions, type FlagResolutionRow } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { FLAG_KINDS } from "@/modules/load";
import { requireCoach } from "@/modules/team/access";
import { gather } from "./gather";
import { riderInsight, SERIES_DAYS, WARMUP_DAYS } from "./rider";
import { flagWindow, readIntensity } from "@/modules/season/intensity";
import { teamPlanning } from "@/modules/team/settings";

/**
 * A coach's "afklaret" on a guardrail flag (ADR 0026). The flag itself is
 * computed on every view; the row here is the coach's decision that it
 * has been dealt with this week, with what the coach saw at the press.
 * The week, the severity and the snapshot are computed here, from the
 * same rules the list uses, inside the transaction that writes — never
 * taken from the client.
 */

/** What the button sends: which rider, which kind. The week and the severity are the server's. */
export const ResolveInput = z.object({
  riderId: z.string().min(1).max(100),
  kind: z.enum(FLAG_KINDS),
});
export type ResolveInputT = z.infer<typeof ResolveInput>;

/**
 * A coach marks a kind of flag as dealt with for this week. The flags of
 * that kind firing today are computed here, with no resolution applied;
 * none firing is a refusal ("flagGone"), so a resolution can never be
 * dated ahead of this week nor sit above the severity that fires.
 * Pressing again after an escalation re-snapshots the row.
 */
export async function resolveFlag(
  ctx: OrgContext,
  input: ResolveInputT,
  today = todayInCopenhagen(),
): Promise<{ id: string }> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const data = await gather(tx, {
      from: addDaysIso(today, -(SERIES_DAYS + WARMUP_DAYS)),
      to: addDaysIso(today, 7),
      riderIds: [input.riderId],
    });
    const rider = data.riders[0];
    if (!rider) throw new Refused("notFound");
    const { paradigm, lowIntensityFirst } = await teamPlanning(tx, ctx.orgId);
    const window = flagWindow(today);
    const insight = riderInsight(
      rider,
      data.activities,
      data.sessions,
      data.checkins,
      today,
      true,
      [],
      [],
      paradigm,
      lowIntensityFirst ? await readIntensity(tx, [rider.id], window.from, window.to) : null,
    );
    const firing = insight.flags.filter((f) => f.kind === input.kind);
    if (firing.length === 0) throw new Refused("notFound", "flagGone");
    const seenNow = {
      // guardrails() puts the most serious first.
      severity: firing[0]!.severity,
      seen: firing.map((f) => f.values),
      resolvedBy: ctx.userId,
    };
    const [row] = await tx
      .insert(flagResolutions)
      .values({
        orgId: ctx.orgId,
        riderId: rider.id,
        kind: input.kind,
        weekMonday: mondayOf(today),
        ...seenNow,
      })
      .onConflictDoUpdate({
        target: [flagResolutions.riderId, flagResolutions.kind, flagResolutions.weekMonday],
        // $onUpdate does not fire on an upsert's update branch.
        set: { ...seenNow, updatedAt: new Date() },
      })
      .returning({ id: flagResolutions.id });
    return row!;
  });
}

/** "Fortryd": the flag is back on the list. */
export async function unresolveFlag(ctx: OrgContext, id: string): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const [row] = await tx
      .select({ id: flagResolutions.id })
      .from(flagResolutions)
      .where(eq(flagResolutions.id, id));
    if (!row) throw new Refused("notFound");
    await tx.delete(flagResolutions).where(eq(flagResolutions.id, id));
  });
}

/**
 * One week's resolutions for these riders, read inside the insight's own
 * transaction: RLS decides which rows the caller may see.
 */
export async function resolutionsFor(
  tx: AppTransaction,
  riderIds: string[],
  weekMonday: string,
): Promise<FlagResolutionRow[]> {
  if (riderIds.length === 0) return [];
  return tx
    .select()
    .from(flagResolutions)
    .where(
      and(inArray(flagResolutions.riderId, riderIds), eq(flagResolutions.weekMonday, weekMonday)),
    );
}
