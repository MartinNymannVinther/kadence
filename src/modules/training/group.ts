import { randomUUID } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import { Refused } from "@/core/action";
import { plannedSessions, workoutTemplates } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { requireCoach } from "@/modules/team/access";
import { readStructure, structureMinutes } from "@/modules/workouts/structure";
import { MAX_SERIES_ROWS, repeatDates, repeatProblem, type Repeat } from "./recurrence";
import { createSessionsIn } from "./sessions";
import type { SessionInputT, Sport } from "./vocabulary";

/**
 * Plans for several riders at once — the coach writes it once and it lands
 * in every chosen rider's calendar, each copy carrying the same group key
 * so a later change can reach them all (TrainingPeaks' group plans,
 * without a separate concept). With a repeat (ADR 0041) the same goes on
 * every chosen weekday until the last day: one group key per day, one
 * series key over them all.
 */

const PROBLEM = { order: "repeatOrder", tooLong: "repeatTooLong", empty: "repeatEmpty" } as const;

/** The days a plan goes on: the one day, or every day of its repeat. */
function daysOf(onDate: string, repeat: Repeat | undefined, riders: number): string[] {
  if (!repeat) return [onDate];
  const problem = repeatProblem(onDate, repeat);
  if (problem) throw new Refused("invalid", PROBLEM[problem]);
  const days = repeatDates(onDate, repeat);
  if (days.length * riders > MAX_SERIES_ROWS) throw new Refused("invalid", "repeatTooMany");
  return days;
}

export async function createGroupSessions(
  ctx: OrgContext,
  riderIds: string[],
  input: Omit<SessionInputT, "riderId">,
  repeat?: Repeat,
): Promise<{ groupKey: string; ids: string[] }> {
  return withOrgContext(ctx, async (tx) => {
    // A plan for several riders is a coach's; a session for one rider is
    // anyone's who may write for that rider — a rider planning their own
    // (createSessionsIn checks).
    const unique = [...new Set(riderIds)];
    if (unique.length > 1) await requireCoach(tx, ctx);
    const days = daysOf(input.onDate, repeat, unique.length);
    const seriesKey = repeat ? randomUUID() : null;
    let firstGroup: string | null = null;
    const rows = days.flatMap((onDate) => {
      const groupKey = unique.length > 1 ? randomUUID() : null;
      firstGroup ??= groupKey;
      return unique.map((riderId) => ({
        ...input,
        onDate,
        riderId,
        groupKey,
        seriesKey,
        origin: groupKey ? ("group" as const) : undefined,
      }));
    });
    const ids = await createSessionsIn(tx, ctx, rows);
    return { groupKey: firstGroup ?? "", ids };
  });
}

/** How many sessions of a programme a rider already has: the next one is that plus one. */
async function nextProgrammeSession(tx: AppTransaction, riderId: string, templateId: string) {
  const [row] = await tx
    .select({ n: count() })
    .from(plannedSessions)
    .where(and(eq(plannedSessions.riderId, riderId), eq(plannedSessions.templateId, templateId)));
  return Number(row?.n ?? 0) + 1;
}

/**
 * A template into the calendar of one or more riders on a day — or, with
 * a repeat, on every day of it. A strength programme's session is
 * numbered per rider and counts on through the series, so each copy
 * carries the sets and reps of where that rider is in the programme.
 */
export async function scheduleTemplate(
  ctx: OrgContext,
  templateId: string,
  riderIds: string[],
  onDate: string,
  repeat?: Repeat,
): Promise<{ ids: string[] }> {
  return withOrgContext(ctx, async (tx) => {
    const [template] = await tx
      .select()
      .from(workoutTemplates)
      .where(eq(workoutTemplates.id, templateId));
    if (!template) throw new Refused("notFound");
    const sport = template.sport as Sport;
    const structure = readStructure(template.structure, sport);
    const unique = [...new Set(riderIds)];
    // A rider's own session goes into that rider's calendar only; for
    // anyone else a coach takes it into the library first (ADR 0050).
    if (template.riderId && unique.some((id) => id !== template.riderId))
      throw new Refused("forbidden", "ownTemplate");
    if (unique.length > 1) await requireCoach(tx, ctx);
    const days = daysOf(onDate, repeat, unique.length);
    const seriesKey = repeat ? randomUUID() : null;
    const programme = structure.kind === "strength" && structure.progression.length > 0;
    const next = new Map<string, number>();
    for (const riderId of unique)
      if (programme) next.set(riderId, await nextProgrammeSession(tx, riderId, templateId));
    const rows = days.flatMap((day, i) => {
      const groupKey = unique.length > 1 ? randomUUID() : null;
      return unique.map((riderId) => ({
        riderId,
        onDate: day,
        sport,
        title: template.name,
        description: template.description,
        structure,
        plannedMinutes: template.plannedMinutes || structureMinutes(structure),
        plannedKm: null,
        templateId,
        groupKey,
        seriesKey,
        origin: groupKey ? ("group" as const) : ("template" as const),
        programmeSession: programme ? next.get(riderId)! + i : null,
      }));
    });
    return { ids: await createSessionsIn(tx, ctx, rows) };
  });
}
