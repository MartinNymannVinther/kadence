import { Client } from "pg";
import { beforeAll } from "vitest";

/**
 * Every test file starts with no counts (docs/adr/0083). The rate limits,
 * the places held while a ride is read and the moments to remember live
 * in the database now, not in a module that each file imported afresh, so
 * a count one file left behind would otherwise be the next file's.
 */
beforeAll(async () => {
  const client = new Client({ connectionString: process.env.APP_DATABASE_URL });
  await client.connect();
  try {
    await client.query("delete from app_rate_limits");
  } finally {
    await client.end();
  }
});
