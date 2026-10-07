import { and, asc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { calendarEvents } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { whoAmIIn } from "@/modules/team/access";
import { FAMILY_KINDS, isFamilyKind, type FamilyEvent } from "./family-kinds";
import { id, isoDate } from "./vocabulary";

/**
 * A parent puts the family's days into their child's calendar
 * (docs/adr/0069): a holiday, an exam, a family occasion — so the coach
 * plans around them. Only for a child who has confirmed the link and
 * shares their training, only these three kinds, never the team's
 * calendar, and a parent changes or removes only what they wrote
 * themselves. The database holds the same line (drizzle/0034); these
 * checks answer first, with a word the interface understands.
 *
 * The coach sees the rows in the calendar and the rider sees them and may
 * delete them, through the ordinary event service (events.ts).
 */

export const FamilyEventInput = z
  .object({
    riderId: id,
    kind: z.enum(FAMILY_KINDS),
    title: z.string().trim().min(1).max(120),
    startsOn: isoDate,
    endsOn: isoDate,
  })
  .refine((e) => e.endsOn >= e.startsOn, { path: ["endsOn"] });
export type FamilyEventInputT = z.infer<typeof FamilyEventInput>;

/** Throws unless the caller is a parent this child has confirmed and shares their training with. */
async function requireParentOf(tx: AppTransaction, ctx: OrgContext, riderId: string) {
  const me = await whoAmIIn(tx, ctx);
  // A child's name is null while the database hides the rider row from the parent (ADR 0011).
  const child = me?.children.find((c) => c.riderId === riderId && c.confirmed && c.name !== null);
  if (!child) throw new Refused("forbidden");
}

/** The caller's own row, or a refusal: a parent touches only what they wrote. */
async function ownRow(tx: AppTransaction, ctx: OrgContext, eventId: string) {
  const [row] = await tx.select().from(calendarEvents).where(eq(calendarEvents.id, eventId));
  if (!row) throw new Refused("notFound");
  if (row.createdBy !== ctx.userId || !row.riderId || !isFamilyKind(row.kind)) {
    throw new Refused("forbidden");
  }
  await requireParentOf(tx, ctx, row.riderId);
  return row;
}

export async function addFamilyEvent(
  ctx: OrgContext,
  input: FamilyEventInputT,
): Promise<{ id: string }> {
  return withOrgContext(ctx, async (tx) => {
    await requireParentOf(tx, ctx, input.riderId);
    const [row] = await tx
      .insert(calendarEvents)
      .values({ orgId: ctx.orgId, ...input, createdBy: ctx.userId })
      .returning({ id: calendarEvents.id });
    return row!;
  });
}

export async function updateFamilyEvent(
  ctx: OrgContext,
  eventId: string,
  input: FamilyEventInputT,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await ownRow(tx, ctx, eventId);
    await requireParentOf(tx, ctx, input.riderId);
    await tx.update(calendarEvents).set(input).where(eq(calendarEvents.id, eventId));
  });
}

export async function deleteFamilyEvent(ctx: OrgContext, eventId: string): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await ownRow(tx, ctx, eventId);
    await tx.delete(calendarEvents).where(eq(calendarEvents.id, eventId));
  });
}

/** What the caller has put into this child's calendar, from `from` on. */
export async function listFamilyEvents(
  ctx: OrgContext,
  riderId: string,
  from: string,
): Promise<FamilyEvent[]> {
  const rows = await withOrgContext(ctx, (tx) =>
    tx
      .select({
        id: calendarEvents.id,
        riderId: calendarEvents.riderId,
        kind: calendarEvents.kind,
        title: calendarEvents.title,
        startsOn: calendarEvents.startsOn,
        endsOn: calendarEvents.endsOn,
      })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.riderId, riderId),
          eq(calendarEvents.createdBy, ctx.userId),
          gte(calendarEvents.endsOn, from),
        ),
      )
      .orderBy(asc(calendarEvents.startsOn)),
  );
  return rows.flatMap((r) =>
    r.riderId && isFamilyKind(r.kind) ? [{ ...r, riderId: r.riderId, kind: r.kind }] : [],
  );
}
