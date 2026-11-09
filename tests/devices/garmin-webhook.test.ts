import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { resetRateLimits } from "@/core/rate-limit";
import { SPORT } from "@/modules/fit";
import { providerById } from "@/modules/devices/providers";
import { processEvent } from "@/modules/devices/webhooks";
import { adminPool } from "../helpers/db";
import { clearJobs, drainJobs, drainResults } from "../helpers/jobs";
import { encodeRide, steadyHour } from "../fit/fixtures";
import { bytes, fakeFetch, withProviderKeys } from "./fake-fetch";
import {
  CALLBACK,
  deliverGarmin as deliver,
  TOKEN_URL,
  FROM_GARMIN,
  postGarmin as post,
  seedGarminTeam,
} from "./garmin-fixture";

/**
 * A ride from Garmin on the Starter tier (docs/adr/0113), with simulated
 * pushes. A push is believed only with this client's id from Garmin's
 * addresses; every event in it is queued; a ride's file is downloaded
 * once and kept until it is imported, with the device and the sport
 * Garmin names; and a file Garmin will not hand over again is said on the
 * link. Deregistrations and permissions are garmin-events.test.ts.
 */

let admin: Pool;
let restore: () => void;
let link: (who: string) => Promise<Record<string, unknown>>;
const ride = encodeRide(steadyHour(), { sport: SPORT.cycling, timerSeconds: 3600 });

const file = (who: string, id: string, extra: Record<string, unknown> = {}) => ({
  activityFiles: [
    {
      userId: `gw-${who}`,
      summaryId: `${id}-file`,
      activityId: id,
      fileType: "FIT",
      callbackURL: `${CALLBACK}?id=${id}&token=once`,
      activityType: "ROAD_BIKING",
      deviceName: "Edge 1040",
      activityName: "Morgentur",
      startTimeInSeconds: 1_788_000_000,
      manual: false,
      ...extra,
    },
  ],
});

const inbox = async (who: string) =>
  (
    await admin.query("select count(*)::int as n from device_inbox where rider_id = $1", [
      `gw_${who}`,
    ])
  ).rows[0].n as number;

beforeAll(async () => {
  restore = withProviderKeys();
  admin = adminPool();
  ({ link } = await seedGarminTeam(admin, "gw", ["ida", "ole", "eva", "bo", "ulf"], ["ulf"]));
  await clearJobs();
});

beforeEach(() => resetRateLimits());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

afterAll(async () => {
  restore();
  await admin.end();
});

describe("a push that is not Garmin's", () => {
  it("is refused without this client's id, with another's, or from another address", async () => {
    const calls = fakeFetch({});
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const body = file("ida", "1");
    const { "garmin-client-id": _client, ...noClient } = FROM_GARMIN;
    expect((await post(body, noClient)).status).toBe(401);
    expect((await post(body, { ...FROM_GARMIN, "garmin-client-id": "not-ours" })).status).toBe(401);
    expect((await post(body, { ...FROM_GARMIN, "x-forwarded-for": "203.0.113.9" })).status).toBe(
      401,
    );
    const { rows } = await admin.query("select count(*)::int as n from jobs");
    expect(rows[0].n).toBe(0);
    expect(calls).toHaveLength(0);
  });
});

describe("a push with many events", () => {
  it("queues every one of them, past fifty", async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      userId: "gw-nobody",
      activityId: 5000 + i,
      fileType: "FIT",
      callbackURL: `${CALLBACK}?id=${5000 + i}`,
    }));
    expect((await post({ activityFiles: many })).status).toBe(200);
    const { rows } = await admin.query(
      "select count(*)::int as n from jobs where kind = 'device.fetch' and done_at is null",
    );
    expect(rows[0].n).toBe(60);
    expect(new Set(await drainResults(["device.fetch"]))).toEqual(new Set(["unknown_user"]));
  });
});

describe("a ride from Garmin", () => {
  it("lands with the device Garmin names and the sport of its activity type", async () => {
    const calls = fakeFetch({ [`GET ${CALLBACK}`]: () => bytes(ride) });
    const { status, outcomes } = await deliver(
      file("ida", "101", { activityType: "STRENGTH_TRAINING", deviceName: "Edge® 1040 Solar" }),
    );
    expect(status).toBe(200);
    expect(outcomes).toEqual(["imported"]);
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer acc-ida");
    const { rows } = await admin.query(
      "select source, sport, device_name, external_id from activities where rider_id = 'gw_ida'",
    );
    expect(rows).toEqual([
      { source: "garmin", sport: "strength", device_name: "Edge 1040 Solar", external_id: "101" },
    ]);
    expect(await inbox("ida")).toBe(0);
  });

  it("that Garmin will not hand over again is said on the link, and not tried again", async () => {
    fakeFetch({ [`GET ${CALLBACK}`]: () => new Response("gone", { status: 410 }) });
    const { outcomes } = await deliver(file("ole", "201"));
    expect(outcomes).toEqual(["gone"]);
    expect(await link("ole")).toMatchObject({ status: "connected", last_error: "download_gone" });
    const { rows } = await admin.query(
      "select count(*)::int as n from jobs where kind = 'device.fetch' and done_at is null",
    );
    expect(rows[0].n).toBe(0);
  });
});

describe("a ride while Garmin cannot renew the rider's token", () => {
  it("waits for the next try instead of giving the ride up", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const calls = fakeFetch({ [TOKEN_URL]: () => new Response("busy", { status: 503 }) });
    expect((await post(file("ulf", "501"))).status).toBe(200);
    expect(await drainJobs(["device.fetch"])).toMatchObject([{ outcome: "retry" }]);
    expect(calls.map((c) => c.method)).toEqual(["POST"]);
    expect(await link("ulf")).toMatchObject({
      status: "connected",
      last_error: "provider_unavailable",
    });
    await clearJobs();
  });
});

describe("a ride whose import fails after the download", () => {
  beforeAll(async () => {
    await admin.query(`
      create or replace function test_gw_fail() returns trigger language plpgsql as $$
      begin
        if new.external_id in ('301', '401') then raise exception 'test: the database is away'; end if;
        return new;
      end $$`);
    await admin.query(
      "create trigger test_gw_fail before insert on activities for each row execute function test_gw_fail()",
    );
  });

  afterAll(async () => {
    await admin.query("drop trigger if exists test_gw_fail on activities");
    await admin.query("drop function if exists test_gw_fail()");
  });

  it("is kept, and imported on the next try without asking Garmin again", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let downloads = 0;
    fakeFetch({
      [`GET ${CALLBACK}`]: () =>
        ++downloads === 1 ? bytes(ride) : new Response(null, { status: 410 }),
    });
    expect((await post(file("eva", "301"))).status).toBe(200);
    const [first] = await drainJobs(["device.fetch"]);
    expect(first).toMatchObject({ outcome: "retry" });
    expect(await inbox("eva")).toBe(1);

    await admin.query("drop trigger test_gw_fail on activities");
    await admin.query("update jobs set run_at = now() where id = $1", [first!.id]);
    expect(await drainJobs(["device.fetch"])).toMatchObject([
      { id: first!.id, outcome: "done", result: "imported" },
    ]);
    expect(downloads).toBe(1);
    expect(await inbox("eva")).toBe(0);
    const { rows } = await admin.query(
      "select sport, device_name from activities where rider_id = 'gw_eva'",
    );
    expect(rows).toEqual([{ sport: "bike", device_name: "Edge 1040" }]);
    await admin.query(
      "create trigger test_gw_fail before insert on activities for each row execute function test_gw_fail()",
    );
  });

  it("is let go on the last try, and the link says so", async () => {
    fakeFetch({ [`GET ${CALLBACK}`]: () => bytes(ride) });
    const notification = {
      externalUserId: "gw-bo",
      externalId: "401",
      url: `${CALLBACK}?id=401`,
      fileName: "Morgentur.fit",
    };
    const garmin = providerById("garmin");
    const event = { kind: "activity" as const, externalUserId: "gw-bo", notification };
    await expect(processEvent(garmin, event)).rejects.toThrow();
    expect(await inbox("bo")).toBe(1);
    await expect(processEvent(garmin, event, { lastTry: true })).rejects.toThrow();
    expect(await inbox("bo")).toBe(0);
    expect(await link("bo")).toMatchObject({ last_error: "import_failed" });
  });
});
