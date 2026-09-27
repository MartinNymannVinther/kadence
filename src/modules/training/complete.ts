import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { activities, plannedSessions } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { requireWriteFor } from "@/modules/team/access";
import { loadFromRpe } from "./load-bridge";
import { isoDate, MAX_TEXT, noonInCopenhagen, SPORTS, id } from "./vocabulary";

/**
 * Doing a session without a file: the strength session, the run, the ride
 * on a bike without a computer. The rider says how long and how hard
 * (session RPE, 1–10), and that is enough for a load (ADR 0015). Files and
 * devices arrive in wave 3 and land on the same `activities` table.
 */

export const FeedbackInput = z.object({
  rpe: z.coerce.number().int().min(1).max(10).nullable().default(null),
  feel: z.coerce.number().int().min(1).max(5).nullable().default(null),
  note: z.string().trim().max(MAX_TEXT).default(""),
});

export const ManualActivityInput = FeedbackInput.extend({
  riderId: id,
  onDate: isoDate,
  sport: z.enum(SPORTS),
  title: z.string().trim().max(120).default(""),
  minutes: z.coerce.number().int().min(1).max(1440),
  distanceKm: z.coerce.number().min(0).max(400).nullable().default(null),
});

async function insertManual(
  tx: AppTransaction,
  ctx: OrgContext,
  input: z.infer<typeof ManualActivityInput>,
) {
  await requireWriteFor(tx, ctx, input.riderId);
  const { load, method } = loadFromRpe(input.minutes, input.rpe);
  const [row] = await tx
    .insert(activities)
    .values({
      orgId: ctx.orgId,
      riderId: input.riderId,
      startedAt: noonInCopenhagen(input.onDate),
      onDate: input.onDate,
      sport: input.sport,
      title: input.title,
      movingSeconds: input.minutes * 60,
      elapsedSeconds: input.minutes * 60,
      distanceM: input.distanceKm === null ? null : Math.round(input.distanceKm * 1000),
      rpe: input.rpe,
      feel: input.feel,
      note: input.note,
      load,
      loadMethod: method,
      source: "manual",
      createdBy: ctx.userId,
    })
    .returning({ id: activities.id });
  return row!;
}

/** An activity nobody planned. */
export async function logActivity(ctx: OrgContext, input: z.infer<typeof ManualActivityInput>) {
  return withOrgContext(ctx, (tx) => insertManual(tx, ctx, input));
}

/** A planned session done, entered by hand; it becomes the session's activity. */
export async function completeSession(
  ctx: OrgContext,
  sessionId: string,
  input: z.infer<typeof FeedbackInput> & { minutes: number; distanceKm: number | null },
) {
  return withOrgContext(ctx, async (tx) => {
    const [session] = await tx
      .select()
      .from(plannedSessions)
      .where(eq(plannedSessions.id, sessionId));
    if (!session) throw new Refused("notFound");
    if (session.activityId) throw new Refused("conflict", "alreadyDone");
    const activity = await insertManual(tx, ctx, {
      ...input,
      riderId: session.riderId,
      onDate: session.onDate,
      sport: session.sport as (typeof SPORTS)[number],
      title: session.title,
    });
    await tx
      .update(plannedSessions)
      .set({ activityId: activity.id })
      .where(eq(plannedSessions.id, sessionId));
    return activity;
  });
}

/** How hard it was and how it felt, afterwards — which is when a rider knows. */
export async function setFeedback(
  ctx: OrgContext,
  activityId: string,
  input: z.infer<typeof FeedbackInput>,
) {
  await withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(activities).where(eq(activities.id, activityId));
    if (!row) throw new Refused("notFound");
    await requireWriteFor(tx, ctx, row.riderId);
    const patch: Partial<typeof activities.$inferInsert> = {
      rpe: input.rpe,
      feel: input.feel,
      note: input.note,
    };
    // A file with power or pulse keeps the load it was given; RPE decides only when nothing better did.
    if (row.loadMethod === "rpe" || row.loadMethod === "none") {
      const { load, method } = loadFromRpe(Math.round(row.movingSeconds / 60), input.rpe);
      patch.load = load;
      patch.loadMethod = method;
    }
    await tx.update(activities).set(patch).where(eq(activities.id, activityId));
  });
}

/** Undoing a "done" entered by hand: the session is open again and the manual activity goes. */
export async function reopenSession(ctx: OrgContext, sessionId: string) {
  await withOrgContext(ctx, async (tx) => {
    const [session] = await tx
      .select()
      .from(plannedSessions)
      .where(eq(plannedSessions.id, sessionId));
    if (!session?.activityId) throw new Refused("notFound");
    await requireWriteFor(tx, ctx, session.riderId);
    await tx
      .update(plannedSessions)
      .set({ activityId: null })
      .where(eq(plannedSessions.id, sessionId));
    await tx
      .delete(activities)
      .where(and(eq(activities.id, session.activityId), eq(activities.source, "manual")));
  });
}
