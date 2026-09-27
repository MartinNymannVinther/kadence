import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { workoutTemplates, type WorkoutTemplateRow } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { requireCoach } from "@/modules/team/access";
import { readStructure, structureMinutes, structureSchema } from "@/modules/workouts/structure";
import { MAX_TEXT, MAX_TITLE, SPORTS } from "./vocabulary";

/**
 * The team's library. Every member reads it; coaches keep it. DCU's own
 * programmes arrive through `installDcuProgrammes` and are marked as DCU's;
 * a coach who wants to change one duplicates it into their own.
 */

export const TemplateInput = z.object({
  name: z.string().trim().min(1).max(MAX_TITLE),
  sport: z.enum(SPORTS),
  description: z.string().trim().max(MAX_TEXT).default(""),
  structure: structureSchema,
  plannedMinutes: z.coerce.number().int().min(0).max(1440).default(0),
});
export type TemplateInputT = z.infer<typeof TemplateInput>;

export async function listTemplates(
  ctx: OrgContext,
  includeArchived = false,
): Promise<WorkoutTemplateRow[]> {
  return withOrgContext(ctx, (tx) =>
    tx
      .select()
      .from(workoutTemplates)
      .where(includeArchived ? undefined : eq(workoutTemplates.archived, false))
      .orderBy(asc(workoutTemplates.sport), asc(workoutTemplates.name)),
  );
}

export async function getTemplate(ctx: OrgContext, id: string): Promise<WorkoutTemplateRow | null> {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(workoutTemplates).where(eq(workoutTemplates.id, id));
    return row ?? null;
  });
}

function values(input: TemplateInputT) {
  const structure = readStructure(input.structure, input.sport);
  return {
    name: input.name,
    sport: input.sport,
    description: input.description,
    structure,
    plannedMinutes: input.plannedMinutes || structureMinutes(structure),
  };
}

export async function createTemplate(ctx: OrgContext, input: TemplateInputT) {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const [row] = await tx
      .insert(workoutTemplates)
      .values({ orgId: ctx.orgId, ...values(input), source: "own", createdBy: ctx.userId })
      .returning({ id: workoutTemplates.id });
    return row!;
  });
}

export async function updateTemplate(ctx: OrgContext, id: string, input: TemplateInputT) {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const rows = await tx
      .update(workoutTemplates)
      .set(values(input))
      .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.source, "own")))
      .returning({ id: workoutTemplates.id });
    if (rows.length === 0) throw new Refused("notFound");
  });
}

export async function archiveTemplate(ctx: OrgContext, id: string, archived: boolean) {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    await tx.update(workoutTemplates).set({ archived }).where(eq(workoutTemplates.id, id));
  });
}

/** A copy the coach may change — the way to adapt one of DCU's programmes. */
export async function duplicateTemplate(ctx: OrgContext, id: string, name: string) {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const [row] = await tx.select().from(workoutTemplates).where(eq(workoutTemplates.id, id));
    if (!row) throw new Refused("notFound");
    const [copy] = await tx
      .insert(workoutTemplates)
      .values({
        orgId: ctx.orgId,
        name,
        sport: row.sport,
        description: row.description,
        structure: row.structure,
        plannedMinutes: row.plannedMinutes,
        source: "own",
        createdBy: ctx.userId,
      })
      .returning({ id: workoutTemplates.id });
    return copy!;
  });
}
