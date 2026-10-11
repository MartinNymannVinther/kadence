import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { POST } from "@/app/api/ingest/route";
import { rateLimit, resetRateLimits } from "@/core/rate-limit";
import { DeviceHttpError } from "@/modules/devices/http";
import {
  FILES_READ_PER_HOUR,
  readFilesKey,
  readingNow,
  STORED_FILES_PER_HOUR,
  storedFilesKey,
} from "@/modules/devices/ingest";
import { readWithin, storedName } from "@/modules/devices/ingest-request";
import { createUploadKey, newUploadKey, removeUploadKey } from "@/modules/devices/upload-keys";
import { adminPool } from "../helpers/db";
import { bytesOf, gpx, zip } from "../files/fixtures";
import { check, ride, rideOn, seedIngestTeam, send, URL, type IngestTeam } from "./ingest-fixture";

/**
 * The limits of the upload key's door (docs/adr/0029): an address that
 * keeps guessing waits, and a key Kadence knows is served all the same;
 * the hour's files are the ones kept, and the hour's reading is counted
 * whatever the file turned out to be; both follow the person, not the
 * key; two files at once; a key that is removed brings nothing more in,
 * not even what was on its way; and a name a helper sent is only a name.
 */

const HOUR = 3_600_000;

let admin: Pool;
let team: IngestTeam;

const ridesOf = async (riderId: string) =>
  (await admin.query("select count(*)::int as n from activities where rider_id = $1", [riderId]))
    .rows[0].n as number;

beforeAll(async () => {
  admin = adminPool();
  team = await seedIngestTeam(admin, "inl");
  expect((await send(team.idaKey, ride, { name: "morgen.fit" })).status).toBe(201);
});

beforeEach(() => resetRateLimits());

afterAll(async () => {
  await admin.end();
});

describe("an address that keeps guessing", () => {
  const from = { "x-forwarded-for": "203.0.113.50" };

  it("is told to wait, and a key Kadence knows is served from the same address all the same", async () => {
    for (let i = 0; i < 20; i++)
      expect((await send(newUploadKey().key, ride, { headers: from })).status).toBe(401);
    const guessed = await send(newUploadKey().key, ride, { headers: from });
    expect(guessed.status).toBe(429);
    expect(Number(guessed.headers.get("retry-after"))).toBeGreaterThan(0);
    // A club house shares one address: the guessing of one is not the lock-out of all.
    expect((await send(team.idaKey, ride, { headers: from })).status).toBe(200);
    expect((await check(team.idaKey, from)).status).toBe(200);
  });

  it("is not held back by the right key used often", async () => {
    for (let i = 0; i < 25; i++)
      expect((await send(team.idaKey, ride, { headers: from })).status).toBe(200);
  });
});

describe("the hour's files", () => {
  it("are the ones kept: a ride Kadence has never uses the hour up", async () => {
    for (let i = 0; i < STORED_FILES_PER_HOUR; i++)
      await rateLimit(storedFilesKey(team.ida.userId), STORED_FILES_PER_HOUR, HOUR);
    const fresh = await send(team.idaKey, rideOn(6), { name: "ny.fit" });
    expect(fresh.status).toBe(429);
    expect(Number(fresh.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await fresh.json()).toEqual({ status: "refused", reason: "rate_limited" });
    // The ride that is there is still answered, and another rider is not held back.
    expect((await send(team.idaKey, ride, { name: "morgen.fit" })).status).toBe(200);
    expect((await send(team.mikkelKey, rideOn(6), { name: "ny.fit" })).status).toBe(201);
  });

  it("are counted per person, one for each ride kept", async () => {
    for (let i = 0; i < STORED_FILES_PER_HOUR - 1; i++)
      await rateLimit(storedFilesKey(team.ida.userId), STORED_FILES_PER_HOUR, HOUR);
    expect((await send(team.idaKey, ride)).status).toBe(200);
    expect((await send(team.idaKey, rideOn(7), { name: "sidste.fit" })).status).toBe(201);
    expect((await send(team.idaKey, rideOn(8), { name: "over.fit" })).status).toBe(429);
  });
});

describe("the hour's reading", () => {
  it("counts a file that was no ride", async () => {
    for (let i = 0; i < FILES_READ_PER_HOUR; i++)
      expect((await send(team.mikkelKey, bytesOf(`junk ${i}`))).status, String(i)).toBe(422);
    const next = await send(team.mikkelKey, bytesOf("junk again"));
    expect(next.status).toBe(429);
    expect(Number(next.headers.get("retry-after"))).toBeGreaterThan(0);
    // The other rider is not held back.
    expect((await send(team.idaKey, bytesOf("junk"))).status).toBe(422);
  });

  it("counts a file that was a ride Kadence has under other bytes", async () => {
    const before = await ridesOf(team.idaRider);
    for (let i = 0; i < FILES_READ_PER_HOUR; i++)
      await rateLimit(readFilesKey(team.ida.userId), FILES_READ_PER_HOUR, HOUR);
    // The same ride with a byte added: a new hash, the same start. It has to be read to be known.
    const padded = new Uint8Array(ride.byteLength + 1);
    padded.set(ride);
    expect((await send(team.idaKey, padded)).status).toBe(429);
    // The ride as Kadence has it costs a lookup, and is answered.
    expect((await send(team.idaKey, ride)).status).toBe(200);
    expect(await ridesOf(team.idaRider)).toBe(before);
  });

  it("follows the person: a key removed and made again starts nothing afresh", async () => {
    for (let i = 0; i < FILES_READ_PER_HOUR; i++)
      await rateLimit(readFilesKey(team.mikkel.userId), FILES_READ_PER_HOUR, HOUR);
    expect((await send(team.mikkelKey, bytesOf("junk"))).status).toBe(429);
    const again = await createUploadKey(team.mikkel, "En ny nøgle");
    expect((await send(again.key, bytesOf("junk"))).status).toBe(429);
    await removeUploadKey(team.mikkel, again.id);
  });
});

describe("two files at once is the most a person's keys are read for", () => {
  /** A body that arrives only when let go. */
  function held(key: string, bytes: Uint8Array) {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        await gate;
        controller.enqueue(new Uint8Array(bytes));
        controller.close();
      },
    });
    const response = POST(
      new Request(`${URL}?name=holdt.fit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: stream,
        duplex: "half",
      } as RequestInit),
    );
    return { response, release };
  }

  /** Waits for something that happens on its own, a few milliseconds at a time. */
  async function until(happened: () => Promise<boolean>) {
    for (let i = 0; i < 600 && !(await happened()); i++)
      await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await happened()).toBe(true);
  }

  it("answers the third with 429, whichever of the person's keys it comes with", async () => {
    const other = await createUploadKey(team.ida, "Telefon");
    const first = held(team.idaKey, rideOn(9));
    const second = held(other.key, rideOn(10));
    await until(async () => (await readingNow(team.ida.userId)) === 2);

    const third = await send(team.idaKey, rideOn(11), { name: "tredje.fit" });
    expect(third.status).toBe(429);
    expect(await third.json()).toEqual({ status: "refused", reason: "busy" });
    // Another rider is not in the queue.
    expect((await send(team.mikkelKey, rideOn(11), { name: "min.fit" })).status).toBe(201);

    first.release();
    second.release();
    expect((await first.response).status).toBe(201);
    expect((await second.response).status).toBe(201);
    expect(await readingNow(team.ida.userId)).toBe(0);
    expect((await send(team.idaKey, rideOn(11), { name: "tredje.fit" })).status).toBe(201);
    await removeUploadKey(team.ida, other.id);
  });

  it("lets go of a file that broke off on the way", async () => {
    const broken = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new Error("the cable was pulled"));
      },
    });
    const response = await POST(
      new Request(`${URL}?name=afbrudt.fit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${team.idaKey}` },
        body: broken,
        duplex: "half",
      } as RequestInit),
    );
    expect(response.status).toBe(400);
    expect(await readingNow(team.ida.userId)).toBe(0);
  });

  it("brings nothing in with a key that was removed while the file was on its way", async () => {
    const doomed = await createUploadKey(team.ida, "Skal fjernes");
    const before = await ridesOf(team.idaRider);
    const onItsWay = held(doomed.key, rideOn(20));
    await until(async () => (await readingNow(team.ida.userId)) === 1);
    await removeUploadKey(team.coach, doomed.id);
    onItsWay.release();

    const response = await onItsWay.response;
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ status: "refused", reason: "unauthorized" });
    expect(await ridesOf(team.idaRider)).toBe(before);
    expect(await readingNow(team.ida.userId)).toBe(0);
  });
});

describe("a file that does not arrive", () => {
  it("is given up at the deadline, and the wait is over", async () => {
    const never = new ReadableStream<Uint8Array>({ pull: () => new Promise(() => undefined) });
    const started = Date.now();
    await expect(readWithin(never, 1024, null, 40)).rejects.toMatchObject({ code: "timeout" });
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("is read whole when it comes in time, and refused past the cap", async () => {
    const whole = new Response(new Uint8Array(100)).body;
    expect((await readWithin(whole, 1024, null, 1_000)).byteLength).toBe(100);
    const big = new Response(new Uint8Array(2_000)).body;
    await expect(readWithin(big, 1024, null, 1_000)).rejects.toBeInstanceOf(DeviceHttpError);
    await expect(readWithin(null, 1024, "5000", 1_000)).rejects.toMatchObject({
      code: "too_large",
    });
  });
});

describe("a key that is removed", () => {
  it("is refused at once, for asking and for sending", async () => {
    expect((await check(team.idaKey)).status).toBe(200);
    await removeUploadKey(team.coach, team.idaKeyId);
    expect((await check(team.idaKey)).status).toBe(401);
    expect((await send(team.idaKey, rideOn(12), { name: "sent.fit" })).status).toBe(401);
  });
});

describe("the name a file is stored under", () => {
  it("is the last part of what was sent, printable and on one line", () => {
    expect(storedName("morgen.fit", ride)).toEqual({ name: "morgen.fit", own: true });
    expect(storedName("C:\\Garmin\\Activities\\2026-09-01.fit", ride).name).toBe("2026-09-01.fit");
    expect(storedName("../../etc/passwd", ride).name).toBe("passwd");
    expect(storedName("to\nlinjer\u0000.fit", ride).name).toBe("to linjer .fit");
    expect(storedName("x".repeat(300), ride).name).toHaveLength(200);
  });

  it("is named for what the file is when nothing was sent", () => {
    expect(storedName(null, ride)).toEqual({ name: "activity.fit", own: false });
    expect(storedName("  ", bytesOf(gpx(10)))).toEqual({ name: "activity.gpx", own: false });
    expect(storedName("folder/", zip([{ name: "a.fit", bytes: ride }])).name).toBe("activity.zip");
    expect(storedName(null, bytesOf("?")).name).toBe("activity");
  });
});
