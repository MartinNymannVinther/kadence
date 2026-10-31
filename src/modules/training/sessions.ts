import { and, asc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import {
  activities,
  comments,
  plannedSessions,
  type ActivityRow,
  type PlannedSessionRow,
} from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { isCoachRole, requireCoach, requireWriteFor, roleIn } from "@/modules/team/access";
import { readStructure, structureMinutes } from "@/modules/workouts/structure";
import { recordDeletionsIn, recordMoveIn } from "./deletions";
import { estimatePlannedLoad } from "./load-bridge";
import { clockOf } from "./time-place";
import type { Scope, SessionInputT } from "./vocabulary";

/**
 * Planned sessions: the calendar's content. A coach plans for any rider
 * on the team; a rider may plan and move their own (a rider without a
 * coach is their own). A parent reads. The database refuses the rest
 * (ADR 0011); the checks here refuse early, with a word.
 */

export type CalendarSession = PlannedSessionRow & {
  activity: Pick<
    ActivityRow,
    "id" | "movingSeconds" | "distanceM" | "load" | "loadMethod" | "rpe" | "source"
  > | null;
  commentCount: number;
};

export async function listSessionsIn(
  tx: AppTransaction,
  range: { from: string; to: string; riderIds?: string[] },
): Promise<CalendarSession[]> {
  const where = [gte(plannedSessions.onDate, range.from), lte(plannedSessions.onDate, range.to)];
  if (range.riderIds) {
    if (range.riderIds.length === 0) return [];
    where.push(inArray(plannedSessions.riderId, range.riderIds));
  }
  const rows = await tx
    .select({
      session: plannedSessions,
      activity: {
        id: activities.id,
        movingSeconds: activities.movingSeconds,
        distanceM: activities.distanceM,
        load: activities.load,
        loadMethod: activities.loadMethod,
        rpe: activities.rpe,
        source: activities.source,
        deviceName: activities.deviceName,
      },
      commentCount: sql<number>`(select count(*)::int from ${comments} c where c.planned_session_id = ${plannedSessions.id})`,
    })
    .from(plannedSessions)
    .leftJoin(activities, eq(activities.id, plannedSessions.activityId))
    .where(and(...where))
    .orderBy(
      asc(plannedSessions.onDate),
      // A day's sessions in the order they start; those without a time after (docs/adr/0058).
      asc(plannedSessions.startTime),
      asc(plannedSessions.sort),
      asc(plannedSessions.createdAt),
    );
  return rows.map((r) => ({
    ...r.session,
    activity: r.activity?.id ? r.activity : null,
    commentCount: Number(r.commentCount),
  }));
}

export async function listSessions(
  ctx: OrgContext,
  range: { from: string; to: string; riderIds?: string[] },
): Promise<CalendarSession[]> {
  return withOrgContext(ctx, (tx) => listSessionsIn(tx, range));
}

export async function getSession(ctx: OrgContext, id: string): Promise<CalendarSession | null> {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx
      .select({ onDate: plannedSessions.onDate, riderId: plannedSessions.riderId })
      .from(plannedSessions)
      .where(eq(plannedSessions.id, id));
    if (!row) return null;
    const list = await listSessionsIn(tx, {
      from: row.onDate,
      to: row.onDate,
      riderIds: [row.riderId],
    });
    return list.find((s) => s.id === id) ?? null;
  });
}

/** The values a session row gets from its input: minutes and load follow the structure. */
function derived(input: Pick<SessionInputT, "structure" | "sport" | "plannedMinutes">) {
  const structure = readStructure(input.structure, input.sport);
  const minutes = input.plannedMinutes || structureMinutes(structure);
  return {
    structure,
    plannedMinutes: minutes,
    plannedLoad: estimatePlannedLoad(structure, minutes),
  };
}

/** A new session's time and place: none unless the input brings them (docs/adr/0058). */
function timePlace(input: Pick<SessionInputT, "startTime" | "meetingPlace">) {
  return { startTime: clockOf(input.startTime), meetingPlace: input.meetingPlace ?? "" };
}

export async function createSessionIn(
  tx: AppTransaction,
  ctx: OrgContext,
  input: SessionInputT & {
    groupKey?: string | null;
    origin?: PlannedSessionRow["origin"];
    programmeSession?: number | null;
  },
): Promise<{ id: string }> {
  await requireWriteFor(tx, ctx, input.riderId);
  const [row] = await tx
    .insert(plannedSessions)
    .values({
      orgId: ctx.orgId,
      riderId: input.riderId,
      onDate: input.onDate,
      sport: input.sport,
      title: input.title,
      description: input.description,
      plannedKm: input.plannedKm,
      templateId: input.templateId,
      groupKey: input.groupKey ?? null,
      origin: input.origin ?? (input.templateId ? "template" : "manual"),
      programmeSession: input.programmeSession ?? null,
      createdBy: ctx.userId,
      ...derived(input),
      ...timePlace(input),
    })
    .returning({ id: plannedSessions.id });
  return row!;
}

/**
 * Many sessions in one statement per few hundred — a series (ADR 0041)
 * can be two thousand rows. Each rider is checked once, as
 * `createSessionIn` checks every row, and RLS checks every row again.
 */
export async function createSessionsIn(
  tx: AppTransaction,
  ctx: OrgContext,
  inputs: Array<Parameters<typeof createSessionIn>[2] & { seriesKey?: string | null }>,
): Promise<string[]> {
  for (const riderId of new Set(inputs.map((i) => i.riderId)))
    await requireWriteFor(tx, ctx, riderId);
  const ids: string[] = [];
  for (let i = 0; i < inputs.length; i += 500) {
    const rows = await tx
      .insert(plannedSessions)
      .values(
        inputs.slice(i, i + 500).map((input) => ({
          orgId: ctx.orgId,
          riderId: input.riderId,
          onDate: input.onDate,
          sport: input.sport,
          title: input.title,
          description: input.description,
          plannedKm: input.plannedKm,
          templateId: input.templateId,
          groupKey: input.groupKey ?? null,
          seriesKey: input.seriesKey ?? null,
          origin: input.origin ?? (input.templateId ? "template" : "manual"),
          programmeSession: input.programmeSession ?? null,
          createdBy: ctx.userId,
          ...derived(input),
          ...timePlace(input),
        })),
      )
      .returning({ id: plannedSessions.id });
    ids.push(...rows.map((r) => r.id));
  }
  return ids;
}

export async function createSession(ctx: OrgContext, input: SessionInputT) {
  return withOrgContext(ctx, (tx) => createSessionIn(tx, ctx, input));
}

async function loadOwn(tx: AppTransaction, ctx: OrgContext, id: string) {
  const [row] = await tx.select().from(plannedSessions).where(eq(plannedSessions.id, id));
  if (!row) throw new Refused("notFound");
  await requireWriteFor(tx, ctx, row.riderId);
  return row;
}

/**
 * The copies a change reaches: this one; for a coach, every open copy in
 * its group; or every open copy of its series from this day on — every
 * rider's for a coach, the caller's own otherwise (ADR 0041).
 */
async function targets(tx: AppTransaction, ctx: OrgContext, row: PlannedSessionRow, scope: Scope) {
  if (scope === "series") {
    if (!row.seriesKey) return [row];
    const coach = isCoachRole(await roleIn(tx, ctx));
    return tx
      .select()
      .from(plannedSessions)
      .where(
        and(
          eq(plannedSessions.seriesKey, row.seriesKey),
          isNull(plannedSessions.activityId),
          gte(plannedSessions.onDate, row.onDate),
          ...(coach ? [] : [eq(plannedSessions.riderId, row.riderId)]),
        ),
      );
  }
  if (scope === "one" || !row.groupKey) return [row];
  await requireCoach(tx, ctx);
  return tx
    .select()
    .from(plannedSessions)
    .where(and(eq(plannedSessions.groupKey, row.groupKey), isNull(plannedSessions.activityId)));
}

export async function updateSession(
  ctx: OrgContext,
  id: string,
  input: Omit<SessionInputT, "riderId" | "onDate">,
  scope: Scope,
): Promise<number> {
  return withOrgContext(ctx, async (tx) => {
    const row = await loadOwn(tx, ctx, id);
    const copies = await targets(tx, ctx, row, scope);
    for (const copy of copies) {
      const values = derived(input);
      await tx
        .update(plannedSessions)
        .set({
          sport: input.sport,
          title: input.title,
          description: input.description,
          plannedKm: input.plannedKm,
          templateId: input.templateId,
          // Left out, they stay as they were; null and "" clear them.
          startTime: input.startTime === undefined ? undefined : clockOf(input.startTime),
          meetingPlace: input.meetingPlace,
          ...values,
        })
        .where(eq(plannedSessions.id, copy.id));
    }
    return copies.length;
  });
}

/** Moving a session to another day, or copying it — to the same rider or another. */
export async function moveSession(
  ctx: OrgContext,
  id: string,
  onDate: string,
  copy = false,
  toRiderId?: string,
) {
  return withOrgContext(ctx, async (tx) => {
    const row = await loadOwn(tx, ctx, id);
    if (!copy) {
      await tx
        .update(plannedSessions)
        .set({ onDate, activityId: row.onDate === onDate ? row.activityId : null })
        .where(eq(plannedSessions.id, id));
      await recordMoveIn(tx, ctx, row, onDate);
      return { id };
    }
    return createSessionIn(tx, ctx, {
      riderId: toRiderId ?? row.riderId,
      onDate,
      sport: row.sport as SessionInputT["sport"],
      title: row.title,
      description: row.description,
      structure: readStructure(row.structure, row.sport as SessionInputT["sport"]),
      plannedMinutes: row.plannedMinutes,
      plannedKm: row.plannedKm,
      templateId: row.templateId,
      startTime: row.startTime,
      meetingPlace: row.meetingPlace,
    });
  });
}

export async function deleteSession(ctx: OrgContext, id: string, scope: Scope): Promise<number> {
  return withOrgContext(ctx, async (tx) => {
    const row = await loadOwn(tx, ctx, id);
    const copies = await targets(tx, ctx, row, scope);
    const ids = copies.map((c) => c.id);
    await recordDeletionsIn(tx, ctx, copies);
    await tx.delete(plannedSessions).where(inArray(plannedSessions.id, ids));
    return ids.length;
  });
}
