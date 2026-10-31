import { and, eq, isNull, sql } from "drizzle-orm";
import { consents } from "@/core/db/schema";
import type { AppTransaction, OrgContext } from "@/core/db/tenant";

/**
 * The rider's own yes to Garmin, before anything goes to or from Garmin:
 * what is fetched and what is sent, that Garmin keeps and may use what it
 * gets, a link to Garmin's privacy notice, a word that a person not
 * allowed to put data in their Garmin account should not connect it, and
 * a box the rider ticks (the words under `garmin.connect`).
 *
 * The yes is written when it is said — on "Fortsæt til Garmin", before
 * the browser leaves for Garmin — as a row in `consents` like the other
 * consents (docs/adr/0088): the person's own row, in this workspace,
 * about their own rider. Disconnecting withdraws it. Connecting again is
 * a new yes and a new row.
 */

/** The version of the words under `garmin.connect` a yes was given to. */
export const GARMIN_CONSENT_VERSION = "2026-10";

export async function recordGarminConsent(
  tx: AppTransaction,
  ctx: OrgContext,
  input: { riderId: string; locale: "da" | "en" },
): Promise<void> {
  await tx.insert(consents).values({
    orgId: ctx.orgId,
    userId: ctx.userId,
    riderId: input.riderId,
    kind: "garmin",
    version: GARMIN_CONSENT_VERSION,
    locale: input.locale,
  });
}

/** Every standing yes to Garmin from this person here, withdrawn: what disconnecting means. */
export async function withdrawGarminConsents(tx: AppTransaction, ctx: OrgContext): Promise<number> {
  const rows = await tx
    .update(consents)
    .set({ withdrawnAt: sql`now()` })
    .where(
      and(
        eq(consents.userId, ctx.userId),
        sql`${consents.kind} in ('garmin', 'garmin_ai')`,
        isNull(consents.withdrawnAt),
      ),
    )
    .returning({ id: consents.id });
  return rows.length;
}
