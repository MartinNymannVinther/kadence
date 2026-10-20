import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { enqueue } from "@/core/jobs/queue";
import { SPORT } from "@/modules/fit";
import { importFit } from "@/modules/devices/import";
import { retimeJob } from "@/modules/devices/retime-job";
import { HANDLERS } from "@/modules/jobs/handlers";
import { adminPool, appClient, asApp, authClient, expectSqlError } from "../helpers/db";
import { clearJobs, drainJobs } from "../helpers/jobs";
import { insertSql, seedPerson } from "../helpers/rows";
import { encodeRide, smartRecordedHour } from "../fit/fixtures";

/**
 * The one-off correction of stored rides (docs/adr/0096): put in the queue
 * once by its migration, it finds every workspace with stored files and a
 * coach of each through workspaces_with_files() — two ids, nothing else,
 * and never from inside a workspace — and reads their rides again as that
 * coach.
 */

const ORG = "org_jobs_retime";
const NO_FILES = "org_jobs_retime_none";
const OWNER = { orgId: ORG, userId: "user_jobs_retime_owner" };
const ADMIN = { orgId: ORG, userId: "user_jobs_retime_admin" };
const RIDER = { orgId: ORG, userId: "user_jobs_retime_rider" };
const MIGRATION = "0056_retime_stored_rides";

let admin: Pool;
let rideId: string;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, ADMIN.userId, "admin");
  await seedPerson(admin, ORG, OWNER.userId, "owner");
  await seedPerson(admin, ORG, RIDER.userId, "member");
  await seedPerson(admin, NO_FILES, "user_jobs_retime_none", "owner");
  const q = insertSql("riders", {
    org_id: ORG,
    id: "jr_rider",
    user_id: RIDER.userId,
    name: "jr_rider",
    birth_year: 2008,
    ftp_watts: 250,
  });
  await admin.query(q.text, q.values);
  const ride = encodeRide(smartRecordedHour(), { sport: SPORT.cycling });
  rideId = (await importFit(RIDER, "jr_rider", "smart.fit", ride)).activityId;
});

afterAll(async () => {
  await admin.end();
});

describe("workspaces_with_files()", () => {
  it("names a workspace with files and its owner, and nothing for one without", async () => {
    const app = await appClient();
    try {
      const { rows } = await app.query(
        `select org_id, user_id from workspaces_with_files() where org_id like 'org_jobs_retime%'`,
      );
      expect(rows).toEqual([{ org_id: ORG, user_id: OWNER.userId }]);
    } finally {
      await app.end();
    }
  });

  it("is refused from inside a workspace, and to the auth role", async () => {
    const app = await appClient();
    try {
      const call = asApp(app, OWNER, (c) => c.query("select * from workspaces_with_files()"));
      expect(await expectSqlError(call)).toBe("42501");
    } finally {
      await app.end();
    }
    const auth = await authClient();
    try {
      await expect(auth.query("select * from workspaces_with_files()")).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await auth.end();
    }
  });
});

describe("activities.retime", () => {
  it("is registered, with an empty payload and no team", () => {
    const handler = HANDLERS.find((h) => h.kind.kind === "activities.retime");
    expect(handler?.kind).toBe(retimeJob);
    expect(retimeJob.team).toBe(false);
    expect(retimeJob.payload.safeParse({}).success).toBe(true);
    expect(retimeJob.payload.safeParse({ orgId: ORG }).success).toBe(false);
  });

  it("corrects a stored ride in every workspace with files, counting only", async () => {
    await admin.query(`update activities set moving_seconds = 2000, load = 30 where id = $1`, [
      rideId,
    ]);
    await clearJobs();
    await enqueue(retimeJob, {});
    const [run] = await drainJobs(["activities.retime"]);
    expect(run).toMatchObject({ outcome: "done" });
    expect(Object.keys(run!.result as object).sort()).toEqual(
      ["changed", "failed", "read", "skipped", "workspaces"].sort(),
    );
    expect((run!.result as { changed: number }).changed).toBeGreaterThanOrEqual(1);
    const row = await admin.query(
      "select moving_seconds, load, load_method from activities where id = $1",
      [rideId],
    );
    expect(row.rows[0].moving_seconds).toBeGreaterThan(3500);
    expect(row.rows[0]).toMatchObject({ load_method: "power" });
    expect(row.rows[0].load).toBeGreaterThan(55);
  });
});

describe("the migration", () => {
  const sql = readFileSync(join(process.cwd(), "drizzle", `${MIGRATION}.sql`), "utf8");
  const run = async () => {
    for (const statement of sql.split("--> statement-breakpoint")) await admin.query(statement);
  };
  const queued = async () =>
    (await admin.query(`select payload, org_id from jobs where kind = 'activities.retime'`)).rows;

  it("is in the journal", () => {
    const journal = JSON.parse(
      readFileSync(join(process.cwd(), "drizzle", "meta", "_journal.json"), "utf8"),
    ) as { entries: { tag: string; when: number }[] };
    const at = journal.entries.findIndex((e) => e.tag === MIGRATION);
    expect(at).toBeGreaterThan(0);
    expect(journal.entries[at]!.when).toBeGreaterThan(journal.entries[at - 1]!.when);
  });

  it("queues the correction exactly once, however often it runs", async () => {
    await clearJobs();
    await run();
    expect(await queued()).toEqual([{ payload: { key: "once" }, org_id: null }]);
    await run();
    expect(await queued()).toHaveLength(1);
    // Done, and the migration run again: still the one.
    await admin.query(`update jobs set done_at = now() where kind = 'activities.retime'`);
    await run();
    expect(await queued()).toHaveLength(1);
    await clearJobs();
  });
});
