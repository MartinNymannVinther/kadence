import { randomUUID } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import { Refused } from "@/core/action";
import { plannedSessions, workoutTemplates } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { requireCoach } from "@/modules/team/access";
import { readStructure, structureMinutes } from "@/modules/workouts/structure";
import { createSessionIn } from "./sessions";
import type { SessionInputT, Sport } from "./vocabulary";

/**
 * Plans for several riders at once — the coach writes it once and it lands
 * in every chosen rider's calendar, each copy carrying the same group key
 * so a later change can reach them all (TrainingPeaks' group plans,
 * without a separate concept).
 */

export async function createGroupSessions(
  ctx: OrgContext,
  riderIds: string[],
  input: Omit<SessionInputT, "riderId">,
): Promise<{ groupKey: string; ids: string[] }> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const groupKey = riderIds.length > 1 ? randomUUID() : null;
    const ids: string[] = [];
    for (const riderId of [...new Set(riderIds)]) {
      const { id } = await createSessionIn(tx, ctx, {
        ...input,
        riderId,
        groupKey,
        origin: groupKey ? "group" : undefined,
      });
      ids.push(id);
    }
    return { groupKey: groupKey ?? "", ids };
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
 * A template into the calendar of one or more riders on a day. A strength
 * programme's session is numbered per rider, so each rider's copy carries
 * the sets and reps of where that rider is in the programme.
 */
export async function scheduleTemplate(
  ctx: OrgContext,
  templateId: string,
  riderIds: string[],
  onDate: string,
): Promise<{ ids: string[] }> {
  return withOrgContext(ctx, async (tx) => {
    const [template] = await tx
      .select()
      .from(workoutTemplates)
      .where(eq(workoutTemplates.id, templateId));
    if (!template) throw new Refused("notFound");
    const sport = template.sport as Sport;
    const structure = readStructure(template.structure, sport);
    const groupKey = riderIds.length > 1 ? randomUUID() : null;
    if (groupKey) await requireCoach(tx, ctx);
    const ids: string[] = [];
    for (const riderId of [...new Set(riderIds)]) {
      const programmeSession =
        structure.kind === "strength" && structure.progression.length > 0
          ? await nextProgrammeSession(tx, riderId, templateId)
          : null;
      const { id } = await createSessionIn(tx, ctx, {
        riderId,
        onDate,
        sport,
        title: template.name,
        description: template.description,
        structure,
        plannedMinutes: template.plannedMinutes || structureMinutes(structure),
        plannedKm: null,
        templateId,
        groupKey,
        origin: groupKey ? "group" : "template",
        programmeSession,
      });
      ids.push(id);
    }
    return { ids };
  });
}
