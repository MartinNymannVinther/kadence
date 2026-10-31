import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Client, Pool } from "pg";
import { openSecret } from "@/core/crypto/secret-box";
import { enqueue } from "@/core/jobs/queue";
import { finishConnect, startConnect } from "@/modules/devices/connect";
import { saveLink } from "@/modules/devices/links";
import { deviceRefresh, renewGarminLinks, RENEW_AHEAD_MS } from "@/modules/devices/refresh-job";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { clearJobs, drainJobs } from "../helpers/jobs";
import { insertSql, seedPerson } from "../helpers/rows";
import { fakeFetch, formOf, json, withProviderKeys } from "./fake-fetch";

/**
 * A Garmin link that lasts (docs/adr/0113): connecting reads what the
 * rider granted and when the refresh token runs out, and the daily job
 * renews a link before it does — so a rider who rides nothing all winter
 * still has a link in spring — and reads permissions nobody has read.
 * Refreshing asks Garmin for no data. A link Garmin will not renew is
 * left for the rider to connect again.
 */

const ORG = "org_gl";
const PEOPLE = ["ane", "due", "far", "new", "bad", "old"] as const;
const ctx = (who: string) => ({ orgId: ORG, userId: `user_gl_${who}` });
const TOKEN = "POST https://diauth.garmin.com/di-oauth2-service/oauth/token";
const ID_URL = "GET https://apis.garmin.com/partner-gateway/rest/user/id";
const PERMISSIONS_URL = "GET https://apis.garmin.com/partner-gateway/rest/user/permissions";
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date();

let admin: Pool;
let app: Client;
let restore: () => void;

async function link(who: string) {
  const { rows } = await admin.query(
    "select * from device_links where rider_id = $1 and provider = 'garmin'",
    [`gl_${who}`],
  );
  return rows[0] as Record<string, unknown>;
}

beforeAll(async () => {
  restore = withProviderKeys();
  admin = adminPool();
  app = await appClient();
  for (const who of PEOPLE) {
    await seedPerson(admin, ORG, `user_gl_${who}`, "member");
    const q = insertSql("riders", {
      org_id: ORG,
      id: `gl_${who}`,
      user_id: `user_gl_${who}`,
      name: who,
      birth_year: 2008,
    });
    await admin.query(q.text, q.values);
  }
  const at = (days: number) => new Date(NOW.getTime() + days * DAY);
  const save = (who: string, refreshIn: number, permissions: string[] | null) =>
    saveLink(
      ctx(who),
      "garmin",
      `gl-${who}`,
      {
        accessToken: `acc-${who}`,
        refreshToken: `ref-${who}`,
        expiresAt: at(1),
        refreshExpiresAt: at(refreshIn),
      },
      permissions,
    );
  await save("due", 5, ["ACTIVITY_EXPORT"]);
  await save("far", 60, ["ACTIVITY_EXPORT"]);
  await save("new", 60, null);
  await save("bad", 3, ["ACTIVITY_EXPORT"]);
  await save("old", 2, ["ACTIVITY_EXPORT"]);
  await admin.query("update riders set archived = true where id = 'gl_old'");
  await clearJobs();
});

afterEach(() => vi.unstubAllGlobals());

afterAll(async () => {
  restore();
  await app.end();
  await admin.end();
});

describe("connecting Garmin", () => {
  it("stores what the rider granted and when the refresh token runs out", async () => {
    const calls = fakeFetch({
      [TOKEN]: () =>
        json({
          access_token: "acc-ane",
          refresh_token: "ref-ane",
          expires_in: 86_400,
          token_type: "bearer",
          refresh_token_expires_in: 7_775_998,
        }),
      [ID_URL]: () => json({ userId: "gl-ane" }),
      [PERMISSIONS_URL]: () => json({ permissions: ["WORKOUT_IMPORT", "ACTIVITY_EXPORT", 7] }),
    });
    const started = await startConnect(ctx("ane"), "garmin", NOW, { given: true, locale: "da" });
    const state = new URL(started.location).searchParams.get("state")!;
    const location = await finishConnect(
      ctx("ane"),
      "garmin",
      { code: "the-code", state },
      started.cookie!.value,
    );
    expect(location).toBe("/settings/devices?connected=garmin");
    expect(formOf(calls[0]!)).toMatchObject({ grant_type: "authorization_code" });
    expect(calls.map((c) => c.url)).toEqual([
      "https://diauth.garmin.com/di-oauth2-service/oauth/token",
      "https://apis.garmin.com/partner-gateway/rest/user/id",
      "https://apis.garmin.com/partner-gateway/rest/user/permissions",
    ]);
    const row = await link("ane");
    expect(row).toMatchObject({
      external_user_id: "gl-ane",
      permissions: ["ACTIVITY_EXPORT", "WORKOUT_IMPORT"],
    });
    const left = (row.refresh_expires_at as Date).getTime() - Date.now();
    expect(left).toBeGreaterThan(89 * DAY);
    expect(left).toBeLessThan(91 * DAY);
  });

  it("connects all the same when the permissions cannot be read", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await admin.query("delete from device_links where rider_id = 'gl_ane'");
    fakeFetch({
      [TOKEN]: () =>
        json({ access_token: "acc-ane", refresh_token: "ref-ane", expires_in: 86_400 }),
      [ID_URL]: () => json({ userId: "gl-ane" }),
      [PERMISSIONS_URL]: () => new Response(null, { status: 503 }),
    });
    const started = await startConnect(ctx("ane"), "garmin", NOW, { given: true, locale: "da" });
    const state = new URL(started.location).searchParams.get("state")!;
    expect(
      await finishConnect(ctx("ane"), "garmin", { code: "c", state }, started.cookie!.value),
    ).toBe("/settings/devices?connected=garmin");
    expect(await link("ane")).toMatchObject({ permissions: null, refresh_expires_at: null });
    vi.restoreAllMocks();
  });
});

describe("the daily renewal", () => {
  it("renews links near their end, reads unknown permissions, and leaves the rest", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    // Links of other test files may be due too; this team's are what is asserted.
    const mine = (refreshToken: string | undefined) =>
      /^ref-(due|far|new|bad|old)$/.test(refreshToken ?? "");
    const calls = fakeFetch({
      [TOKEN]: (call) => {
        const form = formOf(call);
        if (form.refresh_token === "ref-bad") return json({ error: "invalid_grant" }, 400);
        return json({
          access_token: `${form.refresh_token}-acc-2`,
          refresh_token: `${form.refresh_token}-2`,
          expires_in: 86_400,
          refresh_token_expires_in: 7_776_000,
        });
      },
      [PERMISSIONS_URL]: () => json({ permissions: ["ACTIVITY_EXPORT", "WORKOUT_IMPORT"] }),
    });
    await admin.query("delete from device_links where rider_id = 'gl_ane'");
    const run = await renewGarminLinks(NOW);
    expect(run.renewed).toBeGreaterThanOrEqual(1);
    expect(run.permissions).toBeGreaterThanOrEqual(1);
    expect(run.failed).toBeGreaterThanOrEqual(1);

    // Refreshing is all it asked for this team: two tokens, and one rider's permissions.
    const refreshed = calls
      .filter((c) => c.method === "POST")
      .map((c) => formOf(c))
      .filter((f) => mine(f.refresh_token));
    expect(refreshed.map((f) => f.refresh_token).sort()).toEqual(["ref-bad", "ref-due"]);
    expect(refreshed.every((f) => f.grant_type === "refresh_token")).toBe(true);
    const asked = calls.filter((c) => c.url.includes("partner-gateway"));
    expect(asked.map((c) => c.headers.get("authorization"))).toContain("Bearer acc-new");
    expect(asked.map((c) => c.headers.get("authorization"))).not.toContain("Bearer acc-due");

    const due = await link("due");
    expect(openSecret(String(due.refresh_token_sealed), "device-link:gl_due:garmin")).toBe(
      "ref-due-2",
    );
    expect((due.refresh_expires_at as Date).getTime()).toBeGreaterThan(NOW.getTime() + 80 * DAY);
    const sealedOf = async (who: string) =>
      openSecret(String((await link(who)).refresh_token_sealed), `device-link:gl_${who}:garmin`);
    expect(await sealedOf("far")).toBe("ref-far");
    expect((await link("new")).permissions).toEqual(["ACTIVITY_EXPORT", "WORKOUT_IMPORT"]);
    expect(await link("bad")).toMatchObject({ status: "error", last_error: "refresh_failed" });
    // An archived rider is not acted for.
    expect(await sealedOf("old")).toBe("ref-old");
    vi.restoreAllMocks();
  });

  it("runs as a job every day, renewing a link two weeks before its end", async () => {
    expect(deviceRefresh.every).toBe(24 * 60 * 60 * 1000);
    expect(RENEW_AHEAD_MS).toBe(14 * DAY);
    fakeFetch({});
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await enqueue(deviceRefresh, {}, { dedupeKey: "recurring" });
    const [run] = await drainJobs(["device.refresh"]);
    expect(run).toMatchObject({ outcome: "done" });
    expect(Object.keys(run!.result as object).sort()).toEqual(["failed", "permissions", "renewed"]);
    vi.restoreAllMocks();
  });
});

describe("device_links_to_renew", () => {
  it("names three ids and two answers, and nothing from inside a workspace", async () => {
    const { rows } = await asApp(app, null, (c) =>
      c.query("select * from device_links_to_renew('garmin', now() + interval '400 days')"),
    );
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "org_id",
      "renew",
      "rider_id",
      "rider_user_id",
      "unknown_permissions",
    ]);
    const ours = rows.filter((r) => r.org_id === ORG).map((r) => r.rider_id);
    expect(ours.sort()).toEqual(["gl_due", "gl_far", "gl_new"]);
    const code = await expectSqlError(
      asApp(app, ctx("due"), (c) =>
        c.query("select * from device_links_to_renew('garmin', now())"),
      ),
    );
    expect(code).toBe("42501");
  });

  it("cannot be called by the auth role, and own_device_links only answers the caller", async () => {
    const { rows } = await admin.query(
      `select has_function_privilege('kadence_auth', 'device_links_to_renew(text, timestamptz)', 'execute') as renew,
              has_function_privilege('kadence_auth', 'own_device_links(text)', 'execute') as own`,
    );
    expect(rows[0]).toEqual({ renew: false, own: false });
    const mine = await asApp(app, ctx("far"), (c) =>
      c.query("select * from own_device_links('garmin')"),
    );
    expect(mine.rows).toEqual([{ org_id: ORG, rider_id: "gl_far" }]);
    const nobody = await asApp(app, null, (c) =>
      c.query("select * from own_device_links('garmin')"),
    );
    expect(nobody.rows).toEqual([]);
  });
});
