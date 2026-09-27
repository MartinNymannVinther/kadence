import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { calendarEvents, type CalendarEventRow } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { requireCoach, requireWriteFor } from "@/modules/team/access";
import { id, isoDate } from "./vocabulary";

/**
 * Everything in the calendar that is not training: races, school, exams,
 * camps, holidays, illness (ADR 0013). A team event has no rider and is
 * the coaches' to write; a rider's own — an exam, a week ill — is the
 * rider's or a coach's.
 */

export const EVENT_KINDS = ["race", "exam", "school", "camp", "holiday", "ill", "other"] as const;

export const EventInput = z
  .object({
    riderId: id.nullable(),
    kind: z.enum(EVENT_KINDS),
    title: z.string().trim().min(1).max(120),
    startsOn: isoDate,
    endsOn: isoDate,
    priority: z.enum(["A", "B", "C"]).nullable().default(null),
    note: z.string().trim().max(2000).default(""),
  })
  .refine((e) => e.endsOn >= e.startsOn, { path: ["endsOn"] });
export type EventInputT = z.infer<typeof EventInput>;

export async function listEvents(
  ctx: OrgContext,
  range: { from: string; to: string; riderIds?: string[] },
): Promise<CalendarEventRow[]> {
  return withOrgContext(ctx, (tx) => {
    const riderScope = range.riderIds
      ? or(
          isNull(calendarEvents.riderId),
          inArray(calendarEvents.riderId, range.riderIds.length ? range.riderIds : [""]),
        )
      : undefined;
    return tx
      .select()
      .from(calendarEvents)
      .where(
        and(
          lte(calendarEvents.startsOn, range.to),
          gte(calendarEvents.endsOn, range.from),
          riderScope,
        ),
      )
      .orderBy(asc(calendarEvents.startsOn));
  });
}

async function check(ctx: OrgContext, riderId: string | null, tx: AppTransaction) {
  if (riderId) await requireWriteFor(tx, ctx, riderId);
  else await requireCoach(tx, ctx);
}

export async function createEvent(ctx: OrgContext, input: EventInputT) {
  return withOrgContext(ctx, async (tx) => {
    await check(ctx, input.riderId, tx);
    const [row] = await tx
      .insert(calendarEvents)
      .values({ orgId: ctx.orgId, ...input, createdBy: ctx.userId })
      .returning({ id: calendarEvents.id });
    return row!;
  });
}

export async function updateEvent(ctx: OrgContext, eventId: string, input: EventInputT) {
  await withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(calendarEvents).where(eq(calendarEvents.id, eventId));
    if (!row) throw new Refused("notFound");
    await check(ctx, row.riderId, tx);
    await check(ctx, input.riderId, tx);
    await tx.update(calendarEvents).set(input).where(eq(calendarEvents.id, eventId));
  });
}

export async function deleteEvent(ctx: OrgContext, eventId: string) {
  await withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(calendarEvents).where(eq(calendarEvents.id, eventId));
    if (!row) throw new Refused("notFound");
    await check(ctx, row.riderId, tx);
    await tx.delete(calendarEvents).where(eq(calendarEvents.id, eventId));
  });
}
