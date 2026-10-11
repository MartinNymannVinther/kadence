import { and, asc, eq } from "drizzle-orm";
import type { z } from "zod";
import { Refused } from "@/core/action";
import { teamPrograms, type TeamProgramRow } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { log } from "@/core/log";
import { requireCoach } from "@/modules/team/access";
import { checkProgramRefs, parseOrRefuse, refsOf } from "./refs";
import { programPartsSchema, teamProgramInputSchema, type ProgramPart } from "./types";

/**
 * A team's own programmes: parts of the day, each a list of exercises of
 * either kind (refs.ts) with the programme's own dose where it differs.
 * Every member reads them, coaches keep them (drizzle/0032), and nothing
 * is deleted — a coach archives.
 */

/** What a coach sends: the contract's input, before its defaults are filled in. */
export type TeamProgramDraft = z.input<typeof teamProgramInputSchema>;

export type TeamProgram = {
  id: string;
  name: string;
  description: string;
  parts: ProgramPart[];
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** One row as the library sees it, or null when its parts no longer fit the contract. */
export function readTeamProgram(row: TeamProgramRow): TeamProgram | null {
  const parts = programPartsSchema.safeParse(row.parts);
  if (!parts.success) {
    void log.error("exercises: a stored team programme does not fit the contract", { id: row.id });
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    parts: parts.data,
    archived: row.archived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const present = <T>(value: T | null): value is T => value !== null;

/** The team's programmes by name; archived ones only when asked for. */
export async function listTeamPrograms(
  ctx: OrgContext,
  options: { includeArchived?: boolean } = {},
): Promise<TeamProgram[]> {
  const rows = await withOrgContext(ctx, (tx) =>
    tx
      .select()
      .from(teamPrograms)
      .where(
        and(
          eq(teamPrograms.orgId, ctx.orgId),
          options.includeArchived ? undefined : eq(teamPrograms.archived, false),
        ),
      )
      .orderBy(asc(teamPrograms.name), asc(teamPrograms.createdAt)),
  );
  return rows.map(readTeamProgram).filter(present);
}

/** One of the team's programmes, archived or not; null when the team has none by that id. */
export async function getTeamProgram(ctx: OrgContext, id: string): Promise<TeamProgram | null> {
  const [row] = await withOrgContext(ctx, (tx) =>
    tx
      .select()
      .from(teamPrograms)
      .where(and(eq(teamPrograms.orgId, ctx.orgId), eq(teamPrograms.id, id))),
  );
  return row ? readTeamProgram(row) : null;
}

export async function createTeamProgram(
  ctx: OrgContext,
  draft: TeamProgramDraft,
): Promise<{ id: string }> {
  const input = parseOrRefuse(teamProgramInputSchema, draft);
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    await checkProgramRefs(tx, ctx, input.parts);
    const [row] = await tx
      .insert(teamPrograms)
      .values({
        orgId: ctx.orgId,
        name: input.name,
        description: input.description,
        parts: input.parts,
        createdBy: ctx.userId,
      })
      .returning({ id: teamPrograms.id });
    return { id: row!.id };
  });
}

/**
 * Replaces a programme's name, description and parts. An exercise archived
 * since it was put in may stay; a newly added one must not be archived.
 */
export async function updateTeamProgram(
  ctx: OrgContext,
  id: string,
  draft: TeamProgramDraft,
): Promise<void> {
  const input = parseOrRefuse(teamProgramInputSchema, draft);
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const [existing] = await tx
      .select({ parts: teamPrograms.parts })
      .from(teamPrograms)
      .where(and(eq(teamPrograms.orgId, ctx.orgId), eq(teamPrograms.id, id)));
    if (!existing) throw new Refused("notFound");
    const before = programPartsSchema.safeParse(existing.parts);
    await checkProgramRefs(
      tx,
      ctx,
      input.parts,
      new Set(before.success ? refsOf(before.data) : []),
    );
    await tx
      .update(teamPrograms)
      .set({ name: input.name, description: input.description, parts: input.parts })
      .where(and(eq(teamPrograms.orgId, ctx.orgId), eq(teamPrograms.id, id)));
  });
}

/** Archives a programme, or takes it back with `archived: false`. */
export async function archiveTeamProgram(
  ctx: OrgContext,
  id: string,
  archived = true,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const rows = await tx
      .update(teamPrograms)
      .set({ archived })
      .where(and(eq(teamPrograms.orgId, ctx.orgId), eq(teamPrograms.id, id)))
      .returning({ id: teamPrograms.id });
    if (rows.length === 0) throw new Refused("notFound");
  });
}
