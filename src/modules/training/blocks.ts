import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { addDaysIso, mondayOf, todayInCopenhagen } from "@/core/dates";
import {
  activities,
  riders,
  trainingBlockItems,
  trainingBlocks,
  workoutTemplates,
  type TrainingBlockRow,
} from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { seasonStartYear, weeklyCorridor } from "@/modules/dcu";
import { blockWeeks, previewWeeks, type WeekPreview } from "@/modules/load/blocks";
import { weeklyTotals } from "@/modules/load/fitness";
import { riderClass } from "@/modules/season/class";
import { requireCoach } from "@/modules/team/access";
import { scheduleTemplate } from "./group";

/**
 * Training blocks (ADR 0025): a few weeks of the library's sessions laid
 * out day by day, kept by the coach, previewed for each rider against
 * DCU's corridor and the guardrails, and put into calendars from a Monday
 * — each session through `scheduleTemplate`, so a strength programme
 * keeps its numbering per rider and a group gets its group key.
 */

export const MAX_WEEKS = 12;
export const MAX_ITEMS = 120;

export const BlockInput = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(600).default(""),
  weeks: z.number().int().min(1).max(MAX_WEEKS),
  items: z
    .array(
      z.object({
        day: z
          .number()
          .int()
          .min(0)
          .max(MAX_WEEKS * 7 - 1),
        templateId: z.string().min(1).max(100),
      }),
    )
    .max(MAX_ITEMS),
});
export type BlockInputT = z.infer<typeof BlockInput>;

export const ApplyInput = z.object({
  blockId: z.string().min(1).max(100),
  riderIds: z.array(z.string().min(1).max(100)).min(1).max(60),
  startMonday: z.iso.date(),
});
export type ApplyInputT = z.infer<typeof ApplyInput>;

export type BlockWithItems = TrainingBlockRow & {
  items: Array<{
    day: number;
    templateId: string;
    templateName: string;
    sport: string;
    plannedMinutes: number;
  }>;
};

async function itemsOf(tx: AppTransaction, blockIds: string[]) {
  if (blockIds.length === 0) return [];
  return tx
    .select({
      blockId: trainingBlockItems.blockId,
      day: trainingBlockItems.day,
      sort: trainingBlockItems.sort,
      templateId: trainingBlockItems.templateId,
      templateName: workoutTemplates.name,
      sport: workoutTemplates.sport,
      plannedMinutes: workoutTemplates.plannedMinutes,
    })
    .from(trainingBlockItems)
    .innerJoin(workoutTemplates, eq(workoutTemplates.id, trainingBlockItems.templateId))
    .where(inArray(trainingBlockItems.blockId, blockIds))
    .orderBy(asc(trainingBlockItems.day), asc(trainingBlockItems.sort));
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
    return rows.map((b) => ({ ...b, items: items.filter((i) => i.blockId === b.id) }));
  });
}

export async function getBlock(ctx: OrgContext, id: string): Promise<BlockWithItems | null> {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(trainingBlocks).where(eq(trainingBlocks.id, id));
    if (!row) return null;
    return { ...row, items: await itemsOf(tx, [row.id]) };
  });
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
        templateId: item.templateId,
        day: item.day,
        sort,
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

export type RiderPreview = {
  riderId: string;
  name: string;
  basis: string | null;
  weeks: WeekPreview[];
};

/** The block's weeks for each rider from the Monday, with the guardrails' word on each week. */
export async function previewBlock(ctx: OrgContext, input: ApplyInputT): Promise<RiderPreview[]> {
  const block = await getBlock(ctx, input.blockId);
  if (!block) throw new Refused("notFound");
  const start = mondayOf(input.startMonday);
  const weeks = blockWeeks(
    block.weeks,
    block.items,
    block.items.map((i) => ({
      id: i.templateId,
      sport: i.sport,
      plannedMinutes: i.plannedMinutes,
    })),
  );
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const riderRows = await tx.select().from(riders).where(inArray(riders.id, input.riderIds));
    const acts = await tx
      .select({
        riderId: activities.riderId,
        onDate: activities.onDate,
        seconds: activities.movingSeconds,
        load: activities.load,
        sport: activities.sport,
      })
      .from(activities)
      .where(
        and(
          inArray(activities.riderId, input.riderIds),
          gte(activities.onDate, addDaysIso(start, -28)),
          lte(activities.onDate, addDaysIso(start, -1)),
        ),
      );
    const season = seasonStartYear(start);
    return riderRows.map((rider) => {
      const klass = riderClass(rider, season);
      const previous = weeklyTotals(
        acts
          .filter((a) => a.riderId === rider.id)
          .map((a) => ({
            date: a.onDate,
            seconds: a.seconds,
            load: a.load,
            sport: a.sport as "bike" | "strength" | "other",
          })),
        addDaysIso(start, -28),
        addDaysIso(start, -1),
      ).map((w) => w.bikeHours);
      return {
        riderId: rider.id,
        name: rider.name,
        basis: klass.basis,
        weeks: previewWeeks(
          weeks,
          start,
          (monday) => (klass.basis ? weeklyCorridor(klass.basis, monday) : null),
          previous,
        ),
      };
    });
  });
}

/** The block into the riders' calendars: every item on its day, from the Monday. */
export async function applyBlock(
  ctx: OrgContext,
  input: ApplyInputT,
): Promise<{ sessions: number }> {
  const block = await getBlock(ctx, input.blockId);
  if (!block) throw new Refused("notFound");
  await withOrgContext(ctx, (tx) => requireCoach(tx, ctx));
  const start = mondayOf(input.startMonday);
  if (start < addDaysIso(todayInCopenhagen(), -7)) throw new Refused("invalid", "past");
  let sessions = 0;
  for (const item of block.items) {
    const { ids } = await scheduleTemplate(
      ctx,
      item.templateId,
      input.riderIds,
      addDaysIso(start, item.day),
    );
    sessions += ids.length;
  }
  return { sessions };
}
