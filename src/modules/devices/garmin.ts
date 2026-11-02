import { z } from "zod";
import { env } from "@/core/env";
import { clientAddress } from "@/core/rate-limit";
import { fromGarmin } from "./garmin-ip";
import { garminPushEvents } from "./garmin-push";
import { garminTraining } from "./garmin-training";
import { bearer, downloadFile, requestJson, requestOk, type HostRule } from "./http";
import { safeEqual, tokenRequest } from "./oauth";
import type { ActivityNotification, DeviceProvider } from "./providers";

/**
 * Garmin's Connect Developer Program on its Starter tier (docs/adr/0113):
 * OAuth 2.0 with PKCE, and everything else pushed by Garmin. The adapter
 * stays inert until GARMIN_CLIENT_ID and GARMIN_CLIENT_SECRET are set.
 *
 * - The rider authorizes at connect.garmin.com/oauth2Confirm (S256);
 *   tokens come from diauth.garmin.com as a form post with the client's
 *   secret and the code verifier. An access token lives a day; each
 *   refresh hands back a new refresh token and says when it runs out.
 * - The account's id, the rider's permissions and the deregistration live
 *   on Garmin's partner gateway (`/partner-gateway/rest/user/…`).
 *   Deregistering is required whenever a rider leaves Kadence in any way
 *   (disconnect.ts, exit.ts).
 * - Garmin pushes: a ride's file is ready (with a one-time download
 *   address on the activity file path), a rider deregistered, or a
 *   rider's permissions changed (garmin-push.ts). Every push is answered
 *   200 before any call back to Garmin (webhooks.ts).
 * - Planned bike sessions go to the rider's Garmin calendar through the
 *   Training API, version 2 (garmin-training.ts, docs/adr/0114), and are
 *   changed and taken off again there; never without the rider's
 *   WORKOUT_IMPORT.
 *
 * Garmin signs no push. What a push is checked by, and the residual risk,
 * are written at `verifyWebhook`.
 */

const API = "https://apis.garmin.com";
const PARTNER = `${API}/partner-gateway/rest`;
const AUTHORIZE = "https://connect.garmin.com/oauth2Confirm";
const TOKEN = "https://diauth.garmin.com/di-oauth2-service/oauth/token";

/** Activity files come from Garmin's API host, on the activity file path. */
export const GARMIN_FILE_HOSTS: HostRule = {
  hosts: ["apis.garmin.com"],
  pathPrefix: "/wellness-api/rest/activityFile",
};

function configured(): boolean {
  return Boolean(env.GARMIN_CLIENT_ID && env.GARMIN_CLIENT_SECRET);
}

function authorizeUrl(state: string, challenge: string, redirectUri: string): string {
  const url = new URL(AUTHORIZE);
  url.search = new URLSearchParams({
    client_id: env.GARMIN_CLIENT_ID ?? "",
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    redirect_uri: redirectUri,
    state,
  }).toString();
  return url.toString();
}

function exchangeCode(code: string, verifier: string, redirectUri: string) {
  return tokenRequest(TOKEN, {
    grant_type: "authorization_code",
    client_id: env.GARMIN_CLIENT_ID,
    client_secret: env.GARMIN_CLIENT_SECRET,
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri,
  });
}

function refresh(refreshToken: string) {
  return tokenRequest(TOKEN, {
    grant_type: "refresh_token",
    client_id: env.GARMIN_CLIENT_ID,
    client_secret: env.GARMIN_CLIENT_SECRET,
    refresh_token: refreshToken,
  });
}

const GarminId = z.string().regex(/^[\w-]{1,100}$/);

async function userId(accessToken: string): Promise<string> {
  const answer = await requestJson(
    `${PARTNER}/user/id`,
    { headers: bearer(accessToken) },
    z.object({ userId: GarminId }),
  );
  return answer.userId;
}

async function deregister(accessToken: string, _externalUserId: string, timeoutMs?: number) {
  await requestOk(
    `${PARTNER}/user/registration`,
    { method: "DELETE", headers: bearer(accessToken) },
    timeoutMs,
  );
}

/** A permission's name as Garmin writes it; anything else in the answer is left out. */
const PERMISSION = /^[A-Z][A-Z_]{0,63}$/;

async function permissions(accessToken: string): Promise<string[]> {
  const answer = await requestJson(
    `${PARTNER}/user/permissions`,
    { headers: bearer(accessToken) },
    z.object({ permissions: z.array(z.unknown()).max(100) }),
  );
  const names = answer.permissions.filter(
    (p): p is string => typeof p === "string" && PERMISSION.test(p),
  );
  return [...new Set(names)].sort();
}

/**
 * Garmin signs no push, so a push is believed only when both of these
 * hold, and refused with a 401 otherwise:
 *
 * - it names this installation in the `garmin-client-id` header, compared
 *   in constant time; a push without the header is refused;
 * - it comes from one of Garmin's own address ranges (garmin-ip.ts), as
 *   the installation's proxy saw it (`clientAddress`, TRUSTED_PROXY_HOPS).
 *
 * What a push that gets through anyway can do is limited elsewhere, and
 * that is the residual risk accepted: a file is fetched only from
 * apis.garmin.com's activity file path, over https, and imported as the
 * rider the push names, where the same activity twice is a duplicate; a
 * deregistration is believed only once Garmin refuses the rider's token;
 * a permission change only makes Kadence ask Garmin again; and the
 * endpoint is rate limited per address and body-capped (webhooks.ts).
 */
function verifyWebhook(payload: unknown, headers: Headers): boolean {
  if (!configured() || !payload || typeof payload !== "object" || Array.isArray(payload))
    return false;
  const client = headers.get("garmin-client-id");
  if (client === null || !safeEqual(client.trim(), env.GARMIN_CLIENT_ID ?? "")) return false;
  return fromGarmin(clientAddress(headers));
}

/**
 * The one-time download. The address carries its own token; the rider's
 * bearer token goes with it as well, as for every call to Garmin's API.
 */
async function fetchActivityFile(notification: ActivityNotification, accessToken: string | null) {
  if (!accessToken) throw new Error("garmin: an activity file takes the rider's token");
  const bytes = await downloadFile(notification.url, GARMIN_FILE_HOSTS, bearer(accessToken));
  return { bytes, fileName: notification.fileName, externalId: notification.externalId };
}

export const garmin: DeviceProvider = {
  id: "garmin",
  configured,
  authorizeUrl,
  exchangeCode,
  refresh,
  userId,
  deregister,
  permissions,
  fileNeedsToken: true,
  verifyWebhook,
  webhookEvents: garminPushEvents,
  fetchActivityFile,
  calendar: garminTraining,
};
