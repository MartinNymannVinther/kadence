import { randomUUID } from "node:crypto";
import { and, count, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { addDaysIso, mondayOf, todayInCopenhagen } from "@/core/dates";
import { plannedSessions, type PlannedSessionRow } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { previewPlan, type RiderPlanPreview } from "@/modules/season/preview";
import { requireCoach } from "@/modules/team/access";
import { readStructure } from "@/modules/workouts/structure";
import { planCopy } from "./copy-week";
import { createSessionsIn } from "./sessions";
import type { Sport } from "./vocabulary";

/**
 * "Kopiér ugen" (ADR 0042) against the database: each chosen rider's own
 * week laid again on another, previewed in the four numbers first. A
 * rider may copy their own week; several riders' is a coach's. RLS reads
 * and writes only what the caller may.
 */

export const CopyWeekInput = z.object({
  riderIds: z.array(z.string().min(1).max(100)).min(1).max(60),
  fromMonday: z.iso.date(),
  toMonday: z.iso.date(),
});
export type CopyWeekInputT = z.infer<typeof CopyWeekInput>;

async function planFor(tx: AppTransaction, ctx: OrgContext, input: CopyWeekInputT) {
  const riders = [...new Set(input.riderIds)];
  if (riders.length > 1) await requireCoach(tx, ctx);
  const from = mondayOf(input.fromMonday);
  const to = mondayOf(input.toMonday);
  if (from === to) throw new Refused("invalid", "copySameWeek");
  const week = (monday: string) =>
    tx
      .select()
      .from(plannedSessions)
      .where(
        and(
          inArray(plannedSessions.riderId, riders),
          gte(plannedSessions.onDate, monday),
          lte(plannedSessions.onDate, addDaysIso(monday, 6)),
        ),
      );
  const source = await week(from);
  const target = await week(to);
  const plan = planCopy({
    sessions: source,
    fromMonday: from,
    toMonday: to,
    seriesInTarget: (riderId) =>
      new Set(target.filter((s) => s.riderId === riderId && s.seriesKey).map((s) => s.seriesKey!)),
  });
  return { plan, to };
}

/** How many sessions of a programme a rider has: the next is that plus one. */
async function programmeCount(tx: AppTransaction, riderId: string, templateId: string) {
  const [row] = await tx
    .select({ n: count() })
    .from(plannedSessions)
    .where(and(eq(plannedSessions.riderId, riderId), eq(plannedSessions.templateId, templateId)));
  return Number(row?.n ?? 0);
}

export async function copyWeek(
  ctx: OrgContext,
  input: CopyWeekInputT,
): Promise<{ copied: number; skipped: number }> {
  return withOrgContext(ctx, async (tx) => {
    const { plan } = await planFor(tx, ctx, input);
    const groups = new Map<string, string>();
    const numbers = new Map<string, number>();
    const rows = [];
    for (const { source, onDate, groupRef } of plan.copies) {
      if (groupRef && !groups.has(groupRef)) groups.set(groupRef, randomUUID());
      const groupKey = groupRef ? groups.get(groupRef)! : null;
      let programmeSession: number | null = null;
      if (source.programmeSession !== null && source.templateId) {
        // A programme counts on from where the rider is, not from the copied number.
        const key = `${source.riderId} ${source.templateId}`;
        const next =
          (numbers.get(key) ?? (await programmeCount(tx, source.riderId, source.templateId))) + 1;
        numbers.set(key, next);
        programmeSession = next;
      }
      rows.push(copyOf(source, onDate, groupKey, programmeSession));
    }
    await createSessionsIn(tx, ctx, rows);
    return { copied: rows.length, skipped: plan.skipped.length };
  });
}

function copyOf(
  source: PlannedSessionRow,
  onDate: string,
  groupKey: string | null,
  programmeSession: number | null,
) {
  const sport = source.sport as Sport;
  return {
    riderId: source.riderId,
    onDate,
    sport,
    title: source.title,
    description: source.description,
    structure: readStructure(source.structure, sport),
    plannedMinutes: source.plannedMinutes,
    plannedKm: source.plannedKm,
    templateId: source.templateId,
    groupKey,
    origin: groupKey
      ? ("group" as const)
      : source.templateId
        ? ("template" as const)
        : ("manual" as const),
    programmeSession,
  };
}

export type CopyPreview = { riders: RiderPlanPreview[]; copied: number; skipped: number };

/** The copy before it is made: each rider's target week in the four numbers, before and after. */
export async function previewCopyWeek(
  ctx: OrgContext,
  input: CopyWeekInputT,
): Promise<CopyPreview> {
  const { plan, to } = await withOrgContext(ctx, (tx) => planFor(tx, ctx, input));
  const riders = await previewPlan(ctx, {
    riderIds: [...new Set(input.riderIds)],
    additions: (riderId) =>
      plan.copies
        .filter((c) => c.source.riderId === riderId)
        .map((c) => ({
          onDate: c.onDate,
          sport: c.source.sport,
          plannedMinutes: c.source.plannedMinutes,
        })),
    periods: [{ from: to, to: addDaysIso(to, 6) }],
    today: todayInCopenhagen(),
  });
  return { riders, copied: plan.copies.length, skipped: plan.skipped.length };
}
