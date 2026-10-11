import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { peekRateLimit, rateLimit, resetRateLimits } from "@/core/rate-limit";
import {
  ARCHIVE_KEPT_PER_DAY,
  ARCHIVE_READ_PER_DAY,
  ARCHIVE_REQUESTS_PER_DAY,
  archiveKeptKey,
  archiveReadKey,
  DAY,
} from "@/modules/devices/archive";
import { MAX_UPLOAD_BYTES } from "@/modules/devices/import";
import { STORED_FILES_PER_HOUR, storedFilesKey } from "@/modules/devices/ingest";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";
import { SPORT } from "@/modules/fit";
import { bytesOf, gpx } from "../files/fixtures";
import { encodeRide, steadyHour } from "../fit/fixtures";

/**
 * A Strava archive's rides kept (docs/adr/0030), through the route the
 * browser sends them to: each under the name the rider gave it on Strava,
 * only rides when only rides are asked for, a day's budget of its own
 * that leaves the hour's sixty alone and is not spent on files Kadence
 * has, and the same refusals as every door that stands on the session.
 * How the door reads a body: tests/devices/archive-door.test.ts.
 */

const auth = vi.hoisted(() => ({ session: null as { orgId: string; userId: string } | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => auth.session }));

const { POST } = await import("@/app/api/activities/archive/route");

const ORG = "org_archive";
const OTHER = "org_archive_other";
const COACH = { orgId: ORG, userId: "user_ar_coach" };
const IDA = { orgId: ORG, userId: "user_ar_ida" };
const PARENT = { orgId: ORG, userId: "user_ar_parent" };
const STRANGER = { orgId: OTHER, userId: "user_ar_stranger" };
const URL = "http://localhost:3000/api/activities/archive";
const HOUR = 60 * 60 * 1000;

let admin: Pool;
let day = 40;
/** A ride on the bike Kadence has not seen, a day later than the last, as Strava keeps it: gzipped. */
function nextRide() {
  const days = day++;
  const samples = steadyHour().map((sample) => ({ ...sample, s: sample.s + days * 86_400 }));
  return new Uint8Array(
    gzipSync(encodeRide(samples, { sport: SPORT.cycling, timerSeconds: 3600 })),
  );
}

type Part = { name: string; bytes: Uint8Array; title?: string; kind?: string };

/** The address the browser posts to: the rider and what to keep are in it. */
const at = (params: Record<string, string>) => `${URL}?${new URLSearchParams(params)}`;

function send(
  parts: Part[],
  params: Record<string, string> = { riderId: "ar_ida", only: "bike" },
  headers: Record<string, string> = {},
) {
  const form = new FormData();
  for (const part of parts) {
    form.append("file", new File([part.bytes as Uint8Array<ArrayBuffer>], part.name));
    form.append("title", part.title ?? "");
    form.append("kind", part.kind ?? "unknown");
  }
  return POST(new Request(at(params), { method: "POST", headers, body: form }));
}

const stored = async (fileName: string) =>
  (
    await admin.query(
      `select a.title, a.sport, a.source, a.created_by, f.file_name
         from activities a join activity_files f on f.activity_id = a.id
        where a.rider_id = 'ar_ida' and f.file_name = $1`,
      [fileName],
    )
  ).rows;
const count = async () =>
  (await admin.query("select count(*)::int as n from activities where rider_id = 'ar_ida'")).rows[0]
    .n as number;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [IDA, PARENT]) await seedPerson(admin, ORG, p.userId, "member");
  await seedPerson(admin, OTHER, STRANGER.userId, "owner");
  for (const [org, id, user] of [
    [ORG, "ar_ida", IDA.userId],
    [OTHER, "ar_other", STRANGER.userId],
  ] as const) {
    const q = insertSql("riders", { org_id: org, id, user_id: user, name: id, birth_year: 2009 });
    await admin.query(q.text, q.values);
  }
  const g = insertSql("guardians", {
    org_id: ORG,
    rider_id: "ar_ida",
    user_id: PARENT.userId,
    name: "Mor",
    confirmed_at: new Date(),
  });
  await admin.query(g.text, g.values);
});

beforeEach(async () => {
  await resetRateLimits();
  auth.session = IDA;
});

afterAll(async () => {
  await admin.end();
});

describe("a ride from the archive", () => {
  it("is kept under the name the rider gave it on Strava, as the file it came in", async () => {
    const response = await send([{ name: "1001.fit.gz", bytes: nextRide(), title: "Morgentur" }]);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const answer = await response.json();
    expect(answer).toMatchObject({
      results: [{ name: "1001.fit.gz", ok: true }],
      retryAfterSeconds: 0,
    });
    expect(await stored("1001.fit.gz")).toEqual([
      {
        title: "Morgentur",
        sport: "bike",
        source: "fit",
        created_by: IDA.userId,
        file_name: "1001.fit.gz",
      },
    ]);
  });

  it("is named by its sport, not by Strava's number, when the archive has no name for it", async () => {
    expect(
      (await (await send([{ name: "1002.fit.gz", bytes: nextRide() }])).json()).results[0].ok,
    ).toBe(true);
    expect((await stored("1002.fit.gz"))[0].title).toBe("");
  });

  it("keeps the rider's name over the one inside a GPX", async () => {
    await send([{ name: "1003.gpx", bytes: bytesOf(gpx(900)), title: "Søndagstur  med\nklubben" }]);
    expect((await stored("1003.gpx"))[0].title).toBe("Søndagstur med klubben");
  });

  it("that is no ride is passed over when rides are asked for, and kept when everything is", async () => {
    // Another day than the GPX ride above, so it is not that ride by its start.
    const run = bytesOf(gpx(600, { type: "running" }).replaceAll("2026-08-11T", "2026-08-12T"));
    const passed = await (await send([{ name: "1004.gpx", bytes: run, title: "Løb" }])).json();
    expect(passed.results).toEqual([{ name: "1004.gpx", ok: false, error: "not_bike" }]);
    expect(await stored("1004.gpx")).toEqual([]);

    const all = { riderId: "ar_ida", only: "all" };
    expect(
      (await (await send([{ name: "1004.gpx", bytes: run, title: "Løb" }], all)).json()).results[0]
        .ok,
    ).toBe(true);
    expect((await stored("1004.gpx"))[0]).toMatchObject({ title: "Løb", sport: "other" });
  });

  it("that is here already is answered so, and uses nothing of the day", async () => {
    const bytes = nextRide();
    await send([{ name: "1005.fit.gz", bytes }]);
    // One ride of the day left.
    for (let i = 0; i < ARCHIVE_KEPT_PER_DAY - 2; i++)
      await rateLimit(archiveKeptKey(IDA.userId, "ar_ida"), ARCHIVE_KEPT_PER_DAY, DAY);
    const again = await (await send([{ name: "1005.fit.gz", bytes }])).json();
    expect(again.results[0]).toMatchObject({ ok: false, error: "duplicate" });
    const last = await (await send([{ name: "1006.fit.gz", bytes: nextRide() }])).json();
    expect(last.results[0].ok).toBe(true);
    const over = await (await send([{ name: "1007.fit.gz", bytes: nextRide() }])).json();
    expect(over.results[0].error).toBe("rateLimited");
  });

  it("comes three to a request, each answered on its own", async () => {
    const before = await count();
    const answer = await (
      await send([
        { name: "a.fit.gz", bytes: nextRide(), title: "A" },
        { name: "b.fit", bytes: bytesOf("not a ride"), title: "B" },
        { name: "c.fit.gz", bytes: nextRide(), title: "C" },
      ])
    ).json();
    expect(answer.results.map((r: { ok: boolean }) => r.ok)).toEqual([true, false, true]);
    expect(answer.results[1].error).toBe("unknown_format");
    expect(await count()).toBe(before + 2);
  });

  it("over the upload's cap is answered without being read", async () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    const answer = await (await send([{ name: "big.fit", bytes: big }])).json();
    expect(answer.results).toEqual([{ name: "big.fit", ok: false, error: "too_large" }]);
  });
});

describe("the day's budget", () => {
  it("is the archive's own: the hour's sixty neither stop it nor are used by it", async () => {
    for (let i = 0; i < STORED_FILES_PER_HOUR; i++)
      await rateLimit(storedFilesKey(IDA.userId), STORED_FILES_PER_HOUR, HOUR);
    expect(
      (await (await send([{ name: "d1.fit.gz", bytes: nextRide() }])).json()).results[0].ok,
    ).toBe(true);
    await resetRateLimits();
    await send([{ name: "d2.fit.gz", bytes: nextRide() }]);
    expect((await peekRateLimit(storedFilesKey(IDA.userId), 1)).allowed).toBe(true);
  });

  it("stops at the rides kept, and says when there is room again", async () => {
    for (let i = 0; i < ARCHIVE_KEPT_PER_DAY; i++)
      await rateLimit(archiveKeptKey(IDA.userId, "ar_ida"), ARCHIVE_KEPT_PER_DAY, DAY);
    const before = await count();
    const answer = await (await send([{ name: "e1.fit.gz", bytes: nextRide() }])).json();
    expect(answer.results).toEqual([{ name: "e1.fit.gz", ok: false, error: "rateLimited" }]);
    expect(answer.retryAfterSeconds).toBeGreaterThan(0);
    expect(await count()).toBe(before);
  });

  it("stops at the files read, whatever they turned out to be", async () => {
    for (let i = 0; i < ARCHIVE_READ_PER_DAY; i++)
      await rateLimit(archiveReadKey(IDA.userId, "ar_ida"), ARCHIVE_READ_PER_DAY, DAY);
    const answer = await (await send([{ name: "e2.fit.gz", bytes: nextRide() }])).json();
    expect(answer.results[0]).toMatchObject({ ok: false, error: "rateLimited" });
  });

  it("is the person's: a coach's day for the rider is not the rider's own", async () => {
    for (let i = 0; i < ARCHIVE_KEPT_PER_DAY; i++)
      await rateLimit(archiveKeptKey(COACH.userId, "ar_ida"), ARCHIVE_KEPT_PER_DAY, DAY);
    auth.session = COACH;
    expect(
      (await (await send([{ name: "f1.fit.gz", bytes: nextRide() }])).json()).results[0].error,
    ).toBe("rateLimited");
    auth.session = IDA;
    expect(
      (await (await send([{ name: "f2.fit.gz", bytes: nextRide() }])).json()).results[0].ok,
    ).toBe(true);
  });

  it("counts the requests too, and answers the last with when to come back", async () => {
    for (let i = 0; i < ARCHIVE_REQUESTS_PER_DAY; i++)
      await rateLimit(`archive:${IDA.userId}`, ARCHIVE_REQUESTS_PER_DAY, DAY);
    const response = await send([{ name: "g1.fit.gz", bytes: nextRide() }]);
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("who may send an archive's rides", () => {
  it("is the rider and a coach, for the rider", async () => {
    auth.session = COACH;
    const answer = await (
      await send([{ name: "h1.fit.gz", bytes: nextRide(), title: "Fra træneren" }])
    ).json();
    expect(answer.results[0].ok).toBe(true);
    expect((await stored("h1.fit.gz"))[0]).toMatchObject({ created_by: COACH.userId });
  });

  it("is not a parent, nor anyone for another team's rider", async () => {
    const before = await count();
    auth.session = PARENT;
    expect((await send([{ name: "i1.fit.gz", bytes: nextRide() }])).status).toBe(403);
    auth.session = IDA;
    const other = await send([{ name: "i2.fit.gz", bytes: nextRide() }], {
      riderId: "ar_other",
      only: "bike",
    });
    expect([403, 404]).toContain(other.status);
    expect(await count()).toBe(before);
  });

  it("is nobody who is not signed in, and no page on another site", async () => {
    auth.session = null;
    expect((await send([{ name: "j1.fit.gz", bytes: nextRide() }])).status).toBe(401);
    auth.session = IDA;
    for (const site of ["cross-site", "same-site"])
      expect(
        (
          await send([{ name: "j2.fit.gz", bytes: nextRide() }], undefined, {
            "sec-fetch-site": site,
          })
        ).status,
        site,
      ).toBe(403);
  });

  it("is refused a form that is not what the browser sends", async () => {
    const one = [{ name: "k.fit.gz", bytes: nextRide() }];
    const forms: Array<Record<string, string>> = [
      { only: "bike" },
      { riderId: "ar_ida", only: "runs" },
      { riderId: "x".repeat(101), only: "bike" },
    ];
    for (const fields of forms)
      expect((await send(one, fields)).status, JSON.stringify(fields)).toBe(400);
    expect((await send([])).status).toBe(400);
    const four = Array.from({ length: 4 }, (_, i) => ({ name: `${i}.fit`, bytes: nextRide() }));
    expect((await send(four)).status).toBe(400);
  });
});

describe("the files Kadence has", () => {
  it("are answered by their hash and cost nothing of the day's reads, however often they come", async () => {
    const bytes = nextRide();
    expect((await (await send([{ name: "l1.fit.gz", bytes }])).json()).results[0].ok).toBe(true);
    for (let i = 0; i < ARCHIVE_READ_PER_DAY; i++)
      await rateLimit(archiveReadKey(IDA.userId, "ar_ida"), ARCHIVE_READ_PER_DAY, DAY);
    for (let i = 0; i < 3; i++) {
      const again = await (await send([{ name: "l1.fit.gz", bytes }])).json();
      expect(again.results[0]).toMatchObject({ ok: false, error: "duplicate" });
    }
    // A file it has not got still meets the day's end.
    const fresh = await (await send([{ name: "l2.fit.gz", bytes: nextRide() }])).json();
    expect(fresh.results[0]).toMatchObject({ ok: false, error: "rateLimited" });
  });
});

describe("what the archive's list says an activity was", () => {
  // Strava's number for a walk is not one Kadence knows: the file says nothing it can read.
  const walk = (date: string) =>
    bytesOf(gpx(600, { type: "10" }).replaceAll("2026-08-11T", `${date}T`));

  it("decides the sport of a GPX: a walk is no ride when the list says so", async () => {
    const all = { riderId: "ar_ida", only: "all" };
    const kept = await (
      await send(
        [{ name: "m1.gpx", bytes: walk("2026-08-13"), title: "Gåtur", kind: "other" }],
        all,
      )
    ).json();
    expect(kept.results[0].ok).toBe(true);
    expect((await stored("m1.gpx"))[0]).toMatchObject({ sport: "other" });

    const passed = await (
      await send([{ name: "m2.gpx", bytes: walk("2026-08-14"), kind: "other" }])
    ).json();
    expect(passed.results[0]).toMatchObject({ ok: false, error: "not_bike" });
  });

  it("is only a hint: a word it does not know leaves the file to say", async () => {
    const answer = await (
      await send([{ name: "m3.gpx", bytes: walk("2026-08-15"), kind: "whatever" }])
    ).json();
    expect(answer.results[0].ok).toBe(true);
    expect((await stored("m3.gpx"))[0]).toMatchObject({ sport: "bike" });
  });
});
