import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { openSecret } from "@/core/crypto/secret-box";
import { resetRateLimits } from "@/core/rate-limit";
import { finishConnect, startConnect } from "@/modules/devices/connect";
import { disconnect } from "@/modules/devices/disconnect";
import { polarSignature } from "@/modules/devices/polar";
import { handleWebhook, type WebhookOutcome } from "@/modules/devices/webhooks";
import { SPORT } from "@/modules/fit";
import { listSessions } from "@/modules/training/sessions";
import { adminPool } from "../helpers/db";
import { drainResults } from "../helpers/jobs";
import { insertSql, seedPerson } from "../helpers/rows";
import { encodeRide, steadyHour } from "../fit/fixtures";
import { bytes, fakeFetch, json, POLAR_SECRET, withProviderKeys } from "./fake-fetch";

/**
 * Polar end to end: a rider connects (OAuth, then the registration
 * AccessLink requires), a signed EXERCISE notification brings the ride in
 * as the rider onto the planned session it fulfilled, an unsigned one
 * touches nothing, a ping is answered and does nothing, an unknown user is
 * ignored, and disconnecting de-registers the user at Polar. The fixture
 * ride starts 1 September 2026.
 */

const ORG = "org_dev_polar";
const COACH = { orgId: ORG, userId: "user_pol_coach" };
const IDA = { orgId: ORG, userId: "user_pol_ida" };
const DAY = "2026-09-01";
const TOKEN = "https://polarremote.com/v2/oauth2/token";
const USERS = "https://www.polaraccesslink.com/v3/users";
const FIT = "https://www.polaraccesslink.com/v3/exercises/aQlC83/fit";

let admin: Pool;
let restore: () => void;
const ride = encodeRide(steadyHour(), { sport: SPORT.cycling, timerSeconds: 3600 });

async function linkRow() {
  const { rows } = await admin.query(
    "select * from device_links where rider_id = 'pol_ida' and provider = 'polar'",
  );
  return rows[0] as Record<string, unknown> | undefined;
}

/** Posts a notification, signed unless told otherwise, and runs the jobs it queued as the worker would. */
async function deliver(body: unknown, headers: Record<string, string> = {}, sign = true) {
  const raw = JSON.stringify(body);
  const signature = polarSignature(new TextEncoder().encode(raw), POLAR_SECRET);
  const request = new Request("http://localhost:3000/api/devices/polar/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sign ? { "Polar-Webhook-Signature": signature } : {}),
      ...headers,
    },
    body: raw,
  });
  const response = await handleWebhook("polar", request);
  const outcomes = (await drainResults(["device.fetch"])) as WebhookOutcome[];
  return { status: response.status, outcomes };
}

const exercise = (userId: number) => ({
  event: "EXERCISE",
  user_id: userId,
  entity_id: "aQlC83",
  timestamp: "2026-09-01T08:00:00Z",
  url: "https://www.polaraccesslink.com/v3/exercises/aQlC83",
});

beforeAll(async () => {
  restore = withProviderKeys();
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, IDA.userId, "member");
  const q = insertSql("riders", {
    org_id: ORG,
    id: "pol_ida",
    user_id: IDA.userId,
    name: "Ida",
    birth_year: 2008,
    ftp_watts: 250,
  });
  await admin.query(q.text, q.values);
  const s = insertSql("planned_sessions", {
    org_id: ORG,
    id: "pol_ida_session",
    rider_id: "pol_ida",
    on_date: DAY,
    sport: "bike",
    title: "Grundtur",
    planned_minutes: 60,
  });
  await admin.query(s.text, s.values);
});

beforeEach(() => resetRateLimits());
afterEach(() => vi.unstubAllGlobals());

afterAll(async () => {
  restore();
  await admin.end();
});

describe("connecting Polar", () => {
  it("exchanges the code, registers the user, and stores the sealed token as the rider's", async () => {
    const calls = fakeFetch({
      [`POST ${TOKEN}`]: () =>
        json({ access_token: "p-ida", token_type: "bearer", expires_in: 31535999, x_user_id: 475 }),
      [`POST ${USERS}`]: () => json({ "polar-user-id": 475 }),
    });
    const started = await startConnect(IDA, "polar");
    const url = new URL(started.location);
    expect(url.origin + url.pathname).toBe("https://flow.polar.com/oauth2/authorization");
    expect(url.searchParams.has("code_challenge")).toBe(false);

    const location = await finishConnect(
      IDA,
      "polar",
      { code: "the-code", state: url.searchParams.get("state") },
      started.cookie!.value,
    );
    expect(location).toBe("/settings/devices?connected=polar");
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([`POST ${TOKEN}`, `POST ${USERS}`]);
    expect(calls[1]!.headers.get("authorization")).toBe("Bearer p-ida");

    const row = await linkRow();
    expect(row).toMatchObject({ external_user_id: "475", status: "connected" });
    expect(row!.refresh_token_sealed).toBeNull();
    expect(openSecret(String(row!.access_token_sealed), "device-link:pol_ida:polar")).toBe("p-ida");
  });

  it("stores nothing when the registration fails", async () => {
    await admin.query("delete from device_links where rider_id = 'pol_ida'");
    fakeFetch({
      [`POST ${TOKEN}`]: () => json({ access_token: "p-x", expires_in: 100, x_user_id: 475 }),
      [`POST ${USERS}`]: () => json({}, 403),
    });
    const started = await startConnect(IDA, "polar");
    const state = new URL(started.location).searchParams.get("state");
    expect(await finishConnect(IDA, "polar", { code: "c", state }, started.cookie!.value)).toBe(
      "/settings/devices?error=exchange_failed",
    );
    expect(await linkRow()).toBeUndefined();

    // Connected again for what follows; already registered (409) is fine.
    fakeFetch({
      [`POST ${TOKEN}`]: () =>
        json({ access_token: "p-ida", expires_in: 31535999, x_user_id: 475 }),
      [`POST ${USERS}`]: () => json({}, 409),
    });
    const again = await startConnect(IDA, "polar");
    const state2 = new URL(again.location).searchParams.get("state");
    expect(
      await finishConnect(IDA, "polar", { code: "c2", state: state2 }, again.cookie!.value),
    ).toBe("/settings/devices?connected=polar");
  });
});

describe("a Polar notification", () => {
  it("that is not signed, or signed wrongly, is a 401 and touches nothing", async () => {
    const calls = fakeFetch({});
    expect((await deliver(exercise(475), {}, false)).status).toBe(401);
    const forged = { "Polar-Webhook-Signature": "a".repeat(64) };
    expect((await deliver(exercise(475), forged, false)).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("that is AccessLink's ping is answered 200 and does nothing", async () => {
    const calls = fakeFetch({});
    const ping = await deliver(
      { event: "PING", timestamp: "2026-09-27T10:00:00Z" },
      {
        "Polar-Webhook-Event": "PING",
      },
      false,
    );
    expect(ping).toEqual({ status: 200, outcomes: [] });
    expect(calls).toHaveLength(0);
  });

  it("brings the ride in as the rider, onto the planned session", async () => {
    const calls = fakeFetch({ [`GET ${FIT}`]: () => bytes(ride) });
    const { status, outcomes } = await deliver(exercise(475), {
      "Polar-Webhook-Event": "EXERCISE",
    });
    expect(status).toBe(200);
    expect(outcomes).toEqual(["imported"]);
    expect(calls.map((c) => c.url)).toEqual([FIT]);
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer p-ida");

    const [session] = await listSessions(COACH, { from: DAY, to: DAY, riderIds: ["pol_ida"] });
    expect(session!.activity).toMatchObject({ source: "polar" });
    const { rows } = await admin.query(
      "select rider_id, external_id, created_by from activities where source = 'polar'",
    );
    expect(rows).toEqual([{ rider_id: "pol_ida", external_id: "aQlC83", created_by: IDA.userId }]);
    expect((await linkRow())!.last_sync_at).not.toBeNull();
  });

  it("the second time is a duplicate and changes nothing", async () => {
    fakeFetch({ [`GET ${FIT}`]: () => bytes(ride) });
    expect((await deliver(exercise(475))).outcomes).toEqual(["duplicate"]);
  });

  it("about a user Kadence does not know is answered 200 and ignored", async () => {
    const calls = fakeFetch({});
    expect(await deliver(exercise(999))).toEqual({ status: 200, outcomes: ["unknown_user"] });
    expect(calls).toHaveLength(0);
  });
});

describe("disconnecting Polar", () => {
  it("de-registers the user at Polar with the rider's token, then deletes the link", async () => {
    const calls = fakeFetch({
      [`DELETE ${USERS}/475`]: () => new Response(null, { status: 204 }),
    });
    await disconnect(IDA, "polar");
    expect(calls.map((c) => [c.method, c.url, c.headers.get("authorization")])).toEqual([
      ["DELETE", `${USERS}/475`, "Bearer p-ida"],
    ]);
    expect(await linkRow()).toBeUndefined();
  });
});
