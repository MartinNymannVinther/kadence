import { addDaysIso } from "@/core/dates";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { seasonStartYear } from "@/modules/dcu";
import { bikeTotalsIn, NO_TOTAL, totalsByKey, type BikeTotal } from "@/modules/season/bike-totals";
import { framesIn, type RiderFrames } from "@/modules/season/frames";
import { volumeFrom, type Volume } from "@/modules/season/volume";
import type { Paradigm } from "@/modules/paradigms";
import { listUnplannedIn, type CalendarActivity } from "@/modules/training/activities";
import { listEventsIn, type ListedEvent } from "@/modules/training/events";
import { listSessionsIn, type CalendarSession } from "@/modules/training/sessions";
import { gridBounds, monthBounds, monthWeeks } from "./grid";

/**
 * What the month views read (docs/adr/0093), each in one transaction with
 * a fixed number of queries however many riders and days: the sessions,
 * the rides without a session and the events over the range, the riders'
 * season frames, and the bike hours summed in the database by week or by
 * month. Who may see which rider is RLS's decision, as everywhere.
 */

export type MonthRead = {
  sessions: CalendarSession[];
  unplanned: CalendarActivity[];
  events: ListedEvent[];
};

/** A total as the four numbers, for one rider over one range. */
export function volumeOfTotal(
  frames: RiderFrames | undefined,
  paradigm: Paradigm | null,
  range: { from: string; to: string },
  total: Omit<BikeTotal, "riderId" | "key"> | undefined,
): Volume | null {
  if (!frames) return null;
  const t = total ?? NO_TOTAL;
  return volumeFrom(range, frames.frameOf, paradigm, {
    planned: t.plannedMinutes / 60,
    done: t.doneSeconds / 3600,
    ahead: t.aheadMinutes / 60,
  });
}

/**
 * One rider's month: everything on the grid's days — the edges of the
 * months either side too, so every week is whole — each week's hours
 * against the season plan, and the month's own.
 */
export async function riderMonth(
  ctx: OrgContext,
  riderId: string,
  month: string,
  today: string,
): Promise<MonthRead & { weeks: Map<string, Volume>; month: Volume | null }> {
  const grid = gridBounds(month);
  const bounds = monthBounds(month);
  const ids = [riderId];
  return withOrgContext(ctx, async (tx) => {
    const sessions = await listSessionsIn(tx, { ...grid, riderIds: ids });
    const unplanned = await listUnplannedIn(tx, { ...grid, riderIds: ids });
    const events = await listEventsIn(tx, { ...grid, riderIds: ids });
    const frames = await framesIn(tx, ids, {
      from: seasonStartYear(grid.from),
      to: seasonStartYear(grid.to),
    });
    const byWeek = totalsByKey(await bikeTotalsIn(tx, ids, grid, "week", today)).get(riderId);
    const byMonth = totalsByKey(await bikeTotalsIn(tx, ids, bounds, "month", today)).get(riderId);
    const mine = frames.riders.get(riderId);
    const weeks = new Map<string, Volume>();
    for (const { monday } of monthWeeks(month)) {
      const range = { from: monday, to: addDaysIso(monday, 6) };
      const volume = volumeOfTotal(mine, frames.paradigm, range, byWeek?.get(monday));
      if (volume) weeks.set(monday, volume);
    }
    return {
      sessions,
      unplanned,
      events,
      weeks,
      month: volumeOfTotal(mine, frames.paradigm, bounds, byMonth?.get(month)),
    };
  });
}

/** The team's month: every rider's days, and each rider's month on the bike. */
export async function teamMonth(
  ctx: OrgContext,
  riderIds: string[],
  month: string,
  today: string,
): Promise<MonthRead & { volumes: Map<string, Volume> }> {
  const bounds = monthBounds(month);
  if (riderIds.length === 0) return { sessions: [], unplanned: [], events: [], volumes: new Map() };
  return withOrgContext(ctx, async (tx) => {
    const sessions = await listSessionsIn(tx, { ...bounds, riderIds });
    const unplanned = await listUnplannedIn(tx, { ...bounds, riderIds });
    const events = await listEventsIn(tx, { ...bounds, riderIds });
    const season = seasonStartYear(bounds.from);
    const frames = await framesIn(tx, riderIds, { from: season, to: season });
    const totals = totalsByKey(await bikeTotalsIn(tx, riderIds, bounds, "month", today));
    const volumes = new Map<string, Volume>();
    for (const id of frames.riders.keys()) {
      const volume = volumeOfTotal(
        frames.riders.get(id),
        frames.paradigm,
        bounds,
        totals.get(id)?.get(month),
      );
      if (volume) volumes.set(id, volume);
    }
    return { sessions, unplanned, events, volumes };
  });
}
