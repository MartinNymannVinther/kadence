import { Refused } from "@/core/action";
import { appPool } from "@/core/db/client";
import { payload } from "@/core/jobs/payload";
import { handle, jobKind } from "@/core/jobs/registry";
import { log } from "@/core/log";
import { retimeActivities, type RetimeCount } from "./retime";

/**
 * The one-off correction of the rides stored before smart recording was
 * read right (docs/adr/0096). Put in the queue once by its migration
 * (drizzle/0056), so the first deploy runs it with nobody running a
 * script: the worker container where there is one, the app's own worker
 * where there is not.
 *
 * Every workspace with stored files is read as one of its coaches
 * (workspaces_with_files(), drizzle/0056: two ids, nothing else), under
 * the ordinary policies. The log gets counts only. A coach who is no
 * longer one by the time the run reaches the workspace is skipped and
 * counted; the next run, if there is one, finds another. Running it again
 * is safe: a corrected ride is not changed twice.
 */

export const retimeJob = jobKind("activities.retime", payload({}), {
  // Every stored file on the installation read once.
  timeoutMs: 30 * 60_000,
  maxAttempts: 3,
});

export type RetimeRun = RetimeCount & { workspaces: number; skipped: number };

export const retimeHandler = handle(retimeJob, async (_payload, { signal }): Promise<RetimeRun> => {
  const { rows } = await appPool.query<{ org_id: string; user_id: string }>(
    "select org_id, user_id from workspaces_with_files()",
  );
  const run: RetimeRun = { workspaces: 0, skipped: 0, read: 0, changed: 0, failed: 0 };
  for (const row of rows) {
    if (signal.aborted) break;
    try {
      const count = await retimeActivities({ orgId: row.org_id, userId: row.user_id }, signal);
      run.workspaces++;
      run.read += count.read;
      run.changed += count.changed;
      run.failed += count.failed;
    } catch (error) {
      if (!(error instanceof Refused)) throw error;
      run.skipped++;
    }
  }
  await log.info("activities: stored rides retimed", run);
  return run;
});
