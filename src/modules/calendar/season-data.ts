import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { bikeTotalsIn, NO_TOTAL, totalsByKey } from "@/modules/season/bike-totals";
import { framesIn } from "@/modules/season/frames";
import { referenceHours, type Volume } from "@/modules/season/volume";
import { listEventsIn, type ListedEvent } from "@/modules/training/events";
import { monthBounds, seasonBounds, seasonMonthKeys } from "./grid";
import { volumeOfTotal } from "./month-data";
import { standingOf, type Standing } from "./standing";

/**
 * What the year views read (docs/adr/0093): a season from October, month
 * by month in the four numbers (ADR 0040), from one aggregate query for
 * every rider at once — the bike hours and the sessions summed by rider
 * and month in the database — beside the riders' season frames and the
 * season's races and camps. Six statements in one transaction, for one
 * rider or twenty.
 */

export type SeasonMonth = {
  /** "2026-10". */
  month: string;
  volume: Volume;
  sessions: number;
  sessionsDone: number;
  standing: Standing | null;
};

export type SeasonSoFar = {
  /** Hours ridden from October to today. */
  done: number;
  /** The season plan's and the paradigm's hours over the same days; null where unknown. */
  goal: number | null;
  dcu: number | null;
  /** The plan's hours for the whole season, when there is one. */
  goalSeason: number | null;
};

/** The kinds of event the year lists: what the season is built around. */
const SEASON_KINDS = new Set(["race", "camp"]);

async function readSeason(ctx: OrgContext, riderIds: string[], season: number, today: string) {
  const bounds = seasonBounds(season);
  return withOrgContext(ctx, async (tx) => {
    const frames = await framesIn(tx, riderIds, { from: season, to: season });
    const totals = totalsByKey(await bikeTotalsIn(tx, riderIds, bounds, "month", today));
    const events = (await listEventsIn(tx, { ...bounds, riderIds })).filter((e) =>
      SEASON_KINDS.has(e.kind),
    );
    const months = new Map<string, SeasonMonth[]>();
    for (const [id, rider] of frames.riders) {
      months.set(
        id,
        seasonMonthKeys(season).flatMap((month) => {
          const total = totals.get(id)?.get(month) ?? NO_TOTAL;
          const volume = volumeOfTotal(rider, frames.paradigm, monthBounds(month), total);
          return volume
            ? [
                {
                  month,
                  volume,
                  sessions: total.sessions,
                  sessionsDone: total.sessionsDone,
                  standing: standingOf(volume, month, today),
                },
              ]
            : [];
        }),
      );
    }
    return { frames, months, events };
  });
}

/** The season so far: ridden against the plan's and the paradigm's hours to today. */
function soFar(
  months: readonly SeasonMonth[],
  frameOf: Parameters<typeof referenceHours>[1],
  paradigm: Parameters<typeof referenceHours>[2],
  season: number,
  today: string,
): SeasonSoFar {
  const bounds = seasonBounds(season);
  const to = today < bounds.to ? today : bounds.to;
  // A season not begun has nothing so far to weigh.
  const reference =
    to >= bounds.from
      ? referenceHours({ from: bounds.from, to }, frameOf, paradigm)
      : { dcu: null, goal: null };
  const goal = frameOf(season).goal;
  return {
    done: months.reduce((sum, m) => sum + m.volume.done, 0),
    goal: reference.goal,
    dcu: reference.dcu,
    goalSeason: goal ? goal.reduce((sum, m) => sum + m.hours, 0) : null,
  };
}

/** One rider's season: twelve months, the season so far, and the races and camps by date. */
export async function riderSeason(
  ctx: OrgContext,
  riderId: string,
  season: number,
  today: string,
): Promise<{ months: SeasonMonth[]; soFar: SeasonSoFar | null; events: ListedEvent[] }> {
  const read = await readSeason(ctx, [riderId], season, today);
  const rider = read.frames.riders.get(riderId);
  const months = read.months.get(riderId) ?? [];
  return {
    months,
    soFar: rider ? soFar(months, rider.frameOf, read.frames.paradigm, season, today) : null,
    events: read.events,
  };
}

/** The team's season: each rider's months, and the races, the team's and the riders'. */
export async function teamSeason(
  ctx: OrgContext,
  riderIds: string[],
  season: number,
  today: string,
): Promise<{ months: Map<string, SeasonMonth[]>; races: ListedEvent[] }> {
  if (riderIds.length === 0) return { months: new Map(), races: [] };
  const read = await readSeason(ctx, riderIds, season, today);
  return { months: read.months, races: read.events.filter((e) => e.kind === "race") };
}
