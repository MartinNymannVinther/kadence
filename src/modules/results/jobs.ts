import { Refused } from "@/core/action";
import { appPool } from "@/core/db/client";
import { env } from "@/core/env";
import { payload } from "@/core/jobs/payload";
import { GiveUp, handle, jobKind, later } from "@/core/jobs/registry";
import { SCHEDULE } from "@/core/jobs/schedule";
import { refreshOwnRaces } from "./own";
import { dcuReadRider, GAP_MS } from "./queue";
import { refreshRaces, refreshStaleRaces, type RefreshOutcome } from "./refresh";

/**
 * The worker's part of reading races from Cykling Danmark (ADR 0039,
 * docs/adr/0085).
 *
 * A reading runs as the person who asked for it, exactly as the coach's
 * or the rider's own visit ran it, under the ordinary policies: a coach's
 * reading through refreshRaces, a rider's through refreshOwnRaces. It is
 * idempotent because both read only riders whose races are more than
 * three hours old and write what they read with upserts keyed by the
 * portal's own reference: a reading run twice finds the rider fresh. A
 * reading that finds the installation's six pages this minute taken, or
 * the rider being read elsewhere, is put back for ten seconds. A person
 * who may no longer read (no longer a coach, the rider gone, the UCI ID
 * removed) is an answer, not a failure: the job is done.
 *
 * Every hour, `dcu.races` puts the stale riders of every team that has
 * riders with a UCI ID in the line, read as a coach of the team
 * (dcu_teams_due(), drizzle/0047), so the races are read whether anybody
 * opens Kadence or not.
 */

export const dcuReadHandler = handle(
  dcuReadRider,
  async (
    job,
    { orgId },
  ): Promise<RefreshOutcome | { state: "refused" } | ReturnType<typeof later>> => {
    if (!orgId || (job.as === "coach" && !job.riderId)) throw new GiveUp("invalid_payload");
    const ctx = { orgId, userId: job.userId };
    let outcome: RefreshOutcome;
    try {
      outcome =
        job.as === "coach" ? await refreshRaces(ctx, job.riderId!) : await refreshOwnRaces(ctx);
    } catch (error) {
      if (error instanceof Refused) return { state: "refused" };
      throw error;
    }
    return outcome.state === "busy" ? later(GAP_MS) : outcome;
  },
);

export const dcuRacesJob = jobKind("dcu.races", payload({}), {
  every: SCHEDULE.dcuRaces,
  timeoutMs: 5 * 60_000,
});

export const dcuRacesHandler = handle(dcuRacesJob, async () => {
  if (env.DCU_RESULTS === "off") return { teams: 0 };
  const { rows } = await appPool.query<{ org_id: string; user_id: string }>(
    "select org_id, user_id from dcu_teams_due()",
  );
  for (const row of rows) await refreshStaleRaces({ orgId: row.org_id, userId: row.user_id });
  return { teams: rows.length };
});
