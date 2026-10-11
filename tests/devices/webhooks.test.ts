import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client, Pool } from "pg";
import { resetRateLimits } from "@/core/rate-limit";
import { POST } from "@/app/api/devices/[provider]/webhook/route";
import { SPORT } from "@/modules/fit";
import { linkOwner, saveLink } from "@/modules/devices/links";
import { handleWebhook, type WebhookOutcome } from "@/modules/devices/webhooks";
import { listSessions } from "@/modules/training/sessions";
import { adminPool, appClient, asApp } from "../helpers/db";
import { drainResults } from "../helpers/jobs";
import { insertSql, seedPerson } from "../helpers/rows";
import { encodeRide, steadyHour } from "../fit/fixtures";
import { bytes, fakeFetch, WEBHOOK_TOKEN, withProviderKeys } from "./fake-fetch";

/**
 * A ride saved on a Wahoo or a Garmin arrives by itself: the webhook is
 * verified, answered, and the file is fetched from the provider's own host
 * and imported as the rider — onto the planned session it fulfilled, in
 * the right rider's calendar, and nobody else's. A notification that is
 * not verified touches nothing; one about a user Kadence does not know is
 * answered 200 and ignored. The fixture ride starts 1 September 2026.
 */

const ORG = "org_dev_hooks";
const COACH = { orgId: ORG, userId: "user_dh_coach" };
const IDA = { orgId: ORG, userId: "user_dh_ida" };
const MIKKEL = { orgId: ORG, userId: "user_dh_mikkel" };
const DAY = "2026-09-01";
const FILE_URL = "https://cdn.wahooligan.com/wahoo-cloud/production/uploads/workout_file/ride.fit";

let admin: Pool;
let app: Client;
let restore: () => void;
const ride = encodeRide(steadyHour(), { sport: SPORT.cycling, timerSeconds: 3600 });

function wahooBody(overrides: Record<string, unknown> = {}) {
  return {
    event_type: "workout_summary",
    webhook_token: WEBHOOK_TOKEN,
    user: { id: 80001 },
    workout_summary: { id: 9001, file: { url: FILE_URL }, workout: { name: "Morgentur" } },
    ...overrides,
  };
}

const post = (provider: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost:3000/api/devices/${provider}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

/** Posts a notification, then runs the jobs it queued as the worker would, and hands back their outcomes. */
async function deliver(provider: string, body: unknown, headers?: Record<string, string>) {
  const response = await handleWebhook(provider, post(provider, body, headers));
  const outcomes = (await drainResults(["device.fetch"])) as WebhookOutcome[];
  return { status: response.status, outcomes };
}

beforeAll(async () => {
  restore = withProviderKeys();
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [IDA, MIKKEL]) await seedPerson(admin, ORG, p.userId, "member");
  for (const [id, uid] of [
    ["dh_ida", IDA.userId],
    ["dh_mikkel", MIKKEL.userId],
  ]) {
    const q = insertSql("riders", {
      org_id: ORG,
      id,
      user_id: uid,
      name: id,
      birth_year: 2008,
      ftp_watts: 250,
    });
    await admin.query(q.text, q.values);
  }
  for (const [id, rider] of [
    ["dh_ida_session", "dh_ida"],
    ["dh_mikkel_session", "dh_mikkel"],
  ]) {
    const s = insertSql("planned_sessions", {
      org_id: ORG,
      id,
      rider_id: rider,
      on_date: DAY,
      sport: "bike",
      title: "Grundtur",
      planned_minutes: 60,
    });
    await admin.query(s.text, s.values);
  }
  const later = new Date(Date.now() + 3600_000);
  await saveLink(IDA, "wahoo", "80001", {
    accessToken: "w-ida",
    refreshToken: null,
    expiresAt: later,
  });
  await saveLink(MIKKEL, "wahoo", "80002", {
    accessToken: "w-mik",
    refreshToken: null,
    expiresAt: later,
  });
  await saveLink(MIKKEL, "garmin", "g-mikkel", {
    accessToken: "g-mik",
    refreshToken: "g-mik-ref",
    expiresAt: later,
  });
});

beforeEach(() => resetRateLimits());
afterEach(() => vi.unstubAllGlobals());

afterAll(async () => {
  restore();
  await app.end();
  await admin.end();
});

describe("verification", () => {
  it("answers 401 to a Wahoo webhook with the wrong token, and touches nothing", async () => {
    const calls = fakeFetch({});
    const response = await POST(post("wahoo", wahooBody({ webhook_token: "guess" })), {
      params: Promise.resolve({ provider: "wahoo" }),
    });
    expect(response.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("answers 401 without a token at all, 400 to what is not JSON, 404 to an unknown provider", async () => {
    const unsigned = wahooBody({ webhook_token: undefined });
    const params = (provider: string) => ({ params: Promise.resolve({ provider }) });
    expect((await POST(post("wahoo", unsigned), params("wahoo"))).status).toBe(401);
    expect((await POST(post("wahoo", "{not json"), params("wahoo"))).status).toBe(400);
    expect((await POST(post("strava", wahooBody()), params("strava"))).status).toBe(404);
  });

  it("refuses a body over the cap", async () => {
    const huge = JSON.stringify({ ...wahooBody(), pad: "x".repeat(300 * 1024) });
    expect((await deliver("wahoo", huge)).status).toBe(413);
  });
});

describe("a Wahoo ride", () => {
  it("is fetched from Wahoo's CDN and lands on the right rider's planned session", async () => {
    const calls = fakeFetch({ [`GET ${FILE_URL}`]: () => bytes(ride) });
    const { status, outcomes } = await deliver("wahoo", wahooBody());
    expect(status).toBe(200);
    expect(outcomes).toEqual(["imported"]);
    // The CDN gets no token.
    expect(calls[0]!.headers.get("authorization")).toBeNull();

    const [session] = await listSessions(COACH, { from: DAY, to: DAY, riderIds: ["dh_ida"] });
    expect(session!.activity).toMatchObject({ source: "wahoo", loadMethod: "power" });
    const { rows } = await admin.query(
      "select rider_id, title, external_id, created_by from activities where source = 'wahoo'",
    );
    expect(rows).toEqual([
      { rider_id: "dh_ida", title: "Morgentur", external_id: "9001", created_by: IDA.userId },
    ]);
    const [mikkels] = await listSessions(COACH, { from: DAY, to: DAY, riderIds: ["dh_mikkel"] });
    expect(mikkels!.activity).toBeNull();

    const link = await admin.query(
      "select last_sync_at, last_error from device_links where rider_id = 'dh_ida'",
    );
    expect(link.rows[0].last_sync_at).not.toBeNull();
    expect(link.rows[0].last_error).toBe("");
  });

  it("is answered 200 and changes nothing the second time", async () => {
    fakeFetch({ [`GET ${FILE_URL}`]: () => bytes(ride) });
    const { status, outcomes } = await deliver("wahoo", wahooBody());
    expect(status).toBe(200);
    expect(outcomes).toEqual(["duplicate"]);
    const { rows } = await admin.query(
      "select count(*)::int as n from activities where source = 'wahoo'",
    );
    expect(rows[0].n).toBe(1);
  });

  it("from a user Kadence does not know is answered 200 and ignored", async () => {
    const calls = fakeFetch({});
    const { status, outcomes } = await deliver("wahoo", wahooBody({ user: { id: 99999 } }));
    expect(status).toBe(200);
    expect(outcomes).toEqual(["unknown_user"]);
    expect(calls).toHaveLength(0);
  });

  it("with a file on a foreign host is never fetched", async () => {
    const calls = fakeFetch({});
    const { status, outcomes } = await deliver(
      "wahoo",
      wahooBody({
        user: { id: 80002 },
        workout_summary: { id: 9002, file: { url: "https://evil.example/ride.fit" } },
      }),
    );
    expect(status).toBe(200);
    expect(outcomes).toEqual(["download_failed"]);
    expect(calls).toHaveLength(0);
    const link = await admin.query(
      "select status, last_error from device_links where rider_id = 'dh_mikkel' and provider = 'wahoo'",
    );
    expect(link.rows[0]).toEqual({ status: "connected", last_error: "download_forbidden_host" });
  });

  it("that is not a FIT file is noted on the link, not imported", async () => {
    fakeFetch({ [`GET ${FILE_URL}`]: () => bytes(new TextEncoder().encode("not a fit file")) });
    const { outcomes } = await deliver(
      "wahoo",
      wahooBody({ user: { id: 80002 }, workout_summary: { id: 9003, file: { url: FILE_URL } } }),
    );
    expect(outcomes).toEqual(["invalid_file"]);
  });
});

describe("a Garmin ping", () => {
  const ping = (userId: string, callbackURL: string) => ({
    activityFiles: [{ userId, summaryId: "s-1", activityId: 555, fileType: "FIT", callbackURL }],
  });
  const CALLBACK = "https://apis.garmin.com/wellness-api/rest/activityFile";

  it("fetches the file from Garmin with the rider's token and imports it as the rider", async () => {
    const calls = fakeFetch({ [`GET ${CALLBACK}`]: () => bytes(ride) });
    const { status, outcomes } = await deliver("garmin", ping("g-mikkel", `${CALLBACK}?id=555`));
    expect(status).toBe(200);
    expect(outcomes).toEqual(["imported"]);
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer g-mik");
    const [session] = await listSessions(COACH, { from: DAY, to: DAY, riderIds: ["dh_mikkel"] });
    expect(session!.activity).toMatchObject({ source: "garmin" });
  });

  it("is refused when it names another client", async () => {
    const { status } = await deliver("garmin", ping("g-mikkel", `${CALLBACK}?id=556`), {
      "garmin-client-id": "not-ours",
    });
    expect(status).toBe(401);
  });

  it("cannot disconnect a rider while Garmin still accepts the rider's token", async () => {
    fakeFetch({
      "GET https://apis.garmin.com/wellness-api/rest/user/id": () =>
        new Response(JSON.stringify({ userId: "g-mikkel" }), { status: 200 }),
    });
    const { outcomes } = await deliver("garmin", { deregistrations: [{ userId: "g-mikkel" }] });
    expect(outcomes).toEqual(["still_connected"]);
    const link = await admin.query(
      "select status from device_links where rider_id = 'dh_mikkel' and provider = 'garmin'",
    );
    expect(link.rows[0].status).toBe("connected");
  });
});

describe("device_link_owner", () => {
  it("names the team, the rider and the account of a connected link, and nothing else", async () => {
    const rows = await asApp(app, null, (c) =>
      c.query("select * from device_link_owner('wahoo', '80001')"),
    );
    expect(rows.rows).toEqual([{ org_id: ORG, rider_id: "dh_ida", rider_user_id: IDA.userId }]);
    expect(await linkOwner("wahoo", "80001")).toEqual({
      orgId: ORG,
      riderId: "dh_ida",
      riderUserId: IDA.userId,
    });
  });

  it("returns nothing for another provider's id or a link that is not connected", async () => {
    expect(await linkOwner("garmin", "80001")).toBeNull();
    await admin.query(
      "update device_links set status = 'error' where rider_id = 'dh_mikkel' and provider = 'garmin'",
    );
    expect(await linkOwner("garmin", "g-mikkel")).toBeNull();
    await admin.query(
      "update device_links set status = 'revoked' where rider_id = 'dh_mikkel' and provider = 'wahoo'",
    );
    expect(await linkOwner("wahoo", "80002")).toBeNull();
  });

  it("returns nothing for a rider who is no longer on the team", async () => {
    await admin.query("delete from memberships where user_id = $1", [IDA.userId]);
    try {
      expect(await linkOwner("wahoo", "80001")).toBeNull();
    } finally {
      await seedPerson(admin, ORG, IDA.userId, "member");
    }
  });

  it("cannot be called by the auth role", async () => {
    const { rows } = await admin.query(
      `select has_function_privilege('kadence_auth', 'device_link_owner(text, text)', 'execute') as auth,
              has_function_privilege('public', 'device_link_owner(text, text)', 'execute') as anyone`,
    );
    expect(rows[0]).toEqual({ auth: false, anyone: false });
  });
});
