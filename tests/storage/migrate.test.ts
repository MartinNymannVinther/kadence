import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { configureFileStorage, objectKey } from "@/core/files/storage";
import { enqueue } from "@/core/jobs/queue";
import { filesMigrateJob, migrateBatch, MIGRATE_KEY } from "@/modules/storage/migrate";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { clearJobs, drainJobs } from "../helpers/jobs";
import type { FakeS3 } from "../helpers/fake-s3";
import { insertSql } from "../helpers/rows";
import { fileRow, seedStorageTeam, tombstones, useFakeS3, type StorageTeam } from "./fixture";

/**
 * Moving the files already in the database out to the store
 * (docs/adr/0087, scripts/migrate-files.ts): each row's bytes become an
 * object under its key, verified by hash before the row is emptied; a row
 * whose bytes do not match its hash stays; a second run finds nothing to
 * do; and with files in the database the job gives up and says so.
 */

let admin: Pool;
let fake: FakeS3;
let restore: () => Promise<void>;
let team: StorageTeam;

const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

async function seedRowWithBytes(id: string, bytes: Buffer, sha = sha256(bytes), day = "2026-11-0") {
  await admin.query(
    insertSql("activities", {
      id,
      org_id: team.orgId,
      rider_id: team.riderId,
      started_at: `${day}${id.slice(-1)}T08:00:00Z`,
      on_date: `${day}${id.slice(-1)}`,
      sport: "bike",
      moving_seconds: 3600,
      source: "fit",
    }),
  );
  await admin.query(
    insertSql("activity_files", {
      org_id: team.orgId,
      rider_id: team.riderId,
      activity_id: id,
      file_name: "ride.fit",
      sha256: sha,
      bytes,
    }),
  );
}

beforeAll(async () => {
  admin = adminPool();
  ({ fake, restore } = await useFakeS3());
  team = await seedStorageTeam(admin, "mig");
  // Every other test's rows in the database would be moved too; this
  // file wants the ones it seeded, so it starts with the table empty.
  await admin.query(`delete from activity_files where bytes is not null`);
  await admin.query(`delete from file_tombstones`);
  await clearJobs();
});

afterAll(async () => {
  await restore();
  await admin.end();
});

describe("the migration job", () => {
  it("moves rows with bytes to objects, verifying the hash, and leaves a row whose bytes lie", async () => {
    const one = Buffer.from("ride one, the bytes of a fit file");
    const two = Buffer.alloc(70_000, 7);
    await seedRowWithBytes("mig_act_1", one);
    await seedRowWithBytes("mig_act_2", two);
    await seedRowWithBytes("mig_act_3", Buffer.from("not what the hash says"), "ab".repeat(32));

    const run = await migrateBatch(10);
    expect(run).toEqual({ moved: 2, skipped: 1, left: false });

    for (const [id, bytes] of [
      ["mig_act_1", one],
      ["mig_act_2", two],
    ] as const) {
      const row = (await fileRow(admin, id))!;
      const key = objectKey(team.orgId, team.riderId, sha256(bytes));
      expect(row).toMatchObject({ storage_key: key, in_row: null, size_bytes: bytes.length });
      expect(fake.objects.get(key)?.bytes.equals(bytes)).toBe(true);
    }
    const lying = (await fileRow(admin, "mig_act_3"))!;
    expect(lying).toMatchObject({ storage_key: null, in_row: 22 });
    expect(fake.objects.has(objectKey(team.orgId, team.riderId, "ab".repeat(32)))).toBe(false);
    expect(await tombstones(admin)).toEqual([]);
  });

  it("gives up rather than loop when a batch moves nothing, and is done when nothing is left", async () => {
    await enqueue(filesMigrateJob, {}, { dedupeKey: MIGRATE_KEY });
    const [run] = await drainJobs(["files.migrate"]);
    expect(run).toMatchObject({ outcome: "failed", error: "files_not_moved" });

    await admin.query(`delete from activities where id = 'mig_act_3'`);
    await clearJobs();
    await enqueue(filesMigrateJob, {}, { dedupeKey: MIGRATE_KEY });
    const [again] = await drainJobs(["files.migrate"]);
    expect(again).toMatchObject({ outcome: "done", result: { moved: 0, skipped: 0, left: false } });
  });

  it("continues in batches until the table is empty of bytes", async () => {
    for (let i = 4; i <= 7; i++) await seedRowWithBytes(`mig_act_${i}`, Buffer.alloc(100 + i, i));
    expect(await migrateBatch(2)).toEqual({ moved: 2, skipped: 0, left: true });
    expect(await migrateBatch(2)).toEqual({ moved: 2, skipped: 0, left: true });
    expect(await migrateBatch(2)).toEqual({ moved: 0, skipped: 0, left: false });
  });

  it("gives up with its reason when files are kept in the database", async () => {
    configureFileStorage(null);
    try {
      await clearJobs();
      await enqueue(filesMigrateJob, {}, { dedupeKey: MIGRATE_KEY });
      const [run] = await drainJobs(["files.migrate"]);
      expect(run).toMatchObject({ outcome: "failed", error: "files_storage_db" });
    } finally {
      await restore();
      ({ fake, restore } = await useFakeS3());
    }
  });

  it("hands the rows to nobody inside a workspace", async () => {
    const app = await appClient();
    try {
      for (const call of [
        `select * from activity_files_in_rows(1)`,
        `select activity_file_moved_out('x', 'y')`,
        `select * from activity_files_places()`,
      ]) {
        expect(await expectSqlError(asApp(app, team.coach, (c) => c.query(call))), call).toBe(
          "42501",
        );
      }
      // Outside one, the counts and nothing else.
      const places = await app.query(`select * from activity_files_places()`);
      expect(Object.keys(places.rows[0])).toEqual(["in_rows", "as_objects"]);
    } finally {
      await app.end();
    }
  });
});
