import { randomUUID } from "node:crypto";
import { and, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { addDaysIso, mondayOf, todayInCopenhagen } from "@/core/dates";
import { plannedSessions, workoutTemplates } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { previewPlan, type RiderPlanPreview } from "@/modules/season/preview";
import { requireCoach } from "@/modules/team/access";
import { readStructure, structureMinutes } from "@/modules/workouts/structure";
import { MAX_SERIES_ROWS } from "./recurrence";
import { createSessionsIn } from "./sessions";
import { clockOf, TimePlaceFields } from "./time-place";
import { SessionInput, type Sport } from "./vocabulary";

/**
 * The team's week plan (ADR 0043, 0058): a week of sessions — from the
 * library or built there — laid into the calendars of every chosen rider
 * in one press, after a preview in the four numbers (ADR 0040), and with
 * "Gentag i N uger" into that many weeks in a row. Each session of the
 * plan is one group plan across the riders each week, so "Ret alle"
 * reaches its copies; repeated, the weeks' copies of a session are one
 * series (ADR 0041), so "Ret serien" reaches the coming ones. A strength
 * programme counts on per rider. A coach's.
 */

const id = z.string().min(1).max(100);
const day = z.number().int().min(0).max(6);

/** As many sessions as one press lays into a week. */
export const MAX_PLAN_ITEMS = 21;
/** As many weeks in a row as one press lays in: a block's longest (ADR 0025). */
export const MAX_PLAN_WEEKS = 12;

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
  items: z.array(PlanItemInput).min(1).max(MAX_PLAN_ITEMS),
  /** "Gentag i N uger": the same week in this many weeks in a row, from `monday`. */
  weeks: z.number().int().min(1).max(MAX_PLAN_WEEKS).optional(),
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

/** The Mondays the plan goes into: this one, and the weeks after it when repeated. */
function mondaysOf(input: WeekPlanInputT): string[] {
  const first = mondayOf(input.monday);
  return Array.from({ length: input.weeks ?? 1 }, (_, w) => addDaysIso(first, 7 * w));
}

export async function applyWeekPlan(
  ctx: OrgContext,
  input: WeekPlanInputT,
): Promise<{ sessions: number }> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const mondays = mondaysOf(input);
    const riders = [...new Set(input.riderIds)];
    if (input.items.length * riders.length * mondays.length > MAX_SERIES_ROWS)
      throw new Refused("invalid", "repeatTooMany");
    const templates = await templatesOf(tx, input.items);
    const items = [...input.items].sort((a, b) => a.day - b.day);
    // Repeated, each item's copies over the weeks are one series.
    const series = items.map(() => (mondays.length > 1 ? randomUUID() : null));
    const next = new Map<string, number>();
    const rows = [];
    for (const monday of mondays)
      for (const [i, item] of items.entries()) {
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
            seriesKey: series[i] ?? null,
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

/** The plan before it is made: each rider's weeks in the four numbers, before and after. */
export async function previewWeekPlan(
  ctx: OrgContext,
  input: WeekPlanInputT,
): Promise<RiderPlanPreview[]> {
  const mondays = mondaysOf(input);
  const added = await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const templates = await templatesOf(tx, input.items);
    return input.items.map((item) => {
      const session = sessionOf(item, templates);
      return {
        day: item.day,
        sport: session.sport,
        plannedMinutes: session.plannedMinutes || structureMinutes(session.structure),
      };
    });
  });
  const additions = mondays.flatMap((monday) =>
    added.map(({ day, ...rest }) => ({ ...rest, onDate: addDaysIso(monday, day) })),
  );
  return previewPlan(ctx, {
    riderIds: [...new Set(input.riderIds)],
    additions: () => additions,
    periods: mondays.map((monday) => ({ from: monday, to: addDaysIso(monday, 6) })),
    today: todayInCopenhagen(),
  });
}
