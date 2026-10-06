import { randomUUID } from "node:crypto";
import { and, count, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { addDaysIso, diffDays, mondayOf, todayInCopenhagen } from "@/core/dates";
import { plannedSessions, workoutTemplates } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { previewPlan, type RiderPlanPreview } from "@/modules/season/preview";
import { requireCoach } from "@/modules/team/access";
import { readStructure, structureMinutes } from "@/modules/workouts/structure";
import { createSessionsIn } from "./sessions";
import { clockOf, TimePlaceFields } from "./time-place";
import { SessionInput, type Sport } from "./vocabulary";

/**
 * The team's week plan (ADR 0043): a week of sessions — from the library
 * or built there — laid into the calendars of every chosen rider in one
 * press, after a preview in the four numbers (ADR 0040). Each session of
 * the plan is one group plan across the riders, so "Ret alle" reaches its
 * copies; a strength programme counts on per rider. A coach's.
 */

const id = z.string().min(1).max(100);
const day = z.number().int().min(0).max(6);

/** A session of the plan as it is built: what the session is, without whose, which day or when. */
export const BuiltSession = SessionInput.omit({
  riderId: true,
  onDate: true,
  templateId: true,
  startTime: true,
  meetingPlace: true,
});

/** Each item of the plan may carry when and where it starts (ADR 0057). */
export const PlanItemInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("template"), day, templateId: id, ...TimePlaceFields }),
  z.object({ kind: z.literal("built"), day, session: BuiltSession, ...TimePlaceFields }),
]);
export type PlanItemInputT = z.infer<typeof PlanItemInput>;

export const WeekPlanInput = z.object({
  riderIds: z.array(id).min(1).max(60),
  monday: z.iso.date(),
  items: z.array(PlanItemInput).min(1).max(21),
});
export type WeekPlanInputT = z.infer<typeof WeekPlanInput>;

async function templatesOf(tx: AppTransaction, items: PlanItemInputT[]) {
  const ids = [...new Set(items.flatMap((i) => (i.kind === "template" ? [i.templateId] : [])))];
  if (ids.length === 0) return new Map<string, typeof workoutTemplates.$inferSelect>();
  const rows = await tx.select().from(workoutTemplates).where(inArray(workoutTemplates.id, ids));
  if (rows.length !== ids.length) throw new Refused("notFound");
  return new Map(rows.map((r) => [r.id, r]));
}

/** An item as a session, without whose or which day: what every rider's copy shares. */
function sessionOf(
  item: PlanItemInputT,
  templates: Map<string, typeof workoutTemplates.$inferSelect>,
) {
  const at = { startTime: clockOf(item.startTime), meetingPlace: item.meetingPlace ?? "" };
  if (item.kind === "built") return { ...item.session, ...at, templateId: null, programme: false };
  const template = templates.get(item.templateId)!;
  const sport = template.sport as Sport;
  const structure = readStructure(template.structure, sport);
  return {
    sport,
    title: template.name,
    description: template.description,
    structure,
    plannedMinutes: template.plannedMinutes || structureMinutes(structure),
    plannedKm: null,
    templateId: template.id,
    ...at,
    programme: structure.kind === "strength" && structure.progression.length > 0,
  };
}

export async function applyWeekPlan(
  ctx: OrgContext,
  input: WeekPlanInputT,
): Promise<{ sessions: number }> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const monday = mondayOf(input.monday);
    const riders = [...new Set(input.riderIds)];
    const templates = await templatesOf(tx, input.items);
    const next = new Map<string, number>();
    const rows = [];
    for (const item of [...input.items].sort((a, b) => a.day - b.day)) {
      const { programme, ...session } = sessionOf(item, templates);
      const groupKey = riders.length > 1 ? randomUUID() : null;
      for (const riderId of riders) {
        let programmeSession: number | null = null;
        if (programme && session.templateId) {
          const key = `${riderId} ${session.templateId}`;
          if (!next.has(key)) {
            const [row] = await tx
              .select({ n: count() })
              .from(plannedSessions)
              .where(
                and(
                  eq(plannedSessions.riderId, riderId),
                  eq(plannedSessions.templateId, session.templateId),
                ),
              );
            next.set(key, Number(row?.n ?? 0) + 1);
          }
          programmeSession = next.get(key)!;
          next.set(key, programmeSession + 1);
        }
        rows.push({
          ...session,
          riderId,
          onDate: addDaysIso(monday, item.day),
          groupKey,
          origin: groupKey
            ? ("group" as const)
            : session.templateId
              ? ("template" as const)
              : ("manual" as const),
          programmeSession,
        });
      }
    }
    const ids = await createSessionsIn(tx, ctx, rows);
    return { sessions: ids.length };
  });
}

/** The plan before it is made: each rider's week in the four numbers, before and after. */
export async function previewWeekPlan(
  ctx: OrgContext,
  input: WeekPlanInputT,
): Promise<RiderPlanPreview[]> {
  const monday = mondayOf(input.monday);
  const added = await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const templates = await templatesOf(tx, input.items);
    return input.items.map((item) => {
      const session = sessionOf(item, templates);
      return {
        onDate: addDaysIso(monday, item.day),
        sport: session.sport,
        plannedMinutes: session.plannedMinutes || structureMinutes(session.structure),
      };
    });
  });
  return previewPlan(ctx, {
    riderIds: [...new Set(input.riderIds)],
    additions: () => added,
    periods: [{ from: monday, to: addDaysIso(monday, 6) }],
    today: todayInCopenhagen(),
  });
}

/**
 * One rider's week as the plan's starting point — "a week like Emma's
 * last week" for the whole group. Sessions from the library come back as
 * the library's; the rest as they were built.
 */
export async function loadRiderWeek(
  ctx: OrgContext,
  input: { riderId: string; monday: string },
): Promise<PlanItemInputT[]> {
  const monday = mondayOf(input.monday);
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const rows = await tx
      .select()
      .from(plannedSessions)
      .where(
        and(
          eq(plannedSessions.riderId, input.riderId),
          gte(plannedSessions.onDate, monday),
          lte(plannedSessions.onDate, addDaysIso(monday, 6)),
        ),
      );
    const library = new Set(
      (
        await tx
          .select({ id: workoutTemplates.id })
          .from(workoutTemplates)
          .where(
            inArray(
              workoutTemplates.id,
              rows.flatMap((r) => (r.templateId ? [r.templateId] : [])).concat("—"),
            ),
          )
      ).map((t) => t.id),
    );
    return rows
      .sort((a, b) => a.onDate.localeCompare(b.onDate))
      .slice(0, 21)
      .map((row): PlanItemInputT => {
        const dayOf = diffDays(monday, row.onDate);
        const at = { startTime: clockOf(row.startTime), meetingPlace: row.meetingPlace };
        if (row.templateId && library.has(row.templateId))
          return { kind: "template", day: dayOf, templateId: row.templateId, ...at };
        const sport = row.sport as Sport;
        return {
          kind: "built",
          day: dayOf,
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
  });
}
