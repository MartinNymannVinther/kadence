import { and, eq, isNull, sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import { consents } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { whoAmIIn } from "@/modules/team/access";

/**
 * The rider's own yes to the AI reading their rides from Garmin
 * (docs/adr/0112), given on the Garmin card under Indstillinger → Enheder
 * after the words under `garmin.ai`: what the AI does with a proposal,
 * what it reads, where the model runs, that no ride trains a model, what
 * happens without the yes, and that it is withdrawn in the same place.
 *
 * Only the rider says it, about their own rider, in this workspace — a
 * coach or a parent cannot, and a row they wrote would not count
 * (`app_garmin_ai_riders`, drizzle/0060). Withdrawing sets `withdrawn_at`
 * and holds from that moment; saying it again is a new row, and
 * disconnecting Garmin withdraws it with the yes to Garmin itself
 * (`withdrawGarminConsents`).
 */

/** The version of the words under `garmin.ai` a yes was given to. */
export const GARMIN_AI_CONSENT_VERSION = "2026-10";

const standing = (userId: string) =>
  and(eq(consents.kind, "garmin_ai"), eq(consents.userId, userId), isNull(consents.withdrawnAt));

/** Whether the caller, as a rider, has a standing yes; for the devices page. */
export async function myGarminAiConsent(ctx: OrgContext): Promise<boolean> {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx
      .select({ id: consents.id })
      .from(consents)
      .where(standing(ctx.userId))
      .limit(1);
    return row !== undefined;
  });
}

/** Says yes for the caller's own rider; a second yes while one stands writes nothing. */
export async function giveGarminAiConsent(ctx: OrgContext, locale: "da" | "en"): Promise<boolean> {
  return withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me?.rider) throw new Refused("forbidden");
    const [row] = await tx
      .select({ id: consents.id })
      .from(consents)
      .where(standing(ctx.userId))
      .limit(1);
    if (row) return false;
    await tx.insert(consents).values({
      orgId: ctx.orgId,
      userId: ctx.userId,
      riderId: me.rider.id,
      kind: "garmin_ai",
      version: GARMIN_AI_CONSENT_VERSION,
      locale,
    });
    return true;
  });
}

/** Withdraws the caller's standing yes; answers whether there was one. */
export async function withdrawGarminAiConsent(ctx: OrgContext): Promise<boolean> {
  return withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .update(consents)
      .set({ withdrawnAt: sql`now()` })
      .where(standing(ctx.userId))
      .returning({ id: consents.id });
    return rows.length > 0;
  });
}
