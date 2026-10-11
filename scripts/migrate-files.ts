import "dotenv/config";
import { Client } from "pg";

/**
 * Moves the ride files already in the database out to the object store
 * (docs/adr/0087, docs/deploy.md "File storage"), after FILES_STORAGE was
 * switched to s3. It puts one job, files.migrate, in the queue; the
 * worker moves fifty files at a time, verifies each object's sha256 and
 * only then empties the row of its bytes, and asks itself to run again
 * until no row holds a file. Run it again at any time: a row already
 * moved is left alone, and a job already waiting is not put in twice.
 *
 *   pnpm script scripts/migrate-files.ts            # puts the job in, says how much waits
 *   pnpm script scripts/migrate-files.ts --status   # only says how much waits
 *
 * In the container: `docker compose exec worker node_modules/.bin/tsx scripts/migrate-files.ts`.
 *
 * Runs as the application role (APP_DATABASE_URL), which is all the jobs
 * table needs; the counts come from the same definer the job uses and
 * name no file. Refuses to put the job in when this environment says
 * files are kept in the database: the job would only give up.
 */

async function main() {
  const url = process.env.APP_DATABASE_URL;
  if (!url) throw new Error("APP_DATABASE_URL is not set");
  const statusOnly = process.argv.includes("--status");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const counts = await client.query<{ in_rows: string; as_objects: string }>(
      `select in_rows, as_objects from activity_files_places()`,
    );
    const inRows = Number(counts.rows[0]?.in_rows ?? 0);
    const tombstones = await client.query<{ n: string }>(
      `select count(*) as n from file_tombstones`,
    );
    console.log(
      `migrate-files: ${inRows} file(s) still in the database, ${counts.rows[0]?.as_objects ?? 0} as objects, ${tombstones.rows[0]?.n ?? 0} tombstone(s) waiting`,
    );
    if (statusOnly) return;
    if (process.env.FILES_STORAGE !== "s3") {
      console.log("migrate-files: FILES_STORAGE is not s3 here, so nothing is put in the queue");
      return;
    }
    if (inRows === 0) {
      console.log("migrate-files: nothing to move");
      return;
    }
    const { rows } = await client.query<{ id: string }>(
      `insert into jobs (kind, payload, org_id, run_at, max_attempts)
       values ('files.migrate', '{"key":"all"}', null, now(), 3)
       on conflict (kind, (coalesce(org_id, '')), ((payload ->> 'key')))
         where done_at is null and attempts < max_attempts
         do nothing
       returning id`,
    );
    console.log(
      rows[0]
        ? `migrate-files: job ${rows[0].id} is in the queue; the worker moves the files from here`
        : "migrate-files: a job is already waiting or running",
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("migrate-files: failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
