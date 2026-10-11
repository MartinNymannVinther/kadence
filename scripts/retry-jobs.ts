import "dotenv/config";
import { Client } from "pg";

/**
 * The jobs that gave up after their last try (docs/adr/0085), and a way
 * to give them new ones once the cause is mended: a provider back up, a
 * key put right.
 *
 *   pnpm script scripts/retry-jobs.ts               # lists them
 *   pnpm script scripts/retry-jobs.ts <job id>      # tries that one again, now
 *   pnpm script scripts/retry-jobs.ts --all         # tries every one again, now
 *   pnpm script scripts/retry-jobs.ts --all <kind>  # ... of one kind
 *
 * In the container: `docker compose exec worker node_modules/.bin/tsx scripts/retry-jobs.ts`.
 *
 * A retried job starts over at no tries, keeps its last error until it
 * runs, and is due at once. One whose work is already waiting again (the
 * same kind, team and key) is left as it is, and said so: the waiting
 * one will do the work. Runs as the application role (APP_DATABASE_URL),
 * which is all the jobs table needs; nothing here reads a payload out.
 */

const FAILED = "done_at is null and attempts >= max_attempts";

async function list(client: Client) {
  const { rows } = await client.query(
    `select id, kind, org_id, attempts, last_error, created_at, run_at
     from jobs where ${FAILED} order by created_at`,
  );
  if (rows.length === 0) {
    console.log("retry-jobs: no job has given up");
    return;
  }
  for (const row of rows)
    console.log(
      [
        row.id,
        row.kind,
        row.org_id ?? "-",
        `${row.attempts} tries`,
        row.last_error ?? "",
        `since ${row.created_at.toISOString()}`,
      ].join("  "),
    );
  console.log(`retry-jobs: ${rows.length} job(s) gave up`);
}

async function retry(client: Client, where: string, values: unknown[]) {
  const { rows } = await client.query<{ id: string }>(
    `select id from jobs where ${FAILED} and ${where}`,
    values,
  );
  let retried = 0;
  for (const { id } of rows) {
    try {
      await client.query(
        `update jobs set attempts = 0, run_at = now(), locked_by = null, locked_until = null
         where id = $1 and ${FAILED}`,
        [id],
      );
      retried += 1;
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
      console.log(`retry-jobs: ${id} is already waiting as another job, left as it is`);
    }
  }
  console.log(`retry-jobs: ${retried} job(s) will run again`);
}

async function main() {
  const url = process.env.APP_DATABASE_URL;
  if (!url) throw new Error("APP_DATABASE_URL is not set");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const [first, second] = process.argv.slice(2);
    if (!first) await list(client);
    else if (first === "--all")
      await (second ? retry(client, "kind = $1", [second]) : retry(client, "true", []));
    else if (/^[0-9a-f-]{36}$/i.test(first)) await retry(client, "id = $1", [first]);
    else throw new Error(`not a job id: ${first}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("retry-jobs: failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
