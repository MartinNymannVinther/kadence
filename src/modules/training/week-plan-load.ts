import { and, gte, inArray, lte } from "drizzle-orm";
import { addDaysIso, diffDays, mondayOf } from "@/core/dates";
import { plannedSessions, workoutTemplates, type PlannedSessionRow } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { requireCoach } from "@/modules/team/access";
import { readStructure } from "@/modules/workouts/structure";
import { byStartTime, clockOf } from "./time-place";
import type { Sport } from "./vocabulary";
import { MAX_PLAN_ITEMS, type PlanItemInputT } from "./week-plan";

/**
 * Where a week plan can start from (ADR 0043, 0059): a week already in
 * the calendars, as a draft the coach changes before anything is laid in.
 * Sessions from the library come back as the library's; the rest as they
 * were built, with their time and place (ADR 0058). A coach's.
 */

function weekOf(tx: AppTransaction, riderIds: string[], monday: string) {
  return tx
    .select()
    .from(plannedSessions)
    .where(
      and(
        inArray(plannedSessions.riderId, riderIds),
        gte(plannedSessions.onDate, monday),
        lte(plannedSessions.onDate, addDaysIso(monday, 6)),
      ),
    );
}

/** A week's sessions as the plan's items, in the order they come in the week. */
async function itemsOf(
  tx: AppTransaction,
  rows: PlannedSessionRow[],
  monday: string,
): Promise<PlanItemInputT[]> {
  const named = rows.flatMap((r) => (r.templateId ? [r.templateId] : []));
  const library = new Set(
    named.length === 0
      ? []
      : (
          await tx
            .select({ id: workoutTemplates.id })
            .from(workoutTemplates)
            .where(inArray(workoutTemplates.id, named))
        ).map((t) => t.id),
  );
  const days = [...new Set(rows.map((r) => r.onDate))].sort();
  return days
    .flatMap((day) => byStartTime(rows.filter((r) => r.onDate === day)))
    .slice(0, MAX_PLAN_ITEMS)
    .map((row): PlanItemInputT => {
      const day = diffDays(monday, row.onDate);
      const at = { startTime: clockOf(row.startTime), meetingPlace: row.meetingPlace };
      if (row.templateId && library.has(row.templateId))
        return { kind: "template", day, templateId: row.templateId, ...at };
      const sport = row.sport as Sport;
      return {
        kind: "built",
        day,
        ...at,
        session: {
          sport,
          title: row.title,
          description: row.description,
          structure: readStructure(row.structure, sport),
          plannedMinutes: row.plannedMinutes,
          plannedKm: row.plannedKm,
        },
      };
    });
}

/** One rider's week as the plan's starting point — "a week like Emma's last week". */
export async function loadRiderWeek(
  ctx: OrgContext,
  input: { riderId: string; monday: string },
): Promise<PlanItemInputT[]> {
  const monday = mondayOf(input.monday);
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    return itemsOf(tx, await weekOf(tx, [input.riderId], monday), monday);
  });
}

/** The same session twice — two riders' copies of a group, or two groups made alike — once. */
function onceEach(rows: PlannedSessionRow[]): PlannedSessionRow[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const keys = [
      r.groupKey ? `group ${r.groupKey}` : null,
      [r.onDate, r.sport, r.title, clockOf(r.startTime), r.meetingPlace, r.plannedMinutes].join(
        "|",
      ),
    ].filter((k): k is string => k !== null);
    if (keys.some((k) => seen.has(k))) return false;
    keys.forEach((k) => seen.add(k));
    return true;
  });
}

/**
 * "Sidste uge": the week before the plan's, as its draft. For one rider,
 * that rider's whole week. For several, the sessions laid in for more
 * than one rider at a time — each group plan once — since a plan is the
 * same week for everyone it is for (ADR 0043), and a rider's own session
 * is not the group's. A session of a series that already has a day in the
 * plan's week is left out: the series has it covered (ADR 0042).
 */
export async function loadPreviousWeek(
  ctx: OrgContext,
  input: { riderIds: string[]; monday: string },
): Promise<PlanItemInputT[]> {
  const target = mondayOf(input.monday);
  const source = addDaysIso(target, -7);
  const riders = [...new Set(input.riderIds)];
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const rows = await weekOf(tx, riders, source);
    const ahead = await weekOf(tx, riders, target);
    const covered = new Set(ahead.flatMap((s) => (s.seriesKey ? [s.seriesKey] : [])));
    const open = rows
      .filter((r) => !r.seriesKey || !covered.has(r.seriesKey))
      .sort((a, b) => a.sort - b.sort || a.createdAt.getTime() - b.createdAt.getTime());
    const chosen = riders.length === 1 ? open : onceEach(open.filter((r) => r.groupKey !== null));
    return itemsOf(tx, chosen, source);
  });
}
