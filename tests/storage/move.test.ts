import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { configureFileStorage, objectKey } from "@/core/files/storage";
import { importFit } from "@/modules/devices/import";
import { enqueueFileMove } from "@/modules/storage/move";
import { clearTombstones } from "@/modules/storage/tombstones";
import { moveRiderHistory } from "@/modules/team/history-move";
import { adminPool } from "../helpers/db";
import { clearJobs, drainJobs } from "../helpers/jobs";
import type { FakeS3 } from "../helpers/fake-s3";
import { insertSql, seedPerson } from "../helpers/rows";
import { ageTombstones, fileRow, rideOn, tombstones, useFakeS3 } from "./fixture";

/**
 * When a rider's history moves to another workspace (ADR 0081), the
 * objects follow (docs/adr/0087): the move service puts a job in, the job
 * copies each object under the new workspace and rider, points the row at
 * it, and the old key becomes a tombstone. Until then the row still reads
 * through the old key.
 */

let admin: Pool;
let fake: FakeS3;
let restore: () => Promise<void>;

const USER = "user_mv_rider";
const TEAM = "org_mv_team";
const OWN = "org_mv_own";

beforeAll(async () => {
  admin = adminPool();
  ({ fake, restore } = await useFakeS3());
  await seedPerson(admin, TEAM, "user_mv_coach", "owner", "Holdet");
  await seedPerson(admin, TEAM, USER, "member");
  // seedPerson names a membership after the user, so the second workspace's is written by hand.
  await admin.query(
    `insert into organizations (id, name, slug) values ($1, 'Eget rum', 'org-mv-own') on conflict do nothing`,
    [OWN],
  );
  await admin.query(
    `insert into memberships (id, organization_id, user_id, role) values ('mem_mv_own', $1, $2, 'owner')`,
    [OWN, USER],
  );
  for (const [org, id] of [
    [TEAM, "mv_team_rider"],
    [OWN, "mv_own_rider"],
  ]) {
    const q = insertSql("riders", {
      org_id: org,
      id,
      user_id: USER,
      name: "Rytter",
      birth_year: 2008,
      ftp_watts: 250,
    });
    await admin.query(q.text, q.values);
  }
  await clearJobs();
});

afterAll(async () => {
  await restore();
  await admin.end();
});

describe("the files follow the history", () => {
  it("copies each object under the new key, points the row at it and tombstones the old", async () => {
    const team = { orgId: TEAM, userId: USER };
    const own = { orgId: OWN, userId: USER };
    const a = await importFit(team, "mv_team_rider", "a.fit", rideOn(0));
    const b = await importFit(team, "mv_team_rider", "b.fit", rideOn(1));
    const oldA = (await fileRow(admin, a.activityId))!.storage_key!;
    const oldB = (await fileRow(admin, b.activityId))!.storage_key!;
    expect(oldA.startsWith(`${TEAM}/mv_team_rider/`)).toBe(true);

    const moved = await moveRiderHistory(own, "mv_team_rider", "mv_own_rider");
    expect(moved.find((m) => m.table === "activity_files")?.rows).toBe(2);
    // The rows moved at once; their keys still name the team, and still read.
    const rowA = (await fileRow(admin, a.activityId))!;
    expect(rowA).toMatchObject({ org_id: OWN, rider_id: "mv_own_rider", storage_key: oldA });
    expect(fake.objects.has(oldA)).toBe(true);

    const runs = await drainJobs(["files.move"]);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ outcome: "done", result: { moved: 2, missing: 0 } });

    const newA = objectKey(OWN, "mv_own_rider", rowA.sha256);
    const newB = objectKey(OWN, "mv_own_rider", (await fileRow(admin, b.activityId))!.sha256);
    expect((await fileRow(admin, a.activityId))!.storage_key).toBe(newA);
    expect((await fileRow(admin, b.activityId))!.storage_key).toBe(newB);
    expect(fake.objects.get(newA)?.bytes.equals(Buffer.from(rideOn(0)))).toBe(true);
    expect(fake.objects.get(newB)?.bytes.equals(Buffer.from(rideOn(1)))).toBe(true);
    expect(await tombstones(admin)).toEqual(expect.arrayContaining([oldA, oldB]));
    expect(await tombstones(admin)).not.toContain(newA);

    await ageTombstones(admin);
    await clearTombstones();
    expect(fake.objects.has(oldA)).toBe(false);
    expect(fake.objects.has(oldB)).toBe(false);
    expect(fake.objects.has(newA)).toBe(true);
  });

  it("has nothing to do a second time, and is not put in at all in db mode", async () => {
    const own = { orgId: OWN, userId: USER };
    expect(await enqueueFileMove(own, "mv_own_rider")).toEqual(expect.any(String));
    const runs = await drainJobs(["files.move"]);
    expect(runs[0]).toMatchObject({ outcome: "done", result: { moved: 0, missing: 0 } });

    configureFileStorage(null);
    try {
      expect(await enqueueFileMove(own, "mv_own_rider")).toBeNull();
    } finally {
      await restore();
      ({ fake, restore } = await useFakeS3());
    }
  });
});
