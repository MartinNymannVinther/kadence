import { sql } from "drizzle-orm";
import type { AppTransaction } from "@/core/db/tenant";
import { COUNTS_TOWARD_DCU_HOURS } from "@/modules/dcu";

/**
 * The calendar's side of the four numbers (ADR 0040), summed in the
 * database for many riders and many weeks or months at once: the month
 * and season views read a team's season in one query, not every session
 * and ride into memory (docs/adr/0093). Only hours on the bike count, as
 * DCU counts them (src/modules/dcu/rules.ts); the session counts are of
 * every sport. Under the caller's RLS like any query: a rider the caller
 * may not read has no rows.
 */

export type BikeTotal = {
  riderId: string;
  /** "2026-11" by month; the Monday, "2026-11-02", by week (Postgres' weeks are ISO's). */
  key: string;
  /** Bike sessions put in the calendar. */
  plannedMinutes: number;
  /** Bike activities ridden, planned or not. */
  doneSeconds: number;
  /** Bike sessions not yet ridden, from today on. */
  aheadMinutes: number;
  /** Sessions of every sport, and of those the ones with a ride on them. */
  sessions: number;
  sessionsDone: number;
};

const BIKE = Object.entries(COUNTS_TOWARD_DCU_HOURS)
  .filter(([, counts]) => counts)
  .map(([sport]) => sport);

export async function bikeTotalsIn(
  tx: AppTransaction,
  riderIds: string[],
  range: { from: string; to: string },
  by: "week" | "month",
  today: string,
): Promise<BikeTotal[]> {
  if (riderIds.length === 0) return [];
  const ids = sql.join(
    riderIds.map((id) => sql`${id}`),
    sql`, `,
  );
  const bike = sql.join(
    BIKE.map((sport) => sql`${sport}`),
    sql`, `,
  );
  const key = (column: string) =>
    by === "week"
      ? sql.raw(`to_char(date_trunc('week', ${column}::timestamp), 'YYYY-MM-DD')`)
      : sql.raw(`to_char(${column}, 'YYYY-MM')`);
  const result = await tx.execute(sql`
    select rider_id, key,
           sum(planned_minutes)::float8 as planned_minutes,
           sum(done_seconds)::float8 as done_seconds,
           sum(ahead_minutes)::float8 as ahead_minutes,
           sum(sessions)::int as sessions,
           sum(sessions_done)::int as sessions_done
      from (
        select s.rider_id, ${key("s.on_date")} as key,
               case when s.sport in (${bike}) then s.planned_minutes else 0 end as planned_minutes,
               0 as done_seconds,
               case when s.sport in (${bike}) and s.activity_id is null and s.on_date >= ${today}::date
                    then s.planned_minutes else 0 end as ahead_minutes,
               1 as sessions,
               case when s.activity_id is null then 0 else 1 end as sessions_done
          from planned_sessions s
         where s.rider_id in (${ids}) and s.on_date between ${range.from}::date and ${range.to}::date
        union all
        select a.rider_id, ${key("a.on_date")},
               0,
               case when a.sport in (${bike}) then greatest(a.moving_seconds, 0) else 0 end,
               0, 0, 0
          from activities a
         where a.rider_id in (${ids}) and a.on_date between ${range.from}::date and ${range.to}::date
      ) t
     group by rider_id, key
     order by rider_id, key`);
  return (result.rows as Array<Record<string, unknown>>).map((row) => ({
    riderId: String(row.rider_id),
    key: String(row.key),
    plannedMinutes: Number(row.planned_minutes),
    doneSeconds: Number(row.done_seconds),
    aheadMinutes: Number(row.ahead_minutes),
    sessions: Number(row.sessions),
    sessionsDone: Number(row.sessions_done),
  }));
}

/** The totals by rider and key, for reading one cell at a time. */
export function totalsByKey(rows: readonly BikeTotal[]): Map<string, Map<string, BikeTotal>> {
  const out = new Map<string, Map<string, BikeTotal>>();
  for (const row of rows) {
    const mine = out.get(row.riderId) ?? new Map<string, BikeTotal>();
    mine.set(row.key, row);
    out.set(row.riderId, mine);
  }
  return out;
}

export const NO_TOTAL: Omit<BikeTotal, "riderId" | "key"> = {
  plannedMinutes: 0,
  doneSeconds: 0,
  aheadMinutes: 0,
  sessions: 0,
  sessionsDone: 0,
};
