import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { rateLimit, resetRateLimits } from "@/core/rate-limit";
import { ARCHIVE_REQUESTS_PER_MINUTE, archiveMinuteKey, MINUTE } from "@/modules/devices/archive";
import { MAX_UPLOAD_BYTES } from "@/modules/devices/import";
import { signedInReads } from "@/modules/devices/in-flight";
import { SPORT } from "@/modules/fit";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";
import { encodeRide, steadyHour } from "../fit/fixtures";

/**
 * How the archive's door reads a body (docs/adr/0030): not at all for
 * someone who may not write for the rider, two at a time for a person
 * across the signed-in doors, within its size, and thirty requests a
 * minute — the next told to wait, not that the day is over.
 */

const auth = vi.hoisted(() => ({ session: null as { orgId: string; userId: string } | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => auth.session }));

const { POST } = await import("@/app/api/activities/archive/route");

const ORG = "org_archive_door";
const COACH = { orgId: ORG, userId: "user_ad_coach" };
const IDA = { orgId: ORG, userId: "user_ad_ida" };
const PARENT = { orgId: ORG, userId: "user_ad_parent" };
const URL = "http://localhost:3000/api/activities/archive";
const RIDER = { riderId: "ad_ida", only: "bike" };

let admin: Pool;
let day = 80;
/** A ride on the bike Kadence has not seen, a day later than the last, gzipped as Strava keeps it. */
function nextRide() {
  const days = day++;
  const samples = steadyHour().map((sample) => ({ ...sample, s: sample.s + days * 86_400 }));
  return new Uint8Array(
    gzipSync(encodeRide(samples, { sport: SPORT.cycling, timerSeconds: 3600 })),
  );
}

const at = (params: Record<string, string>) => `${URL}?${new URLSearchParams(params)}`;

function send(name: string, bytes: Uint8Array) {
  const form = new FormData();
  form.append("file", new File([bytes as Uint8Array<ArrayBuffer>], name));
  form.append("title", "");
  return POST(new Request(at(RIDER), { method: "POST", body: form }));
}

/** A body that is read only when let go, and says whether anyone began to read it. */
function held(bytes: Uint8Array) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const state = { pulled: false };
  const form = new FormData();
  form.append("file", new File([bytes as Uint8Array<ArrayBuffer>], "holdt.fit.gz"));
  form.append("title", "");
  const encoded = new Response(form);
  const stream = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        state.pulled = true;
        await gate;
        controller.enqueue(new Uint8Array(await encoded.arrayBuffer()));
        controller.close();
      },
    },
    // Nothing is pulled before someone reads.
    { highWaterMark: 0 },
  );
  const response = POST(
    new Request(at(RIDER), {
      method: "POST",
      headers: { "content-type": encoded.headers.get("content-type")! },
      body: stream,
      duplex: "half",
    } as RequestInit),
  );
  return { response, release, state };
}

/** Waits for something that happens on its own, a few milliseconds at a time. */
async function until(happened: () => boolean) {
  for (let i = 0; i < 600 && !happened(); i++)
    await new Promise((resolve) => setTimeout(resolve, 5));
  expect(happened()).toBe(true);
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [IDA, PARENT]) await seedPerson(admin, ORG, p.userId, "member");
  const r = insertSql("riders", {
    org_id: ORG,
    id: "ad_ida",
    user_id: IDA.userId,
    name: "Ida",
    birth_year: 2009,
  });
  await admin.query(r.text, r.values);
  const g = insertSql("guardians", {
    org_id: ORG,
    rider_id: "ad_ida",
    user_id: PARENT.userId,
    name: "Mor",
    confirmed_at: new Date(),
  });
  await admin.query(g.text, g.values);
});

beforeEach(() => {
  resetRateLimits();
  auth.session = IDA;
});

afterAll(async () => {
  await admin.end();
});

describe("the body of a request", () => {
  it("is not read for someone who may not write for the rider", async () => {
    auth.session = PARENT;
    const { response, state } = held(nextRide());
    expect((await response).status).toBe(403);
    expect(state.pulled).toBe(false);
    expect(signedInReads.count(PARENT.userId)).toBe(0);
  });

  it("is read two at a time for a person, and a third is told to wait", async () => {
    const first = held(nextRide());
    const second = held(nextRide());
    await until(() => signedInReads.count(IDA.userId) === 2);

    const third = await send("n3.fit.gz", nextRide());
    expect(third.status).toBe(429);
    expect(await third.json()).toEqual({ error: "busy", retryAfterSeconds: 5 });
    expect(Number(third.headers.get("retry-after"))).toBe(5);
    // Another person is not in the queue.
    auth.session = COACH;
    expect((await send("n4.fit.gz", nextRide())).status).toBe(200);

    first.release();
    second.release();
    expect((await first.response).status).toBe(200);
    expect((await second.response).status).toBe(200);
    expect(signedInReads.count(IDA.userId)).toBe(0);
  });

  it("that breaks off on the way gives its place back", async () => {
    const broken = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new Error("the lid was closed"));
      },
    });
    const response = await POST(
      new Request(at(RIDER), {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=x" },
        body: broken,
        duplex: "half",
      } as RequestInit),
    );
    expect(response.status).toBe(400);
    expect(signedInReads.count(IDA.userId)).toBe(0);
  });

  it("that says it is larger than three rides is refused before it is read", async () => {
    const big = await POST(
      new Request(at(RIDER), {
        method: "POST",
        headers: { "content-length": String(MAX_UPLOAD_BYTES * 3 + 64 * 1024 + 1) },
        body: "x",
      }),
    );
    expect(big.status).toBe(413);
  });
});

describe("the minute's requests", () => {
  it("are thirty; the next is told to wait, not that the day is over", async () => {
    for (let i = 0; i < ARCHIVE_REQUESTS_PER_MINUTE; i++)
      rateLimit(archiveMinuteKey(IDA.userId), ARCHIVE_REQUESTS_PER_MINUTE, MINUTE);
    const response = await send("o1.fit.gz", nextRide());
    expect(response.status).toBe(429);
    const answer = await response.json();
    expect(answer.error).toBe("busy");
    expect(answer.retryAfterSeconds).toBeGreaterThan(0);
    expect(answer.retryAfterSeconds).toBeLessThanOrEqual(60);
  });
});
