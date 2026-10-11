import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Pool } from "pg";
import { crc32 } from "@/core/crc32";
import { resetRateLimits } from "@/core/rate-limit";
import {
  archivePath,
  batches,
  riderFolders,
  safeName,
  type ExportFile,
} from "@/modules/export/files";
import { adminPool } from "../helpers/db";
import { drain } from "../helpers/export";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * "Hent dine filer" (ADR 0084): every ride's original file, as a ZIP
 * with a folder per rider, under the same RLS as everything else. A coach
 * gets the team's files, a rider their own, and nobody another team's.
 * The archive is read back by Python's zipfile, which checks every CRC.
 */

const session = vi.hoisted(() => ({ ctx: null as { orgId: string; userId: string } | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => session.ctx }));
const { GET } = await import("@/app/api/export/files/route");

const ORG = "org_files_export";
const OTHER = "org_files_other";
const COACH = { orgId: ORG, userId: "user_fx_coach" };
const ASE = { orgId: ORG, userId: "user_fx_ase" };
const OTHER_COACH = { orgId: OTHER, userId: "user_fx_other" };

let admin: Pool;
const files: Record<string, Buffer> = {};

async function addRide(org: string, rider: string, id: string, day: string, size: number) {
  await admin.query(
    insertSql("activities", {
      id,
      org_id: org,
      rider_id: rider,
      started_at: `${day}T08:00:00Z`,
      on_date: day,
      sport: "bike",
      moving_seconds: 3600,
      source: "fit",
    }),
  );
  const bytes = Buffer.alloc(size, id.length);
  bytes.write(id);
  files[id] = bytes;
  await admin.query(
    insertSql("activity_files", {
      org_id: org,
      rider_id: rider,
      activity_id: id,
      file_name: "ride.fit",
      sha256: id,
      bytes,
    }),
  );
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner", "Hold Fil");
  await seedPerson(admin, ORG, ASE.userId, "member");
  await seedPerson(admin, OTHER, OTHER_COACH.userId, "owner");
  const riders: Array<[string, string, string, string | null]> = [
    [ORG, "fx_ase", "Åse Ørsted", ASE.userId],
    [ORG, "fx_bo", "Bo/Hansen", null],
    [OTHER, "fx_other", "Anden", null],
  ];
  for (const [org, id, name, user] of riders) {
    await admin.query(
      insertSql("riders", { org_id: org, id, name, user_id: user, birth_year: 2009 }),
    );
  }
  await addRide(ORG, "fx_ase", "fx_act_1", "2026-11-02", 20_000);
  await addRide(ORG, "fx_ase", "fx_act_2", "2026-11-03", 1_000);
  await addRide(ORG, "fx_bo", "fx_act_3", "2026-11-02", 5_000);
  await addRide(OTHER, "fx_other", "fx_act_4", "2026-11-02", 500);
});

afterAll(async () => {
  await admin.end();
});

beforeEach(() => resetRateLimits());

async function download(ctx: typeof COACH | null) {
  session.ctx = ctx;
  return GET(new NextRequest("http://localhost:3000/api/export/files"));
}

function unpack(buffer: Buffer): Array<{ name: string; crc: number; hex: string }> {
  const dir = mkdtempSync(join(tmpdir(), "files-"));
  const file = join(dir, "files.zip");
  writeFileSync(file, buffer);
  const out = execFileSync("python3", [
    "-c",
    "import zipfile,sys,json\nz=zipfile.ZipFile(sys.argv[1])\nassert z.testzip() is None\nprint(json.dumps([{'name':i.filename,'crc':i.CRC,'hex':z.read(i).hex()} for i in z.infolist()]))",
    file,
  ]);
  return JSON.parse(out.toString());
}

describe("the files download", () => {
  it("gives a coach the team's files in a folder per rider, byte for byte", async () => {
    const response = await download(COACH);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="kadence-hold-fil-filer-\d{4}-\d{2}-\d{2}\.zip"$/,
    );
    const entries = unpack(await drain(response.body!));
    // In the database's collation, which need not be Danish.
    expect(entries.map((e) => e.name).sort()).toEqual([
      "Bo Hansen/2026-11-02-fx_act_3.fit",
      "Åse Ørsted/2026-11-02-fx_act_1.fit",
      "Åse Ørsted/2026-11-03-fx_act_2.fit",
    ]);
    for (const entry of entries) {
      const id = entry.name.match(/(fx_act_\d)\.fit$/)![1]!;
      expect(entry.hex).toBe(files[id]!.toString("hex"));
      expect(entry.crc).toBe(crc32(files[id]!));
    }
    const trail = await admin.query(
      `select after_data from audit_log where org_id = $1 and action = 'workspace.files_exported'`,
      [ORG],
    );
    expect(trail.rows.at(-1).after_data).toEqual({ files: 3, bytes: 26_000 });
  });

  it("gives a rider their own files and nothing of a teammate's", async () => {
    const entries = unpack(await drain((await download(ASE)).body!));
    expect(entries.map((e) => e.name)).toEqual([
      "Åse Ørsted/2026-11-02-fx_act_1.fit",
      "Åse Ørsted/2026-11-03-fx_act_2.fit",
    ]);
  });

  it("gives another team only its own", async () => {
    const entries = unpack(await drain((await download(OTHER_COACH)).body!));
    expect(entries.map((e) => e.name)).toEqual(["Anden/2026-11-02-fx_act_4.fit"]);
  });

  it("asks for a session", async () => {
    expect((await download(null)).status).toBe(401);
  });

  it("is limited to two a workspace an hour, and says so on the data page", async () => {
    expect((await download(COACH)).status).toBe(200);
    expect((await download(ASE)).status).toBe(200);
    const third = await download(COACH);
    expect(third.status).toBe(303);
    expect(third.headers.get("location")).toMatch(/^\/settings\/data\?limited=files&minutes=\d+$/);
    // Another team has its own two.
    expect((await download(OTHER_COACH)).status).toBe(200);
  });
});

describe("names in the archive", () => {
  const file = (riderId: string, riderName: string): ExportFile => ({
    id: "f",
    activityId: "act/../x",
    riderId,
    riderName,
    onDate: "2026-11-02",
    size: 1,
  });

  it("are folder names a file system takes, never a path out of the archive", () => {
    expect(safeName("../../etc", "x")).toBe("etc");
    expect(safeName('a:b*c?"d<e>f|g', "x")).toBe("a b c d e f g");
    expect(safeName("   ", "rytter")).toBe("rytter");
    const folders = riderFolders([file("r1", "Emma")]);
    expect(archivePath(file("r1", "Emma"), folders)).toBe("Emma/2026-11-02-act .. x.fit");
  });

  it("keep two riders of the same name apart", () => {
    const folders = riderFolders([
      file("rider-aaaaaaaa1", "Emma"),
      file("rider-bbbbbbbb2", "Emma"),
    ]);
    expect([...folders.values()]).toEqual(["Emma (rider-aa)", "Emma (rider-bb)"]);
  });

  it("read the files a few megabytes at a time", () => {
    const sized = (size: number): ExportFile => ({ ...file("r", "R"), size });
    const cut = batches([sized(10_000_000), sized(10_000_000), sized(1), sized(30_000_000)]);
    expect(cut.map((b) => b.length)).toEqual([1, 2, 1]);
    expect(batches(Array.from({ length: 120 }, () => sized(1))).map((b) => b.length)).toEqual([
      50, 50, 20,
    ]);
  });
});
