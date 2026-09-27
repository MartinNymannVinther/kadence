import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { env } from "@/core/env";
import { polar, polarSignature, POLAR_FILE_HOSTS } from "@/modules/devices/polar";
import { allowedUrl } from "@/modules/devices/http";
import { bytes, fakeFetch, formOf, json, POLAR_SECRET, withProviderKeys } from "./fake-fetch";

/**
 * Polar's AccessLink adapter on its own, with `fetch` standing in for
 * Polar: the OAuth round trip without PKCE and with the client's
 * credentials as HTTP Basic, the registration AccessLink requires, the
 * HMAC signature on every notification, the ping, and the file fetched
 * from AccessLink's own host only. No database.
 */

let restore: () => void;
beforeAll(() => {
  restore = withProviderKeys();
});
afterAll(() => restore());
afterEach(() => vi.unstubAllGlobals());

const REDIRECT = "http://localhost:3000/api/devices/polar/callback";
const TOKEN = "https://polarremote.com/v2/oauth2/token";
const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
const exercise = { event: "EXERCISE", user_id: 475, entity_id: "aQlC83", timestamp: "x" };

describe("without keys", () => {
  it("says it is not configured, and refuses every notification and every ping", () => {
    const saved = { ...env };
    Object.assign(env, { POLAR_CLIENT_ID: undefined });
    try {
      expect(polar.configured()).toBe(false);
      const raw = encode(exercise);
      const signed = new Headers({ "Polar-Webhook-Signature": polarSignature(raw, POLAR_SECRET) });
      expect(polar.verifyWebhook(exercise, signed, raw)).toBe(false);
      const ping = new Headers({ "Polar-Webhook-Event": "PING" });
      expect(polar.isPing!({ event: "PING" }, ping)).toBe(false);
    } finally {
      Object.assign(env, saved);
    }
  });

  it("refuses every notification without the webhook secret", () => {
    const saved = { ...env };
    Object.assign(env, { POLAR_WEBHOOK_SECRET: undefined });
    try {
      const raw = encode(exercise);
      const headers = new Headers({
        "Polar-Webhook-Signature": polarSignature(raw, POLAR_SECRET),
      });
      expect(polar.verifyWebhook(exercise, headers, raw)).toBe(false);
    } finally {
      Object.assign(env, saved);
    }
  });
});

describe("OAuth", () => {
  it("sends the rider to Polar Flow with the state and the scope, and no PKCE", () => {
    const url = new URL(polar.authorizeUrl("the-state", "the-challenge", REDIRECT));
    expect(url.origin + url.pathname).toBe("https://flow.polar.com/oauth2/authorization");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: "code",
      client_id: "polar-client",
      redirect_uri: REDIRECT,
      scope: "accesslink.read_all",
      state: "the-state",
    });
  });

  it("exchanges the code with the client's credentials as Basic, and reads the user id", async () => {
    const calls = fakeFetch({
      [`POST ${TOKEN}`]: () =>
        json({
          access_token: "p-acc",
          token_type: "bearer",
          expires_in: 31535999,
          x_user_id: 10579,
        }),
    });
    const tokens = await polar.exchangeCode("the-code", "unused-verifier", REDIRECT);
    expect(tokens).toMatchObject({
      accessToken: "p-acc",
      refreshToken: null,
      externalUserId: "10579",
    });
    expect(tokens.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 300 * 86_400_000);
    expect(formOf(calls[0]!)).toEqual({
      grant_type: "authorization_code",
      code: "the-code",
      redirect_uri: REDIRECT,
    });
    const basic = Buffer.from("polar-client:polar-secret").toString("base64");
    expect(calls[0]!.headers.get("authorization")).toBe(`Basic ${basic}`);
    // The secret travels in the header only, never in the body.
    expect(calls[0]!.body).not.toContain("polar-secret");
    expect(await polar.userId("p-acc", tokens.externalUserId)).toBe("10579");
  });

  it("refuses a token answer without a user id, and an account it cannot name", async () => {
    fakeFetch({ [`POST ${TOKEN}`]: () => json({ access_token: "p", expires_in: 10 }) });
    await expect(polar.exchangeCode("c", "v", REDIRECT)).rejects.toMatchObject({
      code: "invalid_response",
    });
    await expect(polar.userId("p")).rejects.toMatchObject({ code: "invalid_response" });
    await expect(polar.userId("p", "../1")).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("registers the user with a random member id, and takes 409 as already registered", async () => {
    const calls = fakeFetch({
      "POST https://www.polaraccesslink.com/v3/users": () =>
        json({ "polar-user-id": 10579, "first-name": "Ida", weight: 60 }),
    });
    await polar.register!("p-acc", "10579");
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer p-acc");
    const body = JSON.parse(calls[0]!.body!) as Record<string, string>;
    expect(Object.keys(body)).toEqual(["member-id"]);
    expect(body["member-id"]).toMatch(/^[0-9a-f]{32}$/);

    fakeFetch({ "POST https://www.polaraccesslink.com/v3/users": () => json({}, 409) });
    await expect(polar.register!("p-acc", "10579")).resolves.toBeUndefined();
    fakeFetch({ "POST https://www.polaraccesslink.com/v3/users": () => json({}, 403) });
    await expect(polar.register!("p-acc", "10579")).rejects.toMatchObject({ status: 403 });
  });

  it("has no refresh token to refresh with", async () => {
    await expect(polar.refresh("anything")).rejects.toMatchObject({ rejected: true });
  });
});

describe("the webhook", () => {
  const raw = encode(exercise);

  it("is verified by the HMAC-SHA256 of the body, in constant time", () => {
    const signature = polarSignature(raw, POLAR_SECRET);
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
    const ok = new Headers({ "Polar-Webhook-Signature": signature });
    expect(polar.verifyWebhook(exercise, ok, raw)).toBe(true);
    const upper = new Headers({ "Polar-Webhook-Signature": signature.toUpperCase() });
    expect(polar.verifyWebhook(exercise, upper, raw)).toBe(true);
  });

  it("refuses a wrong, missing or foreign signature, and a changed body", () => {
    const signature = polarSignature(raw, POLAR_SECRET);
    const headers = (value?: string) =>
      new Headers(value === undefined ? {} : { "Polar-Webhook-Signature": value });
    expect(polar.verifyWebhook(exercise, headers(), raw)).toBe(false);
    expect(polar.verifyWebhook(exercise, headers("0".repeat(64)), raw)).toBe(false);
    expect(polar.verifyWebhook(exercise, headers("not hex"), raw)).toBe(false);
    expect(polar.verifyWebhook(exercise, headers(polarSignature(raw, "someone-else")), raw)).toBe(
      false,
    );
    const changed = encode({ ...exercise, user_id: 476 });
    expect(polar.verifyWebhook(exercise, headers(signature), changed)).toBe(false);
    expect(polar.verifyWebhook(exercise, headers(signature))).toBe(false);
  });

  it("recognises AccessLink's ping, and nothing else as one", () => {
    const ping = new Headers({ "Polar-Webhook-Event": "PING" });
    expect(polar.isPing!({ event: "PING", timestamp: "2019-01-11T08:25:10.02Z" }, ping)).toBe(true);
    expect(polar.isPing!(exercise, ping)).toBe(false);
    expect(polar.isPing!({ event: "PING" }, new Headers())).toBe(false);
  });

  it("names the exercise and the user, and builds the FIT URL itself", () => {
    expect(polar.webhookEvents({ ...exercise, url: "https://evil.example/x" })).toEqual([
      {
        kind: "activity",
        externalUserId: "475",
        notification: {
          externalUserId: "475",
          externalId: "aQlC83",
          url: "https://www.polaraccesslink.com/v3/exercises/aQlC83/fit",
          fileName: "Polar.fit",
        },
      },
    ]);
    expect(polar.webhookEvents({ ...exercise, event: "SLEEP" })).toEqual([]);
    expect(polar.webhookEvents({ ...exercise, entity_id: "../../users" })).toEqual([]);
    expect(polar.webhookEvents({ ...exercise, user_id: "abc" })).toEqual([]);
  });
});

describe("the exercise file", () => {
  it("is fetched from AccessLink with the rider's token, and from nowhere else", async () => {
    const url = "https://www.polaraccesslink.com/v3/exercises/aQlC83/fit";
    const calls = fakeFetch({ [`GET ${url}`]: () => bytes(new Uint8Array([1, 2, 3])) });
    const note = { externalUserId: "475", externalId: "aQlC83", url, fileName: "Polar.fit" };
    const file = await polar.fetchActivityFile(note, "p-acc");
    expect(file.bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer p-acc");
    expect(allowedUrl("https://www.polaraccesslink.com/v3/users/1", POLAR_FILE_HOSTS)).toBeNull();
    expect(allowedUrl("https://polaraccesslink.com.evil/v3/exercises/", POLAR_FILE_HOSTS)).toBe(
      null,
    );
    await expect(
      polar.fetchActivityFile({ ...note, url: "https://evil.example/v3/exercises/x" }, "p-acc"),
    ).rejects.toMatchObject({ code: "forbidden_host" });
  });
});
