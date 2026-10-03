import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { riders, workoutTemplates, type WorkoutTemplateRow } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { requireCoach, requireWriteFor } from "@/modules/team/access";
import { readStructure, structureMinutes, structureSchema } from "@/modules/workouts/structure";
import { MAX_TEXT, MAX_TITLE, SPORTS } from "./vocabulary";

/**
 * The team's library. Every member reads it; coaches keep it. DCU's own
 * programmes arrive through `installDcuProgrammes` and are marked as DCU's;
 * a coach who wants to change one duplicates it into their own.
 *
 * Beside it, a rider's own sessions (ADR 0050): a template with a
 * `rider_id`, which the rider writes and the coaches read, under the
 * rider policies in drizzle/0021. A coach takes one into the library as
 * a copy (`adoptTemplate`).
 */

export const TemplateInput = z.object({
  name: z.string().trim().min(1).max(MAX_TITLE),
  sport: z.enum(SPORTS),
  description: z.string().trim().max(MAX_TEXT).default(""),
  structure: structureSchema,
  plannedMinutes: z.coerce.number().int().min(0).max(1440).default(0),
  /** Set for a rider's own session; absent for the team's library. */
  riderId: z.string().min(1).max(100).optional(),
});
export type TemplateInputT = z.infer<typeof TemplateInput>;

/** The team's library: what every member sees and plans from. */
export async function listTemplates(
  ctx: OrgContext,
  includeArchived = false,
): Promise<WorkoutTemplateRow[]> {
  return withOrgContext(ctx, (tx) =>
    tx
      .select()
      .from(workoutTemplates)
      .where(
        and(
          isNull(workoutTemplates.riderId),
          includeArchived ? undefined : eq(workoutTemplates.archived, false),
        ),
      )
      .orderBy(asc(workoutTemplates.sport), asc(workoutTemplates.name)),
  );
}

export type OwnTemplate = WorkoutTemplateRow & { riderName: string };

/**
 * Riders' own sessions the caller may see — the database decides: a rider
 * their own, a coach every rider's, a parent a child's who shares training.
 * `riderId` narrows to one rider.
 */
export async function listOwnTemplates(
  ctx: OrgContext,
  options: { riderId?: string; includeArchived?: boolean } = {},
): Promise<OwnTemplate[]> {
  return withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .select({ template: workoutTemplates, riderName: riders.name })
      .from(workoutTemplates)
      .innerJoin(riders, eq(riders.id, workoutTemplates.riderId))
      .where(
        and(
          isNotNull(workoutTemplates.riderId),
          options.riderId ? eq(workoutTemplates.riderId, options.riderId) : undefined,
          options.includeArchived ? undefined : eq(workoutTemplates.archived, false),
        ),
      )
      .orderBy(asc(riders.name), asc(workoutTemplates.sport), asc(workoutTemplates.name));
    return rows.map((r) => ({ ...r.template, riderName: r.riderName }));
  });
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

/** Who may change a template: a coach the team's, the rider or a coach a rider's own. */
async function requireTemplateWrite(tx: AppTransaction, ctx: OrgContext, riderId: string | null) {
  if (riderId) await requireWriteFor(tx, ctx, riderId);
  else await requireCoach(tx, ctx);
}

export async function createTemplate(ctx: OrgContext, input: TemplateInputT) {
  return withOrgContext(ctx, async (tx) => {
    const riderId = input.riderId ?? null;
    await requireTemplateWrite(tx, ctx, riderId);
    const [row] = await tx
      .insert(workoutTemplates)
      .values({
        orgId: ctx.orgId,
        ...values(input),
        source: "own",
        riderId,
        createdBy: ctx.userId,
      })
      .returning({ id: workoutTemplates.id });
    return row!;
  });
}

export async function updateTemplate(ctx: OrgContext, id: string, input: TemplateInputT) {
  await withOrgContext(ctx, async (tx) => {
    const [existing] = await tx
      .select({ riderId: workoutTemplates.riderId })
      .from(workoutTemplates)
      .where(eq(workoutTemplates.id, id));
    if (!existing) throw new Refused("notFound");
    await requireTemplateWrite(tx, ctx, existing.riderId);
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
    const [existing] = await tx
      .select({ riderId: workoutTemplates.riderId })
      .from(workoutTemplates)
      .where(eq(workoutTemplates.id, id));
    if (!existing) throw new Refused("notFound");
    await requireTemplateWrite(tx, ctx, existing.riderId);
    await tx.update(workoutTemplates).set({ archived }).where(eq(workoutTemplates.id, id));
  });
}

/**
 * A rider's own session into the team's library (ADR 0050): a copy the
 * team owns, which remembers whose it was; the rider's own stays theirs.
 */
export async function adoptTemplate(ctx: OrgContext, id: string) {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const [row] = await tx
      .select()
      .from(workoutTemplates)
      .where(and(eq(workoutTemplates.id, id), isNotNull(workoutTemplates.riderId)));
    if (!row) throw new Refused("notFound");
    const [copy] = await tx
      .insert(workoutTemplates)
      .values({
        orgId: ctx.orgId,
        name: row.name,
        sport: row.sport,
        description: row.description,
        structure: row.structure,
        plannedMinutes: row.plannedMinutes,
        source: "own",
        copiedFrom: row.id,
        createdBy: ctx.userId,
      })
      .returning({ id: workoutTemplates.id });
    return copy!;
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
