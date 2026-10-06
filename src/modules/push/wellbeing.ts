import { and, eq, gte, ne, sql, type SQL } from "drizzle-orm";
import { addDaysIso } from "@/core/dates";
import { checkins, riders } from "@/core/db/schema";
import type { AppTransaction, OrgContext } from "@/core/db/tenant";
import { checkinZone } from "@/modules/load/wellbeing";
import type { Me } from "@/modules/team/access";
import { copenhagenClock } from "./due";

/**
 * A rider in the red zone, as a coach's reminder sees it (docs/adr/0060).
 * Read as the coach, under the ordinary policies: the team's check-ins of
 * riders still on it, never the coach's own (a coach who also rides knows).
 * The zone is the check-in's own (`checkinZone`): pain 3, ill, or mood at
 * the bottom of the scale. What is read here is a time and nothing else;
 * the reminder never carries who, or what they answered.
 */

/** Today's check-ins on the team that a coach can see, the coach's own left out. */
function teamCheckins(ctx: OrgContext, me: Me): SQL | undefined {
  return and(
    eq(checkins.orgId, ctx.orgId),
    eq(riders.archived, false),
    me.rider ? ne(checkins.riderId, me.rider.id) : undefined,
  );
}

async function redFirstSaves(tx: AppTransaction, where: SQL | undefined): Promise<Date[]> {
  const rows = await tx
    .select({
      createdAt: checkins.createdAt,
      pain: checkins.pain,
      ill: checkins.ill,
      mood: checkins.mood,
    })
    .from(checkins)
    .innerJoin(riders, eq(riders.id, checkins.riderId))
    .where(where);
  return rows.filter((row) => checkinZone(row).zone === "red").map((row) => row.createdAt);
}

/**
 * When the newest of today's red check-ins was first saved, or null. A
 * check-in is one row per rider per day, changed in place when the rider
 * saves again, so its first save is the moment the reminder counts from.
 */
export async function newestRedCheckin(
  tx: AppTransaction,
  ctx: OrgContext,
  me: Me,
  today: string,
): Promise<Date | null> {
  if (!me.isCoach) return null;
  const saves = await redFirstSaves(tx, and(teamCheckins(ctx, me), eq(checkins.onDate, today)));
  return saves.reduce<Date | null>((newest, at) => (!newest || at > newest ? at : newest), null);
}

/**
 * Whether a red check-in the coach can see was first saved at exactly
 * `at`: the mark a wellbeing reminder leaves in `told_up_to`. To the
 * millisecond, as the job wrote it.
 */
export async function redCheckinFirstSavedAt(
  tx: AppTransaction,
  ctx: OrgContext,
  me: Me,
  at: Date,
): Promise<boolean> {
  if (!me.isCoach) return false;
  const day = copenhagenClock(at).date;
  const saves = await redFirstSaves(
    tx,
    and(
      teamCheckins(ctx, me),
      gte(checkins.onDate, addDaysIso(day, -1)),
      sql`date_trunc('milliseconds', ${checkins.createdAt}) = ${at}`,
    ),
  );
  return saves.length > 0;
}
