import { appPool } from "@/core/db/client";
import { fileStorage } from "@/core/files/storage";
import { payload } from "@/core/jobs/payload";
import { handle, jobKind } from "@/core/jobs/registry";
import { SCHEDULE } from "@/core/jobs/schedule";
import { errorName, log } from "@/core/log";

/**
 * Objects whose row is gone (docs/adr/0087), every fifteen minutes. The
 * trigger on activity_files (drizzle/0051) writes a key to
 * `file_tombstones` when a file's row is deleted — by the rider, by
 * erase_rider(), by a workspace's deletion — or its key changes, and
 * before an upload (src/modules/storage/keep.ts). This job asks
 * `file_tombstones_due()` for the keys older than its grace that no row
 * holds, locked for the transaction so two workers never share one,
 * deletes each object and then the tombstone. An object that is already
 * gone is a success; a store that does not answer leaves the tombstone
 * for the next run, which is what makes a second run harmless.
 *
 * In `db` mode there is nothing to delete and a tombstone (there should be
 * none) is left alone, since the key may be an object an installation
 * will switch back to.
 */

/** At most this many objects a run, so a club's deletion is spread over a few runs rather than one long one. */
export const TOMBSTONE_BATCH = 200;
/** A reservation is this old before it can be taken for an abandoned upload. */
export const TOMBSTONE_GRACE = "5 minutes";

export const fileTombstonesJob = jobKind("files.tombstones", payload({}), {
  every: SCHEDULE.fileTombstones,
  timeoutMs: 4 * 60_000,
});

export type TombstoneRun = { deleted: number; kept: number };

/** One batch: how many objects went, how many tombstones stay for the next run. */
export async function clearTombstones(limit = TOMBSTONE_BATCH): Promise<TombstoneRun> {
  const storage = fileStorage();
  if (!storage.objects) return { deleted: 0, kept: 0 };
  const client = await appPool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<{ file_tombstones_due: string }>(
      `select file_tombstones_due from file_tombstones_due($1, $2::interval)`,
      [limit, TOMBSTONE_GRACE],
    );
    const gone: string[] = [];
    let kept = 0;
    for (const { file_tombstones_due: key } of rows) {
      try {
        await storage.objects.deleteObject(key);
        gone.push(key);
      } catch (error) {
        kept += 1;
        await log.warn("files: an object could not be deleted yet", { error: errorName(error) });
      }
    }
    if (gone.length > 0)
      await client.query(`delete from file_tombstones where storage_key = any($1::text[])`, [gone]);
    await client.query("commit");
    return { deleted: gone.length, kept };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export const fileTombstonesHandler = handle(fileTombstonesJob, async () => clearTombstones());
