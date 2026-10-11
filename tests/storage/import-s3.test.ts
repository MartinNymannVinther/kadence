import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Pool } from "pg";
import { configureFileStorage, fileStorage, objectKey } from "@/core/files/storage";
import { resetRateLimits } from "@/core/rate-limit";
import { importFit } from "@/modules/devices/import";
import { adminPool } from "../helpers/db";
import { drain } from "../helpers/export";
import type { FakeS3 } from "../helpers/fake-s3";
import { insertSql } from "../helpers/rows";
import {
  fileRow,
  rideOn,
  seedStorageTeam,
  tombstones,
  useFakeS3,
  type StorageTeam,
} from "./fixture";

/**
 * Files as objects (docs/adr/0087): the import writes the object and then
 * the row that names it, in one transaction as far as a database and a
 * store can share one; the download and the export read the row under
 * RLS first and the object after; a store that refuses leaves no row, and
 * a row that cannot be written takes its object with it.
 */

const session = vi.hoisted(() => ({ ctx: null as { orgId: string; userId: string } | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => session.ctx }));
const { GET: download } = await import("@/app/api/activities/[id]/file/route");
const { GET: exportFiles } = await import("@/app/api/export/files/route");

let admin: Pool;
let fake: FakeS3;
let restore: () => Promise<void>;
let team: StorageTeam;
let other: StorageTeam;

beforeAll(async () => {
  admin = adminPool();
  ({ fake, restore } = await useFakeS3());
  team = await seedStorageTeam(admin, "s3imp");
  other = await seedStorageTeam(admin, "s3oth");
});

beforeEach(() => resetRateLimits());

afterAll(async () => {
  await restore();
  await admin.end();
});

function unpack(buffer: Buffer): Array<{ name: string; hex: string }> {
  const dir = mkdtempSync(join(tmpdir(), "s3files-"));
  const file = join(dir, "files.zip");
  writeFileSync(file, buffer);
  const out = execFileSync("python3", [
    "-c",
    "import zipfile,sys,json\nz=zipfile.ZipFile(sys.argv[1])\nassert z.testzip() is None\nprint(json.dumps([{'name':i.filename,'hex':z.read(i).hex()} for i in z.infolist()]))",
    file,
  ]);
  return JSON.parse(out.toString());
}

describe("importing with files as objects", () => {
  it("writes the object under the workspace, rider and hash, and a row with the key and no bytes", async () => {
    const ride = rideOn(0);
    const imported = await importFit(team.rider, team.riderId, "tur.fit", ride);
    const row = await fileRow(admin, imported.activityId);
    const key = objectKey(team.orgId, team.riderId, row!.sha256);
    expect(row).toMatchObject({ storage_key: key, in_row: null, size_bytes: ride.byteLength });
    expect(fake.objects.get(key)?.bytes.equals(Buffer.from(ride))).toBe(true);
    expect(fake.objects.get(key)?.sse).toBe("AES256");
    // The reservation went with the row's commit.
    expect(await tombstones(admin)).not.toContain(key);
    // The trail has the key and never the file.
    const trail = await admin.query(
      `select after_data from audit_log where entity_type = 'activity_files' and entity_id = $1`,
      [row!.id],
    );
    expect(trail.rows[0].after_data).toMatchObject({ storage_key: key });
    expect(trail.rows[0].after_data).not.toHaveProperty("bytes");
  });

  it("serves the download from the store to whoever may read the row, and nothing to anyone else", async () => {
    const ride = rideOn(1);
    const { activityId } = await importFit(team.rider, team.riderId, "tur.fit", ride);
    const request = new NextRequest(`http://localhost:3000/api/activities/${activityId}/file`);
    const params = { params: Promise.resolve({ id: activityId }) };

    session.ctx = team.coach;
    const asCoach = await download(request, params);
    expect(asCoach.status).toBe(200);
    expect(new Uint8Array(await asCoach.arrayBuffer())).toEqual(ride);

    session.ctx = team.rider;
    expect((await download(request, params)).status).toBe(200);

    session.ctx = other.coach;
    expect((await download(request, params)).status).toBe(404);
    session.ctx = null;
    expect((await download(request, params)).status).toBe(401);
  });

  it("puts the objects in the files export, byte for byte", async () => {
    session.ctx = team.coach;
    const response = await exportFiles(new NextRequest("http://localhost:3000/api/export/files"));
    expect(response.status).toBe(200);
    const entries = unpack(await drain(response.body!));
    expect(entries.length).toBeGreaterThanOrEqual(2);
    const stored = [...fake.objects.values()].map((o) => o.bytes.toString("hex"));
    for (const entry of entries) expect(stored).toContain(entry.hex);
  });

  it("writes no row and no ride when the store refuses the object", async () => {
    fake.failNext("PUT");
    const ride = rideOn(2);
    await expect(importFit(team.rider, team.riderId, "tur.fit", ride)).rejects.toMatchObject({
      name: "StorageError",
    });
    const rides = await admin.query(
      `select count(*)::int as n from activities where rider_id = $1 and on_date = '2026-09-03'`,
      [team.riderId],
    );
    expect(rides.rows[0].n).toBe(0);
    // The reservation stands, so the job would remove an object had one been written.
    expect((await tombstones(admin)).some((k) => k.startsWith(`${team.orgId}/`))).toBe(true);
  });

  it("deletes the object when the row cannot be written", async () => {
    const base = fileStorage();
    const ride = rideOn(3);
    // Between the upload and the insert, the same file is written for the
    // same rider by another hand: the import's insert then collides on
    // (rider, sha256) and must take its object with it.
    configureFileStorage({
      ...base,
      store: async (key, bytes) => {
        const location = await base.store(key, bytes);
        const sha = key.split("/")[2]!.replace(/\.fit$/, "");
        await admin.query(
          insertSql("activities", {
            id: "s3imp_collide",
            org_id: team.orgId,
            rider_id: team.riderId,
            started_at: "2026-09-04T18:00:00Z",
            on_date: "2026-09-04",
            sport: "bike",
            moving_seconds: 60,
            source: "fit",
          }),
        );
        await admin.query(
          insertSql("activity_files", {
            org_id: team.orgId,
            rider_id: team.riderId,
            activity_id: "s3imp_collide",
            file_name: "other.fit",
            sha256: sha,
            bytes: Buffer.from("x"),
          }),
        );
        return location;
      },
    });
    try {
      await expect(importFit(team.rider, team.riderId, "tur.fit", ride)).rejects.toThrow();
    } finally {
      configureFileStorage(base);
    }
    const sha = (await fileRow(admin, "s3imp_collide"))!.sha256;
    expect(fake.objects.has(objectKey(team.orgId, team.riderId, sha))).toBe(false);
    expect(fake.requests.at(-1)).toMatchObject({ method: "DELETE" });
  });

  it("keeps the file in the row in db mode, with its size", async () => {
    configureFileStorage(null);
    try {
      const ride = rideOn(5);
      const { activityId } = await importFit(team.rider, team.riderId, "tur.fit", ride);
      const row = await fileRow(admin, activityId);
      expect(row).toMatchObject({
        storage_key: null,
        in_row: ride.byteLength,
        size_bytes: ride.byteLength,
      });
      session.ctx = team.rider;
      const got = await download(new NextRequest("http://localhost:3000/x"), {
        params: Promise.resolve({ id: activityId }),
      });
      expect(new Uint8Array(await got.arrayBuffer())).toEqual(ride);
    } finally {
      configureFileStorage(fileStorage());
      // Back to the fake for the files that follow in this process.
      ({ fake, restore } = await (async () => {
        await restore();
        return useFakeS3();
      })());
    }
  });
});
