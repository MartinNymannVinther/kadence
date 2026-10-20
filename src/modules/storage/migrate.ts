import { createHash } from "node:crypto";
import { appPool } from "@/core/db/client";
import { FILE_CONTENT_TYPE, fileStorage, objectKey } from "@/core/files/storage";
import { payload } from "@/core/jobs/payload";
import { GiveUp, handle, jobKind, later } from "@/core/jobs/registry";
import { errorName, log } from "@/core/log";
import { reserveKey } from "./keep";

/**
 * Moving the files already in the database out to the object store
 * (docs/adr/0087), after an installation switched `FILES_STORAGE` to
 * `s3`. Put in the queue by hand (scripts/migrate-files.ts); runs in
 * batches of fifty, each row: the object is uploaded under its key,
 * fetched back and its sha256 compared with the row's, and only then is
 * the row pointed at the object and emptied of its bytes
 * (`activity_file_moved_out`, drizzle/0051), in one statement. A row
 * already moved is not in `activity_files_in_rows()` and a run that dies
 * halfway leaves rows with bytes and objects a second run overwrites, so
 * the job can be run again at any time. The key is written to
 * `file_tombstones` before the upload, as every upload is, and taken out
 * again when the row is moved, so a crash between the two leaves nothing
 * behind. When a batch leaves rows behind the job asks to run again in a
 * second; when none is left it is done.
 *
 * With `FILES_STORAGE=db` there is nowhere to move to: the job gives up
 * with the word `files_storage_db`, which the Installation page and
 * scripts/retry-jobs.ts show, rather than waiting for a setting that may
 * never come. A row whose bytes do not match their own hash, or whose
 * object reads back wrong, stays in the database and is named in the log;
 * a batch that moved nothing for that reason gives up as `files_not_moved`.
 */

export const MIGRATE_BATCH = 50;
export const MIGRATE_KEY = "all";

export const filesMigrateJob = jobKind("files.migrate", payload({}), {
  // Fifty files of up to 25 MB, each uploaded and fetched back.
  timeoutMs: 10 * 60_000,
  maxAttempts: 3,
});

export type MigrateRun = {
  moved: number;
  /** Rows left in the database because their bytes or their object did not match the hash. */
  skipped: number;
  /** Whether the batch was full, so more rows may wait. */
  left: boolean;
};

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/** One batch; how many rows moved and whether any are left. */
export async function migrateBatch(limit = MIGRATE_BATCH): Promise<MigrateRun> {
  const storage = fileStorage();
  if (!storage.objects) throw new GiveUp("files_storage_db");
  const objects = storage.objects;
  const { rows } = await appPool.query<{
    id: string;
    org_id: string;
    rider_id: string;
    sha256: string;
    bytes: Buffer;
  }>(`select id, org_id, rider_id, sha256, bytes from activity_files_in_rows($1)`, [limit]);
  let moved = 0;
  let skipped = 0;
  for (const row of rows) {
    const key = objectKey(row.org_id, row.rider_id, row.sha256);
    const bytes = new Uint8Array(row.bytes);
    if (sha256(bytes) !== row.sha256) {
      // A row whose bytes do not match their own hash is not moved: left
      // in the database for a person to look at.
      await log.error("files: a file does not match its hash, left in the database", {
        file: row.id,
      });
      skipped += 1;
      continue;
    }
    await reserveKey(key);
    await objects.putObject(key, bytes, FILE_CONTENT_TYPE);
    const back = await objects.getObject(key);
    if (!back || sha256(back) !== row.sha256) {
      await log.error("files: the object read back does not match, left in the database", {
        file: row.id,
      });
      skipped += 1;
      continue;
    }
    const client = await appPool.connect();
    try {
      await client.query("begin");
      const done = await client.query<{ activity_file_moved_out: boolean }>(
        `select activity_file_moved_out($1, $2)`,
        [row.id, key],
      );
      if (done.rows[0]?.activity_file_moved_out) {
        await client.query(`delete from file_tombstones where storage_key = $1`, [key]);
        moved += 1;
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      await log.error("files: a row could not be pointed at its object", {
        file: row.id,
        error: errorName(error),
      });
    } finally {
      client.release();
    }
  }
  return { moved, skipped, left: rows.length >= limit };
}

export const filesMigrateHandler = handle(filesMigrateJob, async () => {
  const run = await migrateBatch();
  await log.info("files: migrated a batch to the object store", run);
  // A batch that moved nothing would be the same batch again: the rows
  // it skipped are named in the log and wait for a person.
  if (run.moved === 0 && run.skipped > 0) throw new GiveUp("files_not_moved");
  return run.left ? later(1_000) : run;
});
