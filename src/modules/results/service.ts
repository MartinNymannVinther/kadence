import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { env } from "@/core/env";
import { raceResults, riders, type RaceResultRow } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { sqlStateOf } from "@/modules/export/workspace";
import { requireCoach, whoAmIIn } from "@/modules/team/access";
import { id } from "@/modules/training/vocabulary";
import type { DcuProfile } from "./dcu-profile";
import { forgetOwnRead } from "./own";
import { exclusive, readProfile } from "./read";
import { readsRaces, readsRacesFor } from "./switch";
import { parseUciId } from "./uci-id";

/**
 * A rider's UCI ID and the results read under it (ADR 0039). The UCI ID
 * is the coach's or the rider's own to set; the results are the coach's
 * to read. Reading them from Cykling Danmark is refresh.ts and own.ts.
 */

export const UciIdInput = z.object({ riderId: id, uciId: z.string().trim().max(24) });

export type SavedUciId = {
  uciId: string | null;
  /** Whether a coach saved it: a coach's import writes places, a rider's does not. */
  byCoach: boolean;
  /** The page read to check a new UCI ID, so the import need not read it again. */
  profile: DcuProfile | null;
};

/**
 * Sets or removes a rider's UCI ID, as a coach or as the rider. Where
 * this installation reads races, a new UCI ID is checked first: the
 * portal must know it, and the member it names must be born in the
 * rider's year. Removing or changing it drops what was read under the old
 * one (drizzle/0016).
 */
export async function setUciId(
  ctx: OrgContext,
  input: z.infer<typeof UciIdInput>,
): Promise<SavedUciId> {
  const uciId = input.uciId === "" ? null : parseUciId(input.uciId);
  if (input.uciId !== "" && !uciId) throw new Refused("invalid", "uciId");
  const { rider, byCoach } = await withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me || (!me.isCoach && me.rider?.id !== input.riderId)) throw new Refused("forbidden");
    const [row] = await tx
      .select({ uciId: riders.uciId, birthYear: riders.birthYear })
      .from(riders)
      .where(eq(riders.id, input.riderId));
    if (!row) throw new Refused("notFound");
    return { rider: row, byCoach: me.isCoach };
  });

  let profile: DcuProfile | null = null;
  if (uciId && uciId !== rider.uciId && readsRacesFor(env.DCU_RESULTS, uciId)) {
    const read = await exclusive(input.riderId, () => readProfile(uciId, rider.birthYear));
    if (read !== "busy" && "profile" in read) profile = read.profile;
    if (read !== "busy" && "error" in read) {
      if (read.error === "wrong_person") throw new Refused("invalid", "uciBirthYear");
      if (read.error === "unknown") throw new Refused("invalid", "uciUnknown");
      // The portal could not be asked just now: the ID is saved, and every
      // reading of it checks the birth year again.
    }
  }

  await withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .update(riders)
      .set({ uciId })
      .where(and(eq(riders.id, input.riderId), eq(riders.orgId, ctx.orgId)))
      .returning({ id: riders.id })
      .catch((error: unknown) => {
        if (sqlStateOf(error) === "23505") throw new Refused("conflict", "uciTaken");
        throw error;
      });
    if (rows.length === 0) throw new Refused("notFound");
  });
  await forgetOwnRead(input.riderId);
  return { uciId, byCoach, profile };
}

export type RaceStatus = {
  uciId: string | null;
  /** Whether this installation reads the rider's races (DCU_RESULTS). */
  reads: boolean;
  /** Whether it reads anyone's: off altogether, or only for others. */
  installationReads: boolean;
  checkedAt: Date | null;
  error: string;
  latest: RaceResultRow[];
};

/** What the coach's card for the rider shows: the ID, how reading it went, the latest races. */
export async function raceStatus(ctx: OrgContext, riderId: string): Promise<RaceStatus> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const [rider] = await tx
      .select({ uciId: riders.uciId, at: riders.racesCheckedAt, error: riders.racesError })
      .from(riders)
      .where(eq(riders.id, riderId));
    if (!rider) throw new Refused("notFound");
    const latest = await tx
      .select()
      .from(raceResults)
      .where(eq(raceResults.riderId, riderId))
      .orderBy(desc(raceResults.racedOn), asc(raceResults.race))
      .limit(5);
    return {
      uciId: rider.uciId,
      reads: readsRacesFor(env.DCU_RESULTS, rider.uciId),
      installationReads: readsRaces(env.DCU_RESULTS),
      checkedAt: rider.at,
      error: rider.error,
      latest,
    };
  });
}

/** The results on the races in a stretch of the calendar, for a coach; nobody else is shown a place. */
export async function listRaceResults(
  ctx: OrgContext,
  range: { from: string; to: string; riderIds: string[] },
): Promise<RaceResultRow[]> {
  if (range.riderIds.length === 0) return [];
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    return tx
      .select()
      .from(raceResults)
      .where(
        and(
          inArray(raceResults.riderId, range.riderIds),
          gte(raceResults.racedOn, range.from),
          lte(raceResults.racedOn, range.to),
        ),
      )
      .orderBy(asc(raceResults.racedOn), asc(raceResults.race));
  });
}
