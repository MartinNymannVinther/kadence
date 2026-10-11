import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { objectKey } from "@/core/files/storage";
import { enqueue } from "@/core/jobs/queue";
import { RECURRING_KEY } from "@/core/jobs/schedule";
import { deleteActivity, importFit } from "@/modules/devices/import";
import { reserveKey } from "@/modules/storage/keep";
import { clearTombstones, fileTombstonesJob } from "@/modules/storage/tombstones";
import { adminPool, appClient, asAppCommit } from "../helpers/db";
import { clearJobs, drainJobs } from "../helpers/jobs";
import type { FakeS3 } from "../helpers/fake-s3";
import {
  ageTombstones,
  fileRow,
  rideOn,
  seedStorageTeam,
  tombstones,
  useFakeS3,
  type StorageTeam,
} from "./fixture";

/**
 * Objects whose row is gone (docs/adr/0087): every way a file's row goes
 * — the rider deletes the ride, a coach erases the rider, the owner
 * deletes the workspace — leaves a tombstone, and the job deletes the
 * object and the tombstone once the tombstone is older than its grace. A
 * key a row holds again is never deleted; a reservation is left alone
 * while it is young.
 */

let admin: Pool;
let fake: FakeS3;
let restore: () => Promise<void>;
let team: StorageTeam;

beforeAll(async () => {
  admin = adminPool();
  ({ fake, restore } = await useFakeS3());
  team = await seedStorageTeam(admin, "tomb");
  await admin.query(`delete from file_tombstones`);
});

beforeEach(async () => {
  await clearJobs();
});

afterAll(async () => {
  await restore();
  await admin.end();
});

async function keyOf(activityId: string): Promise<string> {
  return (await fileRow(admin, activityId))!.storage_key!;
}

describe("a deleted ride", () => {
  it("leaves its object behind as a tombstone, and the job removes both after the grace", async () => {
    const { activityId } = await importFit(team.rider, team.riderId, "tur.fit", rideOn(0));
    const key = await keyOf(activityId);
    expect(fake.objects.has(key)).toBe(true);

    await deleteActivity(team.rider, activityId);
    expect(await tombstones(admin)).toContain(key);
    expect(fake.objects.has(key)).toBe(true);

    // Younger than the grace: left alone.
    expect(await clearTombstones()).toEqual({ deleted: 0, kept: 0 });
    expect(fake.objects.has(key)).toBe(true);

    await ageTombstones(admin);
    expect(await clearTombstones()).toEqual({ deleted: 1, kept: 0 });
    expect(fake.objects.has(key)).toBe(false);
    expect(await tombstones(admin)).toEqual([]);
  });
});

describe("an erased rider and a deleted workspace", () => {
  it("leave tombstones through the cascade", async () => {
    const other = await seedStorageTeam(admin, "tomb2");
    const a = await importFit(other.rider, other.riderId, "a.fit", rideOn(1));
    const b = await importFit(other.rider, other.riderId, "b.fit", rideOn(2));
    const keyA = await keyOf(a.activityId);
    const keyB = await keyOf(b.activityId);

    const app = await appClient();
    try {
      // A second rider in the same workspace, erased by the coach.
      await admin.query(
        `insert into riders (id, org_id, name, birth_year) values ('tomb2_other', $1, 'Anden', 2009)`,
        [other.orgId],
      );
      await admin.query(`update activities set rider_id = 'tomb2_other' where id = $1`, [
        b.activityId,
      ]);
      await admin.query(
        `update activity_files set rider_id = 'tomb2_other' where activity_id = $1`,
        [b.activityId],
      );
      await asAppCommit(app, other.coach, (c) => c.query(`select erase_rider('tomb2_other')`));
      expect(await tombstones(admin)).toContain(keyB);
      expect(fake.objects.has(keyB)).toBe(true);

      await asAppCommit(app, other.coach, (c) =>
        c.query(`select delete_workspace($1)`, [other.orgId]),
      );
      expect(await tombstones(admin)).toContain(keyA);
    } finally {
      await app.end();
    }

    await ageTombstones(admin);
    const run = await clearTombstones();
    expect(run.deleted).toBeGreaterThanOrEqual(2);
    expect(fake.objects.has(keyA)).toBe(false);
    expect(fake.objects.has(keyB)).toBe(false);
  });
});

describe("the job", () => {
  it("never deletes an object a row still names, and drops that tombstone", async () => {
    const { activityId } = await importFit(team.rider, team.riderId, "tur.fit", rideOn(3));
    const key = await keyOf(activityId);
    await admin.query(`insert into file_tombstones (storage_key) values ($1)`, [key]);
    await ageTombstones(admin);
    expect(await clearTombstones()).toEqual({ deleted: 0, kept: 0 });
    expect(fake.objects.has(key)).toBe(true);
    expect(await tombstones(admin)).not.toContain(key);
  });

  it("leaves a young reservation alone and clears an old one, object or not", async () => {
    const key = objectKey(team.orgId, team.riderId, "ef".repeat(32));
    await reserveKey(key);
    expect(await clearTombstones()).toEqual({ deleted: 0, kept: 0 });
    expect(await tombstones(admin)).toContain(key);
    await ageTombstones(admin);
    expect(await clearTombstones()).toEqual({ deleted: 1, kept: 0 });
    expect(await tombstones(admin)).not.toContain(key);
  });

  it("keeps a tombstone whose object the store would not delete", async () => {
    const { activityId } = await importFit(team.rider, team.riderId, "tur.fit", rideOn(4));
    const key = await keyOf(activityId);
    await deleteActivity(team.rider, activityId);
    await ageTombstones(admin);
    fake.failNext("DELETE");
    expect(await clearTombstones()).toEqual({ deleted: 0, kept: 1 });
    expect(await tombstones(admin)).toContain(key);
    expect(await clearTombstones()).toEqual({ deleted: 1, kept: 0 });
  });

  it("runs from the queue as the recurring kind", async () => {
    await enqueue(fileTombstonesJob, {}, { dedupeKey: RECURRING_KEY });
    const runs = await drainJobs(["files.tombstones"]);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ outcome: "done", result: { deleted: 0, kept: 0 } });
    // And the next one is waiting.
    const { rows } = await admin.query(
      `select count(*)::int as n from jobs where kind = 'files.tombstones' and done_at is null`,
    );
    expect(rows[0].n).toBe(1);
  });

  it("refuses to be asked from inside a workspace", async () => {
    const app = await appClient();
    try {
      await app.query("begin");
      await app.query(
        `select set_config('app.org_id', $1, true), set_config('app.user_id', $2, true)`,
        [team.orgId, team.coach.userId],
      );
      await expect(app.query(`select * from file_tombstones_due(10)`)).rejects.toMatchObject({
        code: "42501",
      });
      await app.query("rollback");
    } finally {
      await app.end();
    }
  });
});
