import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import manifest from "@/app/manifest";
import { rateLimit, resetRateLimits } from "@/core/rate-limit";
import { STORED_FILES_PER_HOUR, storedFilesKey } from "@/modules/devices/ingest";
import { importShared, MAX_SHARED_FILES, sharedLanding } from "@/modules/devices/share";
import { ACCEPTED_EXTENSIONS } from "@/modules/files";
import type { FitErrorCode } from "@/modules/fit/errors";
import { sharedWords } from "@/components/today/shared-words";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";
import { bytesOf } from "../files/fixtures";
import { encodeRide, steadyHour } from "../fit/fixtures";

/**
 * A ride shared to Kadence from the phone's share sheet (docs/adr/0029):
 * imported for the rider who is signed in and nobody else, and answered
 * with a place to land — the ride, or today's page with what happened.
 */

/** Every code the decoder has; a new one does not compile until it is here. */
const FIT_ERRORS: Record<FitErrorCode, true> = {
  not_fit: true,
  truncated: true,
  bad_crc: true,
  too_large: true,
  unsupported: true,
  corrupt: true,
  empty: true,
  unknown_format: true,
  no_activity: true,
};
const FIT_ERROR_CODES = Object.keys(FIT_ERRORS) as FitErrorCode[];

const ORG = "org_share";
const COACH = { orgId: ORG, userId: "user_sh_coach" };
const IDA = { orgId: ORG, userId: "user_sh_ida" };

let admin: Pool;
const rideOn = (days: number) =>
  encodeRide(steadyHour().map((sample) => ({ ...sample, s: sample.s + days * 86_400 })));
const count = async () =>
  (await admin.query("select count(*)::int as n from activities where rider_id = 'sh_ida'")).rows[0]
    .n as number;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, IDA.userId, "member");
  const q = insertSql("riders", {
    org_id: ORG,
    id: "sh_ida",
    user_id: IDA.userId,
    name: "Ida",
    birth_year: 2008,
  });
  await admin.query(q.text, q.values);
});

beforeEach(() => resetRateLimits());

afterAll(async () => {
  await admin.end();
});

describe("a ride shared from the phone", () => {
  it("is imported for the rider and lands on the ride", async () => {
    const outcome = await importShared(IDA, [{ name: "2026-09-01.fit", bytes: rideOn(0) }]);
    expect(outcome.kind).toBe("imported");
    const [id] = (outcome as { activityIds: string[] }).activityIds;
    expect(sharedLanding(outcome)).toBe(`/activities/${id}`);
    const { rows } = await admin.query(
      "select rider_id, created_by, source, title from activities where id = $1",
      [id],
    );
    expect(rows).toEqual([
      { rider_id: "sh_ida", created_by: IDA.userId, source: "fit", title: "2026-09-01" },
    ]);
  });

  it("is answered in words when it was here already", async () => {
    const outcome = await importShared(IDA, [{ name: "igen.fit", bytes: rideOn(0) }]);
    expect(outcome).toEqual({ kind: "duplicate" });
    expect(sharedLanding(outcome)).toBe("/today?shared=duplicate");
    expect(await count()).toBe(1);
  });

  it("lands on today's page when more than one came in", async () => {
    const outcome = await importShared(IDA, [
      { name: "a.fit", bytes: rideOn(1) },
      { name: "b.fit", bytes: rideOn(2) },
      { name: "igen.fit", bytes: rideOn(0) },
    ]);
    expect(outcome.kind).toBe("imported");
    expect(sharedLanding(outcome)).toBe("/today?shared=imported&count=2");
    expect(await count()).toBe(3);
  });

  it("takes three files a share and leaves the rest", async () => {
    const files = [3, 4, 5, 6, 7].map((d) => ({ name: `${d}.fit`, bytes: rideOn(d) }));
    const outcome = await importShared(IDA, files);
    expect((outcome as { activityIds: string[] }).activityIds).toHaveLength(MAX_SHARED_FILES);
    expect(await count()).toBe(6);
  });

  it("that is no ride is refused with the reader's reason", async () => {
    const outcome = await importShared(IDA, [{ name: "billede.jpg", bytes: bytesOf("JFIF") }]);
    expect(outcome).toEqual({ kind: "refused", reason: "unknown_format" });
    expect(sharedLanding(outcome)).toBe("/today?shared=refused&reason=unknown_format");
  });

  it("is the rider's own: a coach shares nothing in nobody's name", async () => {
    const outcome = await importShared(COACH, [{ name: "c.fit", bytes: rideOn(8) }]);
    expect(outcome).toEqual({ kind: "not_a_rider" });
    expect(sharedLanding(outcome)).toBe("/today?shared=not_a_rider");
    expect(await count()).toBe(6);
  });

  it("waits when the hour's files are used up, and says so", async () => {
    for (let i = 0; i < STORED_FILES_PER_HOUR; i++)
      rateLimit(storedFilesKey(IDA.userId), STORED_FILES_PER_HOUR, 3_600_000);
    const outcome = await importShared(IDA, [{ name: "d.fit", bytes: rideOn(9) }]);
    expect(outcome).toEqual({ kind: "rate_limited" });
    expect(await count()).toBe(6);
  });

  it("with no file in it says so", async () => {
    expect(await importShared(IDA, [])).toEqual({ kind: "no_file" });
  });
});

describe("where a share lands", () => {
  it("never leaves the installation, whatever a reason or an id holds", () => {
    expect(sharedLanding({ kind: "refused", reason: "x&shared=imported#/../evil" })).toBe(
      "/today?shared=refused&reason=x%26shared%3Dimported%23%2F..%2Fevil",
    );
    expect(sharedLanding({ kind: "imported", activityIds: ["../../login?x=1"] })).toBe(
      "/activities/..%2F..%2Flogin%3Fx%3D1",
    );
  });
});

describe("what today's page reads from the address", () => {
  /** The address a share landed on, as the page is handed it. */
  const read = (landing: string) => {
    const query = new URL(landing, "http://kadence.test").searchParams;
    const word = (name: string) => query.get(name) ?? undefined;
    return sharedWords(word("shared"), word("count"), word("reason"));
  };

  it("is what the share wrote there", () => {
    expect(read(sharedLanding({ kind: "imported", activityIds: ["a", "b"] }))).toEqual({
      kind: "imported",
      count: 2,
    });
    expect(read(sharedLanding({ kind: "duplicate" }))).toEqual({ kind: "duplicate" });
    expect(read(sharedLanding({ kind: "not_a_rider" }))).toEqual({ kind: "not_a_rider" });
    expect(read(sharedLanding({ kind: "refused", reason: "bad_crc" }))).toEqual({
      kind: "refused",
      reason: "bad_crc",
    });
  });

  it("has words for every reason the decoder refuses a file for, in both languages", () => {
    for (const messages of [da, en]) {
      const words = messages.activities.upload.error as Record<string, string>;
      for (const code of FIT_ERROR_CODES) {
        expect(read(`/today?shared=refused&reason=${code}`)).toEqual({
          kind: "refused",
          reason: code,
        });
        expect(words[code], code).toBeTruthy();
      }
      expect(words.generic).toBeTruthy();
    }
  });

  it("is the general reason for anything a stranger wrote", () => {
    for (const reason of ["constructor", "__proto__", "toString", "hasOwnProperty", "x", "", " "])
      expect(read(`/today?shared=refused&reason=${encodeURIComponent(reason)}`), reason).toEqual({
        kind: "refused",
        reason: "generic",
      });
    // A refusal the import names that is no file's fault.
    expect(read(sharedLanding({ kind: "refused", reason: "notFound" }))).toEqual({
      kind: "refused",
      reason: "generic",
    });
  });

  it("says nothing for a word it does not know", () => {
    for (const shared of ["", "constructor", "__proto__", "IMPORTED", "imported "])
      expect(sharedWords(shared, undefined, undefined), shared).toBeNull();
    expect(sharedWords(undefined, "2", "bad_crc")).toBeNull();
  });

  it("counts between one and what a share can bring, whatever the address says", () => {
    const counted = (count: string | undefined) => sharedWords("imported", count, undefined);
    expect(counted(undefined)).toEqual({ kind: "imported", count: 1 });
    expect(counted("2")).toEqual({ kind: "imported", count: 2 });
    for (const count of ["0", "-4", "1e9", "two", "", "2.5", "9999999999999999999"])
      expect(counted(count), count).toEqual({ kind: "imported", count: 1 });
    expect(counted("999")).toEqual({ kind: "imported", count: MAX_SHARED_FILES });
  });
});

describe("the installed app as a share target", () => {
  const target = manifest().share_target;

  it("posts a form with the files to the route that imports them", async () => {
    expect(target).toMatchObject({
      action: "/api/share",
      method: "POST",
      enctype: "multipart/form-data",
    });
    const route = await import("@/app/api/share/route");
    expect(typeof route.POST).toBe("function");
  });

  it("takes every ending the upload reads, under the name the route reads", () => {
    const files = target?.params.files;
    const [entry] = Array.isArray(files) ? files : files ? [files] : [];
    expect(entry?.name).toBe("file");
    for (const ending of ACCEPTED_EXTENSIONS) expect(entry?.accept).toContain(ending);
    // A .fit file has no media type of its own on a phone.
    expect(entry?.accept).toContain("application/octet-stream");
  });
});
