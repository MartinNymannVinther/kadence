import {
  createECDH,
  createPrivateKey,
  generateKeyPairSync,
  sign,
  type KeyObject,
} from "node:crypto";

/**
 * VAPID (RFC 8292): how Kadence tells a push service that a push comes
 * from this installation (docs/adr/0059). A short ES256 token, signed with
 * the installation's P-256 key, names the push service it is for (`aud`),
 * when it stops being good (`exp`) and whom to contact (`sub`); the public
 * key goes beside it. No payload rides on the push, so nothing here
 * encrypts (RFC 8291 is not needed), and nothing here needs a library:
 * node:crypto signs, and the rest is base64url.
 *
 * Pure: no environment, no network. The keys come in as strings, the way
 * the environment and `scripts/push-keys.ts` write them.
 */

/** How long a token is good for. RFC 8292 allows at most 24 hours. */
export const VAPID_TOKEN_SECONDS = 12 * 60 * 60;

export type VapidKeys = {
  /** The uncompressed P-256 point (65 bytes), base64url: what browsers subscribe with. */
  publicKey: string;
  privateKey: KeyObject;
};

export function toBase64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

/** Strict base64url: anything else is a typo in the environment, not a key. */
export function fromBase64url(text: string): Buffer {
  const trimmed = text.trim().replace(/=+$/, "");
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) throw new Error("not base64url");
  return Buffer.from(trimmed, "base64url");
}

function scalarFrom(privateKey: string): Buffer {
  const text = privateKey.trim();
  if (!text.startsWith("{")) return fromBase64url(text);
  const jwk = JSON.parse(text) as { kty?: string; crv?: string; d?: string };
  if (jwk.kty !== "EC" || jwk.crv !== "P-256" || typeof jwk.d !== "string")
    throw new Error("the private key is not a P-256 JWK");
  return fromBase64url(jwk.d);
}

/**
 * The installation's key pair, checked: the public key is a P-256 point,
 * the private key a 32-byte scalar (raw, base64url, or a JWK), and the
 * two belong together — a pair that does not would be refused by every
 * push service, one person at a time, which is a worse place to find out.
 */
export function parseVapidKeys(publicKey: string, privateKey: string): VapidKeys {
  const point = fromBase64url(publicKey);
  if (point.length !== 65 || point[0] !== 0x04)
    throw new Error("PUSH_PUBLIC_KEY is not an uncompressed P-256 point");
  const d = scalarFrom(privateKey);
  if (d.length !== 32) throw new Error("PUSH_PRIVATE_KEY is not a 32-byte P-256 key");

  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(d);
  if (!ecdh.getPublicKey().equals(point))
    throw new Error("PUSH_PUBLIC_KEY and PUSH_PRIVATE_KEY are not one pair");

  const key = createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      d: toBase64url(d),
      x: toBase64url(point.subarray(1, 33)),
      y: toBase64url(point.subarray(33, 65)),
    },
    format: "jwk",
  });
  return { publicKey: toBase64url(point), privateKey: key };
}

/**
 * Whom a push service may contact about this installation's pushes: the
 * installation's own contact when it has one, otherwise its own address.
 */
export function vapidSubject(contact: string | undefined, baseUrl: string): string {
  if (contact) return contact;
  return new URL(baseUrl).origin;
}

const encodeJson = (value: unknown) => toBase64url(Buffer.from(JSON.stringify(value), "utf8"));

/** The signed token for one push service (the endpoint's origin), good for twelve hours. */
export function vapidToken(endpoint: string, keys: VapidKeys, subject: string, now: Date): string {
  const header = encodeJson({ typ: "JWT", alg: "ES256" });
  const claims = encodeJson({
    aud: new URL(endpoint).origin,
    exp: Math.floor(now.getTime() / 1000) + VAPID_TOKEN_SECONDS,
    sub: subject,
  });
  const signed = `${header}.${claims}`;
  // ES256 in a JWT is r‖s, 64 bytes, not the DER node:crypto gives by default.
  const signature = sign("sha256", Buffer.from(signed), {
    key: keys.privateKey,
    dsaEncoding: "ieee-p1363",
  });
  return `${signed}.${toBase64url(signature)}`;
}

/** The Authorization header RFC 8292 section 3 describes. */
export function vapidAuthorization(
  endpoint: string,
  keys: VapidKeys,
  subject: string,
  now: Date,
): string {
  return `vapid t=${vapidToken(endpoint, keys, subject, now)}, k=${keys.publicKey}`;
}

/** A fresh pair in the environment's format, for `scripts/push-keys.ts`. */
export function newVapidKeyPair(): { publicKey: string; privateKey: string } {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = privateKey.export({ format: "jwk" });
  if (!jwk.x || !jwk.y || !jwk.d) throw new Error("node:crypto gave an incomplete key");
  const point = Buffer.concat([Buffer.from([0x04]), fromBase64url(jwk.x), fromBase64url(jwk.y)]);
  return { publicKey: toBase64url(point), privateKey: jwk.d };
}
