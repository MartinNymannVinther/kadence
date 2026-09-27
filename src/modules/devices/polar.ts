import { createHmac, randomBytes } from "node:crypto";
import { z } from "zod";
import { env } from "@/core/env";
import { activityFileName } from "./file-name";
import {
  bearer,
  DeviceHttpError,
  downloadFile,
  formBody,
  requestJson,
  requestOk,
  type HostRule,
} from "./http";
import { safeEqual } from "./oauth";
import type { ActivityNotification, DeviceProvider, Tokens, WebhookEvent } from "./providers";

/**
 * Polar's AccessLink API v3 (Polar Electro Oy, Kempele, Finland), as its
 * public reference at polar.com/accesslink-api describes it (read
 * 2026-09-27):
 *
 * - OAuth 2.0 authorization code at flow.polar.com/oauth2/authorization
 *   (response_type=code, client_id, redirect_uri, scope
 *   accesslink.read_all, state). PKCE is not documented, so none is sent;
 *   the code is exchanged at polarremote.com/v2/oauth2/token as a form
 *   post authenticated with the client's id and secret as HTTP Basic, and
 *   the answer names the account (`x_user_id`). There is no refresh token:
 *   "Access tokens will not expire unless explicitly revoked", while
 *   `expires_in` says about a year. Kadence keeps the date it is given; a
 *   link whose token has run out asks the rider to connect again.
 * - The partner "must register the user before being able to access its
 *   data": POST /v3/users with a `member-id`, 409 when already registered.
 *   DELETE /v3/users/{user-id} de-registers and revokes the token.
 * - One webhook per client, created once by the operator with the client's
 *   credentials (docs/devices-setup.md). AccessLink pings the URL first and
 *   creates the webhook only if the ping is answered 200, then hands over a
 *   `signature_secret_key` once. Every notification carries
 *   `Polar-Webhook-Signature`: HMAC-SHA256 of the body with that key, in
 *   hex (the reference's Java example: key and data as bytes, hex out).
 * - An EXERCISE notification names `user_id`, `entity_id` (the exercise's
 *   hashed id) and a `url`; the FIT file is GET
 *   /v3/exercises/{exerciseId}/fit with the user's token. Exercises are
 *   available for 30 days after they reach Polar Flow.
 *
 * Not verifiable from the public reference, and so written as assumptions
 * to check against a live client: that the signature is computed over the
 * body bytes exactly as delivered, with the key's UTF-8 bytes, in
 * lowercase hex (compared case-insensitively here); and that the PING is
 * sent unsigned or signed with a key the operator cannot yet have — so it
 * is answered without verification (`isPing`), and it does nothing.
 *
 * Kadence does not send planned sessions to Polar: AccessLink is a read
 * API, and this adapter has no `pushWorkout`.
 */

const API = "https://www.polaraccesslink.com";
const AUTHORIZE = "https://flow.polar.com/oauth2/authorization";
const TOKEN = "https://polarremote.com/v2/oauth2/token";
const SCOPE = "accesslink.read_all";

/**
 * Exercise files come from AccessLink's own host, on the exercises path.
 * Kadence builds the URL from the notification's `entity_id` rather than
 * following the notification's `url`, and checks it against this anyway.
 */
export const POLAR_FILE_HOSTS: HostRule = {
  hosts: ["www.polaraccesslink.com"],
  pathPrefix: "/v3/exercises/",
};

/** Polar's user ids are integers (int64); exercise ids are short hashes. */
const PolarUserId = z
  .union([z.number().int().nonnegative(), z.string().regex(/^\d{1,20}$/)])
  .transform(String);
const ExerciseId = z.string().regex(/^[\w-]{1,100}$/);

function configured(): boolean {
  return Boolean(env.POLAR_CLIENT_ID && env.POLAR_CLIENT_SECRET);
}

function basic(): string {
  const pair = `${env.POLAR_CLIENT_ID ?? ""}:${env.POLAR_CLIENT_SECRET ?? ""}`;
  return `Basic ${Buffer.from(pair, "utf8").toString("base64")}`;
}

/** No PKCE: AccessLink's authorization endpoint documents none, so the challenge is left out. */
function authorizeUrl(state: string, _challenge: string, redirectUri: string): string {
  const url = new URL(AUTHORIZE);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: env.POLAR_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    scope: SCOPE,
    state,
  }).toString();
  return url.toString();
}

const TokenAnswer = z.object({
  access_token: z.string().min(1).max(4096),
  expires_in: z.coerce
    .number()
    .int()
    .positive()
    .max(10 * 365 * 86_400)
    .nullish(),
  x_user_id: PolarUserId,
});

/** `redirect_uri` "must be specified if redirect_uri was passed to authorization endpoint", and it is. */
async function exchangeCode(
  code: string,
  _verifier: string,
  redirectUri: string,
  now: Date = new Date(),
): Promise<Tokens> {
  const answer = await requestJson(
    TOKEN,
    {
      method: "POST",
      headers: {
        Authorization: basic(),
        Accept: "application/json;charset=UTF-8",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    },
    TokenAnswer,
  );
  return {
    accessToken: answer.access_token,
    refreshToken: null,
    expiresAt: answer.expires_in ? new Date(now.getTime() + answer.expires_in * 1000) : null,
    externalUserId: answer.x_user_id,
  };
}

/** AccessLink issues no refresh token; a link never gets here, but if it did it is refused. */
async function refresh(): Promise<Tokens> {
  throw new DeviceHttpError("status", 400);
}

/** The account is the one the token answer named; there is nothing to ask Polar for it. */
async function userId(_accessToken: string, named?: string): Promise<string> {
  const parsed = PolarUserId.safeParse(named);
  if (!parsed.success) throw new DeviceHttpError("invalid_response");
  return parsed.data;
}

/**
 * Registers the account with Kadence's client, which AccessLink requires
 * before any data flows. The member id is Polar's field for the partner's
 * own identifier; Kadence gives a random one, so nothing about the rider
 * or the team goes with it. Already registered (409) is fine. The answer
 * carries the account's profile — name, birth date, weight, height — and
 * is discarded unread.
 */
async function register(accessToken: string): Promise<void> {
  try {
    await requestOk(`${API}/v3/users`, {
      method: "POST",
      headers: { ...bearer(accessToken), "Content-Type": "application/json" },
      body: JSON.stringify({ "member-id": randomBytes(16).toString("hex") }),
    });
  } catch (error) {
    if (error instanceof DeviceHttpError && error.status === 409) return;
    throw error;
  }
}

async function deregister(accessToken: string, externalUserId: string): Promise<void> {
  const id = PolarUserId.parse(externalUserId);
  await requestOk(`${API}/v3/users/${id}`, { method: "DELETE", headers: bearer(accessToken) });
}

/** HMAC-SHA256 of the body with the webhook's secret, as lowercase hex. */
export function polarSignature(raw: Uint8Array, secret: string): string {
  return createHmac("sha256", Buffer.from(secret, "utf8")).update(raw).digest("hex");
}

function verifyWebhook(_payload: unknown, headers: Headers, raw?: Uint8Array): boolean {
  const secret = env.POLAR_WEBHOOK_SECRET;
  if (!secret || !raw || !configured()) return false;
  const signature = headers.get("polar-webhook-signature")?.trim().toLowerCase();
  if (!signature || !/^[0-9a-f]{64}$/.test(signature)) return false;
  return safeEqual(signature, polarSignature(raw, secret));
}

const Ping = z.object({ event: z.literal("PING") });

/** AccessLink's PING, header and body both, from a configured installation. */
function isPing(payload: unknown, headers: Headers): boolean {
  return (
    configured() && headers.get("polar-webhook-event") === "PING" && Ping.safeParse(payload).success
  );
}

const Exercise = z.object({
  event: z.string().max(64),
  user_id: PolarUserId,
  entity_id: ExerciseId,
});

/** EXERCISE only; every other event type AccessLink can send is ignored. */
function webhookEvents(payload: unknown): WebhookEvent[] {
  const parsed = Exercise.safeParse(payload);
  if (!parsed.success || parsed.data.event !== "EXERCISE") return [];
  const { user_id: externalUserId, entity_id: externalId } = parsed.data;
  return [
    {
      kind: "activity",
      externalUserId,
      notification: {
        externalUserId,
        externalId,
        url: `${API}/v3/exercises/${externalId}/fit`,
        fileName: activityFileName(null, "Polar"),
      },
    },
  ];
}

async function fetchActivityFile(notification: ActivityNotification, accessToken: string | null) {
  if (!accessToken) throw new Error("polar: an exercise file takes the rider's token");
  const bytes = await downloadFile(notification.url, POLAR_FILE_HOSTS, {
    Authorization: `Bearer ${accessToken}`,
    Accept: "*/*",
  });
  return { bytes, fileName: notification.fileName, externalId: notification.externalId };
}

export const polar: DeviceProvider = {
  id: "polar",
  configured,
  authorizeUrl,
  exchangeCode,
  refresh,
  userId,
  register,
  deregister,
  fileNeedsToken: true,
  verifyWebhook,
  isPing,
  webhookEvents,
  fetchActivityFile,
};
