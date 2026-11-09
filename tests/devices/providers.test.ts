import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { env } from "@/core/env";
import { garmin } from "@/modules/devices/garmin";
import { allowedUrl, DeviceHttpError, downloadFile } from "@/modules/devices/http";
import { MAX_UPLOAD_BYTES } from "@/modules/devices/import";
import { codeChallenge } from "@/modules/devices/oauth";
import { providerById } from "@/modules/devices/providers";
import { wahoo, WAHOO_FILE_HOSTS } from "@/modules/devices/wahoo";
import { bytes, fakeFetch, formOf, json, WEBHOOK_TOKEN, withProviderKeys } from "./fake-fetch";

/**
 * The adapters on their own, with `fetch` standing in for Wahoo and
 * Garmin: the OAuth round trip, the webhook's verification and shape, the
 * SSRF guard on every URL a payload names. No database.
 */

let restore: () => void;
beforeAll(() => {
  restore = withProviderKeys();
});
afterAll(() => restore());
afterEach(() => vi.unstubAllGlobals());

const REDIRECT = "http://localhost:3000/api/devices/wahoo/callback";

describe("without keys", () => {
  it("both providers say they are not configured, and refuse every webhook", () => {
    const saved = { ...env };
    Object.assign(env, { WAHOO_CLIENT_ID: undefined, GARMIN_CLIENT_SECRET: undefined });
    try {
      expect(wahoo.configured()).toBe(false);
      expect(providerById("garmin").configured()).toBe(false);
      expect(
        wahoo.verifyWebhook({ webhook_token: WEBHOOK_TOKEN, user: { id: 1 } }, new Headers()),
      ).toBe(false);
      expect(garmin.verifyWebhook({ activityFiles: [] }, new Headers())).toBe(false);
    } finally {
      Object.assign(env, saved);
    }
    expect(wahoo.configured()).toBe(true);
  });
});

describe("OAuth with PKCE", () => {
  it("sends the rider to Wahoo with the state, the S256 challenge and the scopes", () => {
    const url = new URL(wahoo.authorizeUrl("the-state", codeChallenge("v".repeat(43)), REDIRECT));
    expect(url.origin + url.pathname).toBe("https://api.wahooligan.com/oauth/authorize");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: "wahoo-client",
      redirect_uri: REDIRECT,
      response_type: "code",
      state: "the-state",
      code_challenge: codeChallenge("v".repeat(43)),
      code_challenge_method: "S256",
    });
    expect(url.searchParams.get("scope")).toContain("offline_data");
    expect(url.searchParams.get("scope")).toContain("plans_write");
  });

  it("sends the rider to Garmin's consent page", () => {
    const url = new URL(garmin.authorizeUrl("s", "c", REDIRECT));
    expect(url.origin + url.pathname).toBe("https://connect.garmin.com/oauth2Confirm");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("exchanges the code with the verifier and reads the user's id", async () => {
    const calls = fakeFetch({
      "POST https://api.wahooligan.com/oauth/token": () =>
        json({
          access_token: "acc-1",
          refresh_token: "ref-1",
          expires_in: 7200,
          token_type: "Bearer",
        }),
      "GET https://api.wahooligan.com/v1/user": () => json({ id: 60462, first: "Ida" }),
    });
    const now = new Date("2026-09-27T10:00:00Z");
    const tokens = await wahoo.exchangeCode("the-code", "the-verifier", REDIRECT);
    expect(tokens.accessToken).toBe("acc-1");
    expect(tokens.refreshToken).toBe("ref-1");
    expect(tokens.expiresAt!.getTime()).toBeGreaterThan(now.getTime());
    expect(formOf(calls[0]!)).toEqual({
      grant_type: "authorization_code",
      code: "the-code",
      code_verifier: "the-verifier",
      redirect_uri: REDIRECT,
      client_id: "wahoo-client",
      client_secret: "wahoo-secret",
    });
    expect(await wahoo.userId("acc-1")).toBe("60462");
    expect(calls[1]!.headers.get("authorization")).toBe("Bearer acc-1");
  });

  it("refreshes with the refresh token, and reads Garmin's user id", async () => {
    const calls = fakeFetch({
      "POST https://diauth.garmin.com/di-oauth2-service/oauth/token": () =>
        json({ access_token: "g-2", refresh_token: "g-ref-2", expires_in: 86400 }),
      "GET https://apis.garmin.com/partner-gateway/rest/user/id": () =>
        json({ userId: "d3315b10" }),
    });
    const tokens = await garmin.refresh("g-ref-1");
    expect(tokens).toMatchObject({ accessToken: "g-2", refreshToken: "g-ref-2" });
    expect(formOf(calls[0]!)).toMatchObject({
      grant_type: "refresh_token",
      refresh_token: "g-ref-1",
    });
    expect(await garmin.userId("g-2")).toBe("d3315b10");
  });

  it("refuses a token answer that is not one", async () => {
    fakeFetch({ "POST https://api.wahooligan.com/oauth/token": () => json({ error: "nope" }) });
    await expect(wahoo.exchangeCode("c", "v", REDIRECT)).rejects.toMatchObject({
      code: "invalid_response",
    });
  });
});

describe("the Wahoo webhook", () => {
  const payload = (token: string) => ({
    event_type: "workout_summary",
    webhook_token: token,
    user: { id: 60462 },
    workout_summary: {
      id: 8297,
      file: { url: "https://cdn.wahooligan.com/wahoo-cloud/production/ride.fit" },
      workout: { name: "Morning\u0000 ride/../x" },
    },
  });

  it("is verified by the webhook token and nothing else", () => {
    expect(wahoo.verifyWebhook(payload(WEBHOOK_TOKEN), new Headers())).toBe(true);
    expect(wahoo.verifyWebhook(payload("wrong"), new Headers())).toBe(false);
    expect(
      wahoo.verifyWebhook({ ...payload(WEBHOOK_TOKEN), webhook_token: 1 }, new Headers()),
    ).toBe(false);
    expect(wahoo.verifyWebhook("not an object", new Headers())).toBe(false);
  });

  it("names the activity, the user and a printable file name", () => {
    expect(wahoo.webhookEvents(payload(WEBHOOK_TOKEN))).toEqual([
      {
        kind: "activity",
        externalUserId: "60462",
        notification: {
          externalUserId: "60462",
          externalId: "8297",
          url: "https://cdn.wahooligan.com/wahoo-cloud/production/ride.fit",
          fileName: "Morning ride .. x.fit",
        },
      },
    ]);
    expect(wahoo.webhookEvents({ ...payload(WEBHOOK_TOKEN), event_type: "other" })).toEqual([]);
  });
});

describe("the Garmin ping", () => {
  it("names FIT activity files and deregistrations, and nothing else", () => {
    const events = garmin.webhookEvents({
      activityFiles: [
        {
          userId: "g-user",
          summaryId: "10010471216",
          activityId: 6287993625,
          fileType: "FIT",
          callbackURL: "https://apis.garmin.com/wellness-api/rest/activityFile?id=59965534",
        },
        { userId: "g-user", activityId: 1, fileType: "GPX", callbackURL: "https://x" },
      ],
      deregistrations: [{ userId: "g-gone" }],
      dailies: [{ userId: "g-user" }],
    });
    expect(events.map((e) => [e.kind, e.externalUserId])).toEqual([
      ["activity", "g-user"],
      ["deregistration", "g-gone"],
    ]);
    expect(events[0]).toMatchObject({ notification: { externalId: "6287993625" } });
  });

  it("believes a push only with this client's id, from Garmin's addresses", () => {
    const garminAddress = "204.77.163.244";
    const push = (client: string | null, address: string) =>
      garmin.verifyWebhook(
        { activityFiles: [] },
        new Headers({
          ...(client === null ? {} : { "garmin-client-id": client }),
          "x-forwarded-for": address,
        }),
      );
    expect(push("garmin-client", garminAddress)).toBe(true);
    expect(push("someone-else", garminAddress)).toBe(false);
    expect(push(null, garminAddress)).toBe(false);
    expect(push("garmin-client", "203.0.113.9")).toBe(false);
    expect(garmin.verifyWebhook([], new Headers({ "garmin-client-id": "garmin-client" }))).toBe(
      false,
    );
  });
});

describe("the SSRF guard", () => {
  it("allows only https on the provider's own hosts", () => {
    const ok = "https://cdn.wahooligan.com/wahoo-cloud/file.fit";
    expect(allowedUrl(ok, WAHOO_FILE_HOSTS)?.hostname).toBe("cdn.wahooligan.com");
    for (const bad of [
      "http://cdn.wahooligan.com/file.fit",
      "https://evil.example/file.fit",
      "https://cdn.wahooligan.com.evil.example/file.fit",
      "https://evil.example/?u=https://cdn.wahooligan.com/",
      "https://user:pass@cdn.wahooligan.com/file.fit",
      "https://cdn.wahooligan.com:8443/file.fit",
      "https://169.254.169.254/latest/meta-data",
      "file:///etc/passwd",
      "not a url",
    ])
      expect(allowedUrl(bad, WAHOO_FILE_HOSTS), bad).toBeNull();
  });

  it("never fetches a file from a foreign host", async () => {
    const calls = fakeFetch({});
    await expect(
      downloadFile("https://evil.example/ride.fit", WAHOO_FILE_HOSTS),
    ).rejects.toMatchObject({ code: "forbidden_host" });
    expect(calls).toHaveLength(0);
  });

  it("follows no redirect off the allowed hosts", async () => {
    const calls = fakeFetch({
      "GET https://cdn.wahooligan.com/ride.fit": () =>
        new Response(null, { status: 302, headers: { Location: "http://10.0.0.1/admin" } }),
    });
    await expect(
      downloadFile("https://cdn.wahooligan.com/ride.fit", WAHOO_FILE_HOSTS),
    ).rejects.toBeInstanceOf(DeviceHttpError);
    expect(calls.map((c) => c.url)).toEqual(["https://cdn.wahooligan.com/ride.fit"]);
  });

  it("caps the download at the upload's own limit", async () => {
    fakeFetch({
      "GET https://cdn.wahooligan.com/big.fit": () =>
        new Response(new Uint8Array(8), {
          headers: { "Content-Length": String(MAX_UPLOAD_BYTES + 1) },
        }),
    });
    await expect(
      downloadFile("https://cdn.wahooligan.com/big.fit", WAHOO_FILE_HOSTS),
    ).rejects.toMatchObject({ code: "too_large" });
  });

  it("sends Garmin's file request with the rider's token, to Garmin's file path only", async () => {
    const calls = fakeFetch({
      "GET https://apis.garmin.com/wellness-api/rest/activityFile": () =>
        bytes(new Uint8Array([1, 2, 3])),
    });
    const file = await garmin.fetchActivityFile(
      {
        externalUserId: "g",
        externalId: "1",
        url: "https://apis.garmin.com/wellness-api/rest/activityFile?id=1",
        fileName: "Garmin.fit",
      },
      "g-token",
    );
    expect(file.bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer g-token");
    await expect(
      garmin.fetchActivityFile(
        {
          externalUserId: "g",
          externalId: "1",
          url: "https://apis.garmin.com/wellness-api/rest/user/registration",
          fileName: "x.fit",
        },
        "g-token",
      ),
    ).rejects.toMatchObject({ code: "forbidden_host" });
  });
});
