import { and, gte, inArray, lte } from "drizzle-orm";
import { riders, seasonPlans } from "@/core/db/schema";
import type { AppTransaction } from "@/core/db/tenant";
import { isPlanBasis, type Paradigm } from "@/modules/paradigms";
import { teamParadigm } from "@/modules/team/settings";
import { riderClass } from "./class";
import { SeasonMonthsInput } from "./plans";
import type { SeasonFrame } from "./volume";

/**
 * What the four numbers' reference side needs to know about each rider
 * (ADR 0040): the basis DCU's hours are read for and the coach's months,
 * season by season — and the team's paradigm (ADR 0049). Three queries
 * however many riders: the riders, their plans for the seasons, the
 * team's setting. RLS decides whose rows come back.
 */

export type RiderFrames = { name: string; frameOf: (season: number) => SeasonFrame };

export async function framesIn(
  tx: AppTransaction,
  riderIds: string[],
  seasons: { from: number; to: number },
): Promise<{ riders: Map<string, RiderFrames>; paradigm: Paradigm | null }> {
  // One after the other: a transaction is one connection, and pg queues
  // rather than runs queries side by side on it.
  const riderRows = await tx.select().from(riders).where(inArray(riders.id, riderIds));
  const plans = await tx
    .select()
    .from(seasonPlans)
    .where(
      and(
        inArray(seasonPlans.riderId, riderIds),
        gte(seasonPlans.seasonStartYear, seasons.from),
        lte(seasonPlans.seasonStartYear, seasons.to),
      ),
    );
  const paradigm = riderRows[0] ? await teamParadigm(tx, riderRows[0].orgId) : null;
  const out = new Map<string, RiderFrames>();
  for (const rider of riderRows) {
    const frames = new Map<number, SeasonFrame>();
    const frameOf = (season: number): SeasonFrame => {
      const known = frames.get(season);
      if (known) return known;
      // The plan's basis wins: a coach who plans a rider from another year's hours
      // has chosen the DCU number the plan is measured against.
      const plan = plans.find((p) => p.riderId === rider.id && p.seasonStartYear === season);
      const months = plan ? SeasonMonthsInput.safeParse(plan.months) : null;
      const frame: SeasonFrame = {
        basis: plan && isPlanBasis(plan.basis) ? plan.basis : riderClass(rider, season).basis,
        goal: months?.success ? months.data : null,
      };
      frames.set(season, frame);
      return frame;
    };
    out.set(rider.id, { name: rider.name, frameOf });
  }
  return { riders: out, paradigm };
}
