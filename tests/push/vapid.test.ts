import { createPublicKey, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isPushEndpoint, pushService } from "@/modules/push/endpoint";
import {
  fromBase64url,
  newVapidKeyPair,
  parseVapidKeys,
  vapidAuthorization,
  vapidSubject,
  vapidToken,
  VAPID_TOKEN_SECONDS,
} from "@/modules/push/vapid";

/**
 * VAPID by hand (RFC 8292, docs/adr/0060): the installation signs a short
 * ES256 token for each push service with node:crypto, and these prove the
 * token is one a push service accepts — the signature verifies against the
 * public key the browsers subscribed with, the audience is the push
 * service's origin, and it runs out within a day.
 */

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc:def-123";
const NOW = new Date("2026-10-06T17:00:00Z");

function decodePart(part: string) {
  return JSON.parse(fromBase64url(part).toString("utf8")) as Record<string, unknown>;
}

function publicKeyObject(publicKey: string) {
  const point = fromBase64url(publicKey);
  return createPublicKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: point.subarray(1, 33).toString("base64url"),
      y: point.subarray(33, 65).toString("base64url"),
    },
    format: "jwk",
  });
}

describe("the installation's key pair", () => {
  it("is made as an uncompressed point and a 32-byte scalar, in base64url", () => {
    const pair = newVapidKeyPair();
    expect(fromBase64url(pair.publicKey)).toHaveLength(65);
    expect(fromBase64url(pair.publicKey)[0]).toBe(0x04);
    expect(fromBase64url(pair.privateKey)).toHaveLength(32);
    expect(pair.publicKey).toMatch(/^[A-Za-z0-9_-]{87}$/);
    expect(pair.privateKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("reads the private key raw or as a JWK", () => {
    const pair = newVapidKeyPair();
    const point = fromBase64url(pair.publicKey);
    const jwk = JSON.stringify({
      kty: "EC",
      crv: "P-256",
      d: pair.privateKey,
      x: point.subarray(1, 33).toString("base64url"),
      y: point.subarray(33, 65).toString("base64url"),
    });
    expect(parseVapidKeys(pair.publicKey, pair.privateKey).publicKey).toBe(pair.publicKey);
    expect(parseVapidKeys(pair.publicKey, jwk).publicKey).toBe(pair.publicKey);
  });

  it("refuses two keys that are not one pair, and keys that are not keys", () => {
    const a = newVapidKeyPair();
    const b = newVapidKeyPair();
    expect(() => parseVapidKeys(a.publicKey, b.privateKey)).toThrow(/not one pair/);
    expect(() => parseVapidKeys(a.publicKey.slice(0, 40), a.privateKey)).toThrow();
    expect(() => parseVapidKeys(a.publicKey, a.privateKey.slice(0, 20))).toThrow();
    expect(() => parseVapidKeys(a.publicKey, "not a key!")).toThrow(/base64url/);
    expect(() => parseVapidKeys(a.publicKey, '{"kty":"RSA","d":"x"}')).toThrow(/P-256/);
  });
});

describe("the signed token", () => {
  const pair = newVapidKeyPair();
  const keys = parseVapidKeys(pair.publicKey, pair.privateKey);

  it("is an ES256 JWT whose signature verifies against the public key", () => {
    const token = vapidToken(ENDPOINT, keys, "mailto:ops@example.dk", NOW);
    const [header, claims, signature] = token.split(".");
    expect(decodePart(header!)).toEqual({ typ: "JWT", alg: "ES256" });
    const sig = fromBase64url(signature!);
    expect(sig).toHaveLength(64);
    const ok = verify(
      "sha256",
      Buffer.from(`${header}.${claims}`),
      { key: publicKeyObject(pair.publicKey), dsaEncoding: "ieee-p1363" },
      sig,
    );
    expect(ok).toBe(true);
  });

  it("names the push service's origin, runs out within a day, and says whom to contact", () => {
    const token = vapidToken(ENDPOINT, keys, "mailto:ops@example.dk", NOW);
    const claims = decodePart(token.split(".")[1]!);
    expect(claims.aud).toBe("https://fcm.googleapis.com");
    const exp = claims.exp as number;
    const now = Math.floor(NOW.getTime() / 1000);
    expect(exp).toBe(now + VAPID_TOKEN_SECONDS);
    expect(exp - now).toBeGreaterThan(0);
    expect(exp - now).toBeLessThanOrEqual(24 * 60 * 60);
    expect(claims.sub).toBe("mailto:ops@example.dk");
  });

  it("goes in the Authorization header with the public key beside it", () => {
    const header = vapidAuthorization(ENDPOINT, keys, "https://kadence.example", NOW);
    expect(header).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]{87}$/);
    expect(header.endsWith(`k=${pair.publicKey}`)).toBe(true);
  });

  it("contacts the installation's own address when no contact is set", () => {
    expect(vapidSubject(undefined, "https://kadence.haij.dk/some/path")).toBe(
      "https://kadence.haij.dk",
    );
    expect(vapidSubject("mailto:ops@example.dk", "https://kadence.haij.dk")).toBe(
      "mailto:ops@example.dk",
    );
  });
});

describe("where a push may go", () => {
  it("takes the browsers' push services", () => {
    for (const endpoint of [
      ENDPOINT,
      "https://updates.push.services.mozilla.com/wpush/v2/gAAAA",
      "https://web.push.apple.com/QGuQyavXutnMH",
      "https://wns2-db5p.notify.windows.com/w/?token=BQYAAA",
      "https://android.googleapis.com/gcm/send/abc",
    ])
      expect(isPushEndpoint(endpoint), endpoint).toBe(true);
  });

  it("refuses anything else the server could be aimed at", () => {
    for (const endpoint of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://fcm.googleapis.com.evil.example/x",
      "https://evil.example/fcm.googleapis.com",
      "https://localhost/push",
      "https://127.0.0.1/push",
      "https://user:pw@fcm.googleapis.com/fcm/send/abc",
      "https://fcm.googleapis.com:8443/fcm/send/abc",
      `https://fcm.googleapis.com/${"a".repeat(1000)}`,
      "not a url",
    ])
      expect(isPushEndpoint(endpoint), endpoint).toBe(false);
  });

  it("names a push service by its host, never by the whole address", () => {
    expect(pushService(ENDPOINT)).toBe("fcm.googleapis.com");
    expect(pushService("nonsense")).toBe("invalid");
  });
});
