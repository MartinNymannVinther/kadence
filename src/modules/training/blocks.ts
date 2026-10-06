import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import {
  trainingBlockItems,
  trainingBlocks,
  workoutTemplates,
  type TrainingBlockRow,
} from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { requireCoach } from "@/modules/team/access";
import { readStructure, structureMinutes, type Structure } from "@/modules/workouts/structure";
import { clockOf, TimePlaceFields } from "./time-place";
import { id, SessionInput, type Sport } from "./vocabulary";

/**
 * Training blocks (ADR 0025): a few weeks of sessions laid out day by
 * day, kept by the coach and put into calendars from a Monday
 * (block-apply.ts). An item is one of the library's sessions, or — saved
 * from the week planner — a session kept in the block itself, with its
 * own sport, title and steps (ADR 0058, drizzle/0027). Either may say when
 * and where it starts (ADR 0057).
 */

export const MAX_WEEKS = 12;
export const MAX_ITEMS = 120;

const blockDay = z
  .number()
  .int()
  .min(0)
  .max(MAX_WEEKS * 7 - 1);

/** A session kept in the block: what it is, without whose, which day or when. */
export const BlockSession = SessionInput.pick({
  sport: true,
  title: true,
  description: true,
  structure: true,
  plannedMinutes: true,
});

export const BlockItemInput = z.union([
  z.object({ day: blockDay, templateId: id, ...TimePlaceFields }),
  z.object({ day: blockDay, session: BlockSession, ...TimePlaceFields }),
]);
export type BlockItemInputT = z.infer<typeof BlockItemInput>;

export const BlockInput = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(600).default(""),
  weeks: z.number().int().min(1).max(MAX_WEEKS),
  items: z.array(BlockItemInput).max(MAX_ITEMS),
});
export type BlockInputT = z.infer<typeof BlockInput>;

/** An item as the block's readers see it, from the library or kept in the block. */
export type BlockItem = {
  day: number;
  /** The library's session, or null for one kept in the block. */
  templateId: string | null;
  /** The library's name, or the session's own title. */
  title: string;
  sport: Sport;
  plannedMinutes: number;
  startTime: string | null;
  meetingPlace: string;
  /** A session kept in the block: its words and steps. */
  session: { description: string; structure: Structure } | null;
};

export type BlockWithItems = TrainingBlockRow & { items: BlockItem[] };

async function itemsOf(
  tx: AppTransaction,
  blockIds: string[],
): Promise<Array<BlockItem & { blockId: string }>> {
  if (blockIds.length === 0) return [];
  const rows = await tx
    .select({
      item: trainingBlockItems,
      template: {
        name: workoutTemplates.name,
        sport: workoutTemplates.sport,
        plannedMinutes: workoutTemplates.plannedMinutes,
        structure: workoutTemplates.structure,
      },
    })
    .from(trainingBlockItems)
    .leftJoin(workoutTemplates, eq(workoutTemplates.id, trainingBlockItems.templateId))
    .where(inArray(trainingBlockItems.blockId, blockIds))
    .orderBy(asc(trainingBlockItems.day), asc(trainingBlockItems.sort));
  return rows.flatMap(({ item, template }): Array<BlockItem & { blockId: string }> => {
    const base = {
      blockId: item.blockId,
      day: item.day,
      startTime: clockOf(item.startTime),
      meetingPlace: item.meetingPlace,
    };
    if (item.templateId) {
      // A template this reader cannot see is not shown as an empty item.
      if (!template?.name) return [];
      const sport = template.sport as Sport;
      const structure = readStructure(template.structure, sport);
      return [
        {
          ...base,
          templateId: item.templateId,
          title: template.name,
          sport,
          plannedMinutes: template.plannedMinutes || structureMinutes(structure),
          session: null,
        },
      ];
    }
    if (!item.sport || !item.title || !item.structure) return [];
    const sport = item.sport as Sport;
    const structure = readStructure(item.structure, sport);
    return [
      {
        ...base,
        templateId: null,
        title: item.title,
        sport,
        plannedMinutes: item.plannedMinutes || structureMinutes(structure),
        session: { description: item.description, structure },
      },
    ];
  });
}

export async function listBlocks(
  ctx: OrgContext,
  includeArchived = false,
): Promise<BlockWithItems[]> {
  return withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .select()
      .from(trainingBlocks)
      .where(includeArchived ? undefined : eq(trainingBlocks.archived, false))
      .orderBy(asc(trainingBlocks.name));
    const items = await itemsOf(
      tx,
      rows.map((r) => r.id),
    );
    return rows.map((b) => ({
      ...b,
      items: items.filter((i) => i.blockId === b.id).map(({ blockId, ...item }) => item),
    }));
  });
}

export async function getBlock(ctx: OrgContext, id: string): Promise<BlockWithItems | null> {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(trainingBlocks).where(eq(trainingBlocks.id, id));
    if (!row) return null;
    const items = await itemsOf(tx, [row.id]);
    return { ...row, items: items.map(({ blockId, ...item }) => item) };
  });
}

/** An item as a row: a template named, or the session itself with its minutes worked out. */
function rowOf(item: BlockItemInputT) {
  const at = { startTime: clockOf(item.startTime), meetingPlace: item.meetingPlace ?? "" };
  if ("templateId" in item) return { templateId: item.templateId, ...at };
  const structure = readStructure(item.session.structure, item.session.sport);
  return {
    templateId: null,
    sport: item.session.sport,
    title: item.session.title,
    description: item.session.description,
    structure,
    plannedMinutes: item.session.plannedMinutes || structureMinutes(structure),
    ...at,
  };
}

async function writeItems(
  tx: AppTransaction,
  ctx: OrgContext,
  blockId: string,
  input: BlockInputT,
) {
  await tx.delete(trainingBlockItems).where(eq(trainingBlockItems.blockId, blockId));
  const inRange = input.items.filter((i) => i.day < input.weeks * 7);
  if (inRange.length > 0)
    await tx.insert(trainingBlockItems).values(
      inRange.map((item, sort) => ({
        orgId: ctx.orgId,
        blockId,
        day: item.day,
        sort,
        ...rowOf(item),
      })),
    );
}

export async function createBlock(ctx: OrgContext, input: BlockInputT): Promise<{ id: string }> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const [row] = await tx
      .insert(trainingBlocks)
      .values({
        orgId: ctx.orgId,
        name: input.name,
        description: input.description,
        weeks: input.weeks,
        createdBy: ctx.userId,
      })
      .returning({ id: trainingBlocks.id });
    await writeItems(tx, ctx, row!.id, input);
    return row!;
  });
}

export async function updateBlock(ctx: OrgContext, id: string, input: BlockInputT): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const [row] = await tx
      .select({ id: trainingBlocks.id })
      .from(trainingBlocks)
      .where(eq(trainingBlocks.id, id));
    if (!row) throw new Refused("notFound");
    await tx
      .update(trainingBlocks)
      .set({ name: input.name, description: input.description, weeks: input.weeks })
      .where(eq(trainingBlocks.id, id));
    await writeItems(tx, ctx, id, input);
  });
}

export async function archiveBlock(ctx: OrgContext, id: string, archived: boolean): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    await tx.update(trainingBlocks).set({ archived }).where(eq(trainingBlocks.id, id));
  });
}
