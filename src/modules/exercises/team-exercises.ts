import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { teamExercises, type TeamExerciseRow } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { requireCoach } from "@/modules/team/access";
import { parseOrRefuse, teamRef } from "./refs";
import {
  doseSchema,
  EQUIPMENT,
  EXERCISE_GROUPS,
  poseSchema,
  teamExerciseInputSchema,
  type ExerciseRef,
  type ExerciseView,
} from "./types";

/**
 * A team's own exercises (docs/plan-ovelser-og-programmer.md): every
 * member reads them, coaches keep them (drizzle/0032). What a coach writes
 * is the contract's `teamExerciseInputSchema`; the service applies it
 * again whatever the caller already did, and reads the JSON back through
 * the same schemas, so a row that no longer fits is left out rather than
 * guessed at.
 *
 * Nothing is deleted. Archiving hides an exercise from the library's list
 * and from new programmes; the programmes that already have it keep
 * resolving it (resolve.ts).
 */

/** What a coach sends: the contract's input, before its defaults are filled in. */
export type TeamExerciseDraft = z.input<typeof teamExerciseInputSchema>;

/** A team's exercise as the library shows it: the view, and what the library needs besides. */
export type TeamExercise = ExerciseView & {
  id: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const storedSchema = z.object({
  group: z.enum(EXERCISE_GROUPS),
  equipment: z.array(z.enum(EQUIPMENT)),
  dose: doseSchema,
  pose: poseSchema,
});

/**
 * One row as every reader sees it, or null when its stored shape no longer
 * fits the contract (logged, so it is found and mended rather than drawn
 * wrong).
 */
export function teamExerciseView(row: TeamExerciseRow): ExerciseView | null {
  const parsed = storedSchema.safeParse(row);
  if (!parsed.success) {
    console.error("exercises: a stored team exercise does not fit the contract", row.id);
    return null;
  }
  return {
    ref: teamRef(row.id),
    name: row.name,
    how: row.how,
    why: row.why,
    ...parsed.data,
  };
}

function toTeamExercise(row: TeamExerciseRow): TeamExercise | null {
  const view = teamExerciseView(row);
  if (!view) return null;
  return {
    ...view,
    id: row.id,
    archived: row.archived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const present = <T>(value: T | null): value is T => value !== null;

/** The team's exercises by name; archived ones only when asked for. */
export async function listTeamExercises(
  ctx: OrgContext,
  options: { includeArchived?: boolean } = {},
): Promise<TeamExercise[]> {
  const rows = await withOrgContext(ctx, (tx) =>
    tx
      .select()
      .from(teamExercises)
      .where(
        and(
          eq(teamExercises.orgId, ctx.orgId),
          options.includeArchived ? undefined : eq(teamExercises.archived, false),
        ),
      )
      .orderBy(asc(teamExercises.name), asc(teamExercises.createdAt)),
  );
  return rows.map(toTeamExercise).filter(present);
}

/** One of the team's exercises, archived or not; null when the team has none by that id. */
export async function getTeamExercise(ctx: OrgContext, id: string): Promise<TeamExercise | null> {
  const [row] = await withOrgContext(ctx, (tx) =>
    tx
      .select()
      .from(teamExercises)
      .where(and(eq(teamExercises.orgId, ctx.orgId), eq(teamExercises.id, id))),
  );
  return row ? toTeamExercise(row) : null;
}

function values(draft: TeamExerciseDraft) {
  const input = parseOrRefuse(teamExerciseInputSchema, draft);
  return {
    name: input.name,
    group: input.group,
    // Each piece once, in the contract's order, whatever order it came in.
    equipment: EQUIPMENT.filter((item) => input.equipment.includes(item)),
    dose: input.dose,
    how: input.how,
    why: input.why,
    pose: input.pose,
  };
}

export async function createTeamExercise(
  ctx: OrgContext,
  draft: TeamExerciseDraft,
): Promise<{ id: string; ref: ExerciseRef }> {
  const fields = values(draft);
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const [row] = await tx
      .insert(teamExercises)
      .values({ orgId: ctx.orgId, ...fields, createdBy: ctx.userId })
      .returning({ id: teamExercises.id });
    return { id: row!.id, ref: teamRef(row!.id) };
  });
}

export async function updateTeamExercise(
  ctx: OrgContext,
  id: string,
  draft: TeamExerciseDraft,
): Promise<void> {
  const fields = values(draft);
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const rows = await tx
      .update(teamExercises)
      .set(fields)
      .where(and(eq(teamExercises.orgId, ctx.orgId), eq(teamExercises.id, id)))
      .returning({ id: teamExercises.id });
    if (rows.length === 0) throw new Refused("notFound");
  });
}

/** Archives an exercise, or takes it back into the library with `archived: false`. */
export async function archiveTeamExercise(
  ctx: OrgContext,
  id: string,
  archived = true,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const rows = await tx
      .update(teamExercises)
      .set({ archived })
      .where(and(eq(teamExercises.orgId, ctx.orgId), eq(teamExercises.id, id)))
      .returning({ id: teamExercises.id });
    if (rows.length === 0) throw new Refused("notFound");
  });
}
