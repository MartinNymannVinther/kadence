import { and, eq, inArray, sql } from "drizzle-orm";
import { activities, plannedSessions } from "@/core/db/schema";
import type { AppTransaction } from "@/core/db/tenant";
import { needsIndoor, rideName, type RideName, type RideNameInput } from "./ride-name";

/**
 * Rides' telling names (ride-name.ts, docs/adr/0098), read inside the
 * caller's transaction and so under the caller's RLS: a ride the caller
 * may not read has no name here either.
 *
 * Whether a ride was ridden indoors is in its samples, the largest
 * column on the row, so it is asked only of the rides whose name turns on
 * it — a bike ride with no name of its own and no session.
 */

export type NamedRow = Omit<RideNameInput, "indoor"> & { id: string };

/** Samples kept, and not one position among them. */
const INDOOR = sql<boolean>`(jsonb_exists(${activities.streams}, 'lat') and not jsonb_path_exists(${activities.streams}, '$.lat[*] ? (@.type() == "number")'))`;

/** The names of rows the caller has already read. */
export async function nameRides(
  tx: AppTransaction,
  rows: readonly NamedRow[],
): Promise<Map<string, RideName>> {
  const asking = rows.filter((r) => needsIndoor(r)).map((r) => r.id);
  const indoor = new Set(
    asking.length === 0
      ? []
      : (
          await tx
            .select({ id: activities.id })
            .from(activities)
            .where(and(inArray(activities.id, asking), INDOOR))
        ).map((r) => r.id),
  );
  return new Map(rows.map((r) => [r.id, rideName({ ...r, indoor: indoor.has(r.id) })]));
}

/** The names of rides by id; an id the caller may not read is left out. */
export async function rideNamesIn(
  tx: AppTransaction,
  ids: readonly string[],
): Promise<Map<string, RideName>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await tx
    .select({
      id: activities.id,
      title: activities.title,
      sport: activities.sport,
      startedAt: activities.startedAt,
      source: activities.source,
      sessionTitle: plannedSessions.title,
    })
    .from(activities)
    .leftJoin(plannedSessions, eq(plannedSessions.activityId, activities.id))
    .where(inArray(activities.id, unique));
  return nameRides(tx, rows);
}
