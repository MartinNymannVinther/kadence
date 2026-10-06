import { and, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { addDaysIso, mondayOf, todayInCopenhagen } from "@/core/dates";
import { activities, riders } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { seasonStartYear } from "@/modules/dcu";
import { blockWeeks, previewWeeks, type WeekPreview } from "@/modules/load/blocks";
import { weeklyTotals } from "@/modules/load/fitness";
import { riderClass } from "@/modules/season/class";
import { requireCoach } from "@/modules/team/access";
import { teamParadigm } from "@/modules/team/settings";
import { getBlock } from "./blocks";
import { createGroupSessions, scheduleTemplate } from "./group";

/**
 * A block (ADR 0025) before and into the calendars: each rider's weeks
 * from a Monday against DCU's corridor and the guardrails, then every
 * item on its day. A library session goes in through `scheduleTemplate`,
 * so a strength programme keeps its numbering per rider; a session kept in
 * the block (ADR 0058) as a group plan of its own. Each carries its time
 * and place (ADR 0057). A coach's.
 */

export const ApplyInput = z.object({
  blockId: z.string().min(1).max(100),
  riderIds: z.array(z.string().min(1).max(100)).min(1).max(60),
  startMonday: z.iso.date(),
});
export type ApplyInputT = z.infer<typeof ApplyInput>;

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
  // Each item stands for itself, from the library or not: its sport and minutes are what count.
  const weeks = blockWeeks(
    block.weeks,
    block.items.map((item, n) => ({ day: item.day, templateId: String(n) })),
    block.items.map((item, n) => ({
      id: String(n),
      sport: item.sport,
      plannedMinutes: item.plannedMinutes,
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
    const paradigm = await teamParadigm(tx, ctx.orgId);
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
          (monday) =>
            klass.basis && paradigm ? paradigm.weeklyCorridor(klass.basis, monday) : null,
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
    const onDate = addDaysIso(start, item.day);
    const at = { startTime: item.startTime, meetingPlace: item.meetingPlace };
    const { ids } = item.templateId
      ? await scheduleTemplate(ctx, item.templateId, input.riderIds, onDate, undefined, at)
      : await createGroupSessions(ctx, input.riderIds, {
          onDate,
          sport: item.sport,
          title: item.title,
          description: item.session?.description ?? "",
          structure: item.session!.structure,
          plannedMinutes: item.plannedMinutes,
          plannedKm: null,
          templateId: null,
          ...at,
        });
    sessions += ids.length;
  }
  return { sessions };
}
