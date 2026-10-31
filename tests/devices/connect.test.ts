import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Client, Pool } from "pg";
import { openSecret } from "@/core/crypto/secret-box";
import { finishConnect, OAUTH_COOKIE, startConnect } from "@/modules/devices/connect";
import { disconnect } from "@/modules/devices/disconnect";
import { accessTokenFor, listDeviceLinks, saveLink } from "@/modules/devices/links";
import { providerById } from "@/modules/devices/providers";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";
import { fakeFetch, formOf, json, withProviderKeys } from "./fake-fetch";

/**
 * Connecting a rider's Wahoo account: the OAuth round trip with PKCE and
 * state, the sealed tokens on the rider's link, the refresh before use,
 * and disconnecting. Only the rider connects; a coach cannot do it in the
 * rider's name, in the service or in the database.
 */

const ORG = "org_dev_connect";
const COACH = { orgId: ORG, userId: "user_dc_coach" };
const IDA = { orgId: ORG, userId: "user_dc_ida" };
const MIKKEL = { orgId: ORG, userId: "user_dc_mikkel" };

let admin: Pool;
let app: Client;
let restore: () => void;

async function linkRow(riderId: string, provider = "wahoo") {
  const { rows } = await admin.query(
    "select * from device_links where rider_id = $1 and provider = $2",
    [riderId, provider],
  );
  return rows[0] as Record<string, unknown> | undefined;
}

beforeAll(async () => {
  restore = withProviderKeys();
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [IDA, MIKKEL]) await seedPerson(admin, ORG, p.userId, "member");
  for (const [id, uid] of [
    ["dc_ida", IDA.userId],
    ["dc_mikkel", MIKKEL.userId],
  ]) {
    const q = insertSql("riders", { org_id: ORG, id, user_id: uid, name: id, birth_year: 2008 });
    await admin.query(q.text, q.values);
  }
});

afterEach(() => vi.unstubAllGlobals());

afterAll(async () => {
  restore();
  await app.end();
  await admin.end();
});

const cookieOf = (started: Awaited<ReturnType<typeof startConnect>>) => started.cookie!.value;
const stateOf = (started: Awaited<ReturnType<typeof startConnect>>) =>
  new URL(started.location).searchParams.get("state")!;

describe("connecting", () => {
  it("sends the rider to Wahoo with a sealed, HttpOnly state cookie", async () => {
    const started = await startConnect(IDA, "wahoo");
    expect(started.location).toMatch(/^https:\/\/api\.wahooligan\.com\/oauth\/authorize\?/);
    expect(started.cookie).toMatchObject({ name: OAUTH_COOKIE, maxAge: 600, secure: false });
    // The cookie holds the verifier, sealed: neither it nor the state is readable in it.
    expect(started.cookie!.value).not.toContain(stateOf(started));
  });

  it("refuses a callback whose state does not match, before calling Wahoo", async () => {
    const calls = fakeFetch({});
    const started = await startConnect(IDA, "wahoo");
    const location = await finishConnect(
      IDA,
      "wahoo",
      { code: "c", state: "forged-state" },
      cookieOf(started),
    );
    expect(location).toBe("/settings/devices?error=state");
    expect(calls).toHaveLength(0);
    expect(await linkRow("dc_ida")).toBeUndefined();
  });

  it("refuses a callback with another person's cookie", async () => {
    const started = await startConnect(MIKKEL, "wahoo");
    const location = await finishConnect(
      IDA,
      "wahoo",
      { code: "c", state: stateOf(started) },
      cookieOf(started),
    );
    expect(location).toBe("/settings/devices?error=state");
  });

  it("exchanges the code, reads the user and stores the tokens sealed", async () => {
    const calls = fakeFetch({
      "POST https://api.wahooligan.com/oauth/token": () =>
        json({ access_token: "acc-ida", refresh_token: "ref-ida", expires_in: 7200 }),
      "GET https://api.wahooligan.com/v1/user": () => json({ id: 70001 }),
    });
    const started = await startConnect(IDA, "wahoo");
    const location = await finishConnect(
      IDA,
      "wahoo",
      { code: "the-code", state: stateOf(started) },
      cookieOf(started),
    );
    expect(location).toBe("/settings/devices?connected=wahoo");
    // The verifier in the cookie is the one whose challenge went to Wahoo.
    expect(formOf(calls[0]!).code_verifier).toMatch(/^[\w-]{43}$/);

    const row = await linkRow("dc_ida");
    expect(row).toMatchObject({ external_user_id: "70001", status: "connected", last_error: "" });
    expect(String(row!.access_token_sealed)).not.toContain("acc-ida");
    expect(openSecret(String(row!.access_token_sealed), "device-link:dc_ida:wahoo")).toBe(
      "acc-ida",
    );
    // Sealed for this rider's link: it does not open as anyone else's.
    expect(openSecret(String(row!.access_token_sealed), "device-link:dc_mikkel:wahoo")).toBeNull();
  });

  it("says when the rider declined at the provider", async () => {
    const started = await startConnect(IDA, "wahoo");
    expect(
      await finishConnect(
        IDA,
        "wahoo",
        { state: stateOf(started), error: "access_denied" },
        cookieOf(started),
      ),
    ).toBe("/settings/devices?error=denied");
  });

  it("refuses the same Wahoo account for a second rider", async () => {
    await expect(
      saveLink(MIKKEL, "wahoo", "70001", { accessToken: "a", refreshToken: null, expiresAt: null }),
    ).rejects.toMatchObject({ code: "conflict", detail: "already_linked" });
  });
});

describe("a coach", () => {
  it("cannot start a connection: a coach is not the rider", async () => {
    const started = await startConnect(COACH, "wahoo");
    expect(started).toEqual({ location: "/settings/devices?error=not_a_rider" });
  });

  it("cannot store a link in the rider's name", async () => {
    await expect(
      saveLink(COACH, "wahoo", "coach-made", {
        accessToken: "a",
        refreshToken: null,
        expiresAt: null,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("is refused by the database too (42501)", async () => {
    const code = await asApp(app, COACH, (c) =>
      expectSqlError(
        c.query(
          `insert into device_links (org_id, rider_id, provider, external_user_id, access_token_sealed)
           values ($1, 'dc_mikkel', 'garmin', 'coach-made', 'x')`,
          [ORG],
        ),
      ),
    );
    expect(code).toBe("42501");
  });

  it("sees that the rider's link exists and how it is doing, never its tokens", async () => {
    const views = await listDeviceLinks(COACH, "dc_ida");
    expect(views).toEqual([
      {
        provider: "wahoo",
        configured: true,
        canPush: true,
        status: "connected",
        lastSyncAt: null,
        lastError: "",
      },
      {
        provider: "garmin",
        configured: true,
        canPush: true,
        status: null,
        lastSyncAt: null,
        lastError: "",
      },
      {
        provider: "polar",
        configured: true,
        canPush: false,
        status: null,
        lastSyncAt: null,
        lastError: "",
      },
    ]);
    expect(JSON.stringify(views)).not.toContain("sealed");
  });

  it("a teammate sees no link at all", async () => {
    const views = await listDeviceLinks(MIKKEL, "dc_ida");
    expect(views.every((v) => v.status === null)).toBe(true);
  });
});

describe("the tokens", () => {
  const owner = { orgId: ORG, riderId: "dc_ida", riderUserId: IDA.userId };

  it("are used as they are while fresh", async () => {
    const calls = fakeFetch({});
    expect(await accessTokenFor(owner, providerById("wahoo"))).toBe("acc-ida");
    expect(calls).toHaveLength(0);
  });

  it("are refreshed before use once expired, and stored again", async () => {
    await admin.query(
      "update device_links set expires_at = now() - interval '1 minute' where rider_id = 'dc_ida'",
    );
    const calls = fakeFetch({
      "POST https://api.wahooligan.com/oauth/token": () =>
        json({ access_token: "acc-ida-2", refresh_token: "ref-ida-2", expires_in: 7200 }),
    });
    expect(await accessTokenFor(owner, providerById("wahoo"))).toBe("acc-ida-2");
    expect(formOf(calls[0]!)).toMatchObject({
      grant_type: "refresh_token",
      refresh_token: "ref-ida",
    });
    const row = await linkRow("dc_ida");
    expect(openSecret(String(row!.refresh_token_sealed), "device-link:dc_ida:wahoo")).toBe(
      "ref-ida-2",
    );
    expect(new Date(String(row!.expires_at)).getTime()).toBeGreaterThan(Date.now());
  });

  it("leave the link in error when the provider refuses the refresh", async () => {
    await admin.query(
      "update device_links set expires_at = now() - interval '1 minute' where rider_id = 'dc_ida'",
    );
    fakeFetch({
      "POST https://api.wahooligan.com/oauth/token": () => json({ error: "invalid_grant" }, 400),
    });
    await expect(accessTokenFor(owner, providerById("wahoo"))).rejects.toMatchObject({
      code: "conflict",
      detail: "reconnect",
    });
    expect(await linkRow("dc_ida")).toMatchObject({
      status: "error",
      last_error: "refresh_failed",
    });
  });
});

describe("disconnecting", () => {
  it("tells Wahoo, then deletes the link", async () => {
    await saveLink(IDA, "wahoo", "70001", {
      accessToken: "acc-ida-3",
      refreshToken: "ref-ida-3",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const calls = fakeFetch({
      "DELETE https://api.wahooligan.com/v1/permissions": () => new Response(null, { status: 204 }),
    });
    await disconnect(IDA, "wahoo");
    expect(calls.map((c) => [c.method, c.url, c.headers.get("authorization")])).toEqual([
      ["DELETE", "https://api.wahooligan.com/v1/permissions", "Bearer acc-ida-3"],
    ]);
    expect(await linkRow("dc_ida")).toBeUndefined();
  });

  it("deletes the link even when the provider cannot be reached", async () => {
    await saveLink(IDA, "wahoo", "70001", {
      accessToken: "acc-ida-4",
      refreshToken: null,
      expiresAt: null,
    });
    fakeFetch({
      "DELETE https://api.wahooligan.com/v1/permissions": () => new Response(null, { status: 503 }),
    });
    await disconnect(IDA, "wahoo");
    expect(await linkRow("dc_ida")).toBeUndefined();
  });

  it("refuses when there is nothing to disconnect", async () => {
    fakeFetch({});
    await expect(disconnect(IDA, "garmin")).rejects.toMatchObject({ code: "notFound" });
  });
});

describe("Garmin's yes", () => {
  const consentsOf = async (userId: string) =>
    (
      await admin.query(
        "select kind, version, locale, rider_id, withdrawn_at from consents where user_id = $1 and kind = 'garmin' order by given_at",
        [userId],
      )
    ).rows as {
      kind: string;
      version: string;
      locale: string;
      rider_id: string;
      withdrawn_at: Date | null;
    }[];

  it("sends a rider without a yes back to the devices page, and writes nothing", async () => {
    const started = await startConnect(IDA, "garmin");
    expect(started.location).toBe("/settings/devices?error=consent");
    expect(started.cookie).toBeUndefined();
    expect(await consentsOf(IDA.userId)).toEqual([]);
  });

  it("writes the yes about the rider's own row before sending them to Garmin", async () => {
    const started = await startConnect(IDA, "garmin", new Date(), { given: true, locale: "en" });
    expect(new URL(started.location).host).toBe("connect.garmin.com");
    expect(started.cookie).toBeDefined();
    expect(await consentsOf(IDA.userId)).toEqual([
      expect.objectContaining({
        kind: "garmin",
        locale: "en",
        rider_id: "dc_ida",
        withdrawn_at: null,
      }),
    ]);
  });

  it("takes no yes from a coach, who cannot connect in a rider's name", async () => {
    const started = await startConnect(COACH, "garmin", new Date(), { given: true, locale: "da" });
    expect(started.location).toBe("/settings/devices?error=not_a_rider");
    expect(await consentsOf(COACH.userId)).toEqual([]);
  });

  it("is withdrawn when the rider disconnects Garmin", async () => {
    await saveLink(IDA, "garmin", "g-ida", {
      accessToken: "acc-g",
      refreshToken: null,
      expiresAt: new Date(Date.now() + 3600_000),
    });
    fakeFetch({
      "DELETE https://apis.garmin.com/wellness-api/rest/user/registration": () =>
        new Response(null, { status: 204 }),
    });
    await disconnect(IDA, "garmin");
    const rows = await consentsOf(IDA.userId);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.withdrawn_at !== null)).toBe(true);
  });
});
