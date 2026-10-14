import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { knownPains, type KnownPainRow, type UsualPain } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { requireHealthConsent } from "@/modules/consent/service";
import { MAX_KNOWN_PAINS, MAX_PLACE_LENGTH, MAX_USUAL_LEVEL } from "@/modules/load/usual-pain";
import { requireWriteFor } from "@/modules/team/access";

/**
 * Known pains (docs/adr/0097): something that always hurts a little, fx
 * the back, and how much it usually does on ATK's ladder. The rider
 * records them on Mig, or a coach on the rider's page, as with the
 * thresholds; the check-in offers each as "Ryg som det plejer", and a pain
 * ticked so does not colour the day (src/modules/load/usual-pain.ts).
 * Health data: read as the check-ins are (ADR 0011), and not written in a
 * personal workspace whose consent is withdrawn (ADR 0088). At most five
 * a rider, one per place.
 */

const place = z.string().trim().min(1).max(MAX_PLACE_LENGTH);
const usualLevel = z.coerce.number().int().min(1).max(MAX_USUAL_LEVEL);

export const KnownPainInput = z.object({
  riderId: z.string().min(1).max(100),
  place,
  usualLevel,
});

export const KnownPainChange = z.object({
  knownPainId: z.string().min(1).max(100),
  place,
  usualLevel,
});

export const KnownPainId = z.object({ knownPainId: z.string().min(1).max(100) });

export type KnownPainView = { id: string; place: string; usualLevel: number };

export const knownPainView = (row: KnownPainRow): KnownPainView => ({
  id: row.id,
  place: row.place,
  usualLevel: row.usualLevel,
});

export async function listKnownPains(ctx: OrgContext, riderId: string): Promise<KnownPainRow[]> {
  return withOrgContext(ctx, (tx) =>
    tx
      .select()
      .from(knownPains)
      .where(eq(knownPains.riderId, riderId))
      .orderBy(asc(knownPains.createdAt), asc(knownPains.id)),
  );
}

/** Refuses a place the rider already has, in any case, but the row being changed. */
async function requireNewPlace(
  tx: AppTransaction,
  riderId: string,
  name: string,
  except?: string,
): Promise<void> {
  const same = await tx
    .select({ id: knownPains.id })
    .from(knownPains)
    .where(and(eq(knownPains.riderId, riderId), sql`lower(${knownPains.place}) = lower(${name})`));
  if (same.some((row) => row.id !== except)) throw new Refused("invalid", "knownPainTwice");
}

export async function addKnownPain(
  ctx: OrgContext,
  input: z.infer<typeof KnownPainInput>,
): Promise<{ id: string }> {
  return withOrgContext(ctx, async (tx) => {
    await requireWriteFor(tx, ctx, input.riderId);
    await requireHealthConsent(tx);
    const [{ n }] = (await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(knownPains)
      .where(eq(knownPains.riderId, input.riderId))) as [{ n: number }];
    if (n >= MAX_KNOWN_PAINS) throw new Refused("invalid", "knownPainsFull");
    await requireNewPlace(tx, input.riderId, input.place);
    const [row] = await tx
      .insert(knownPains)
      .values({ orgId: ctx.orgId, ...input, createdBy: ctx.userId })
      .returning({ id: knownPains.id });
    return row!;
  });
}

/** The row, read under RLS, and the right to write for its rider. */
async function ownRow(tx: AppTransaction, ctx: OrgContext, id: string): Promise<KnownPainRow> {
  const [row] = await tx.select().from(knownPains).where(eq(knownPains.id, id));
  if (!row) throw new Refused("notFound");
  await requireWriteFor(tx, ctx, row.riderId);
  return row;
}

export async function changeKnownPain(
  ctx: OrgContext,
  input: z.infer<typeof KnownPainChange>,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const row = await ownRow(tx, ctx, input.knownPainId);
    await requireHealthConsent(tx);
    await requireNewPlace(tx, row.riderId, input.place, row.id);
    await tx
      .update(knownPains)
      .set({ place: input.place, usualLevel: input.usualLevel })
      .where(eq(knownPains.id, row.id));
  });
}

/** Removing one still works with consent withdrawn, as a measurement's does. */
export async function removeKnownPain(ctx: OrgContext, knownPainId: string): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const row = await ownRow(tx, ctx, knownPainId);
    await tx.delete(knownPains).where(eq(knownPains.id, row.id));
  });
}

/**
 * The known pains a check-in ticked, as it stores them (UsualPain): every
 * id must be one of this rider's, or the check-in is refused — an id from
 * the client is never trusted (CLAUDE.md).
 */
export async function usualPainsFor(
  tx: AppTransaction,
  riderId: string,
  ids: readonly string[],
): Promise<UsualPain[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const rows = await tx
    .select()
    .from(knownPains)
    .where(and(eq(knownPains.riderId, riderId), inArray(knownPains.id, unique)));
  if (rows.length !== unique.length) throw new Refused("notFound");
  return unique.map((id) => {
    const row = rows.find((r) => r.id === id)!;
    return { id: row.id, place: row.place, level: row.usualLevel };
  });
}
