import { Client } from "pg";
import { beforeAll } from "vitest";

/**
 * Every test file starts with no counts and no jobs (docs/adr/0083,
 * 0085). The rate limits, the places held while a ride is read, the
 * moments to remember and the background jobs live in the database, not
 * in a module that each file imported afresh, so a count or a job one
 * file left behind would otherwise be the next file's.
 */
beforeAll(async () => {
  const client = new Client({ connectionString: process.env.APP_DATABASE_URL });
  await client.connect();
  try {
    await client.query("delete from app_rate_limits");
    await client.query("delete from jobs");
  } finally {
    await client.end();
  }
});
