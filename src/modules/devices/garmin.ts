import { z } from "zod";
import { env } from "@/core/env";
import { activityFileName } from "./file-name";
import { toGarminWorkout } from "./garmin-workout";
import { bearer, downloadFile, requestJson, requestOk, type HostRule } from "./http";
import { safeEqual, tokenRequest } from "./oauth";
import type { ActivityNotification, DeviceProvider, PushWorkout, WebhookEvent } from "./providers";

/**
 * Garmin's Connect Developer Program: OAuth 2.0 with PKCE (Garmin left
 * OAuth 1.0a behind), the Activity API's ping notifications, and the
 * Training API. Onboarding to the program was paused in 2026; this adapter
 * is complete and stays inert until GARMIN_CLIENT_ID and _SECRET are set.
 *
 * From Garmin's public "OAuth2.0 PKCE Specification" (developerportal.
 * garmin.com): authorize at connect.garmin.com/oauth2Confirm (S256), tokens
 * at diauth.garmin.com/di-oauth2-service/oauth/token as a form post with
 * the client secret and the code verifier; access tokens live a day and
 * each refresh returns a new refresh token; the user's id at
 * apis.garmin.com/wellness-api/rest/user/id; and DELETE …/user/registration,
 * which Garmin requires when a partner offers a "disconnect".
 *
 * The Activity API and Training API references are for approved partners.
 * Pings follow the public Health API specification and Garmin's published
 * examples: `{"activityFiles": [{userId, summaryId, fileType, callbackURL,
 * activityId, …}]}` and `{"deregistrations": [{userId}]}`, answered with a
 * 200 before any callback is made. Each of those shapes sits in one
 * function below marked: verify against the partner docs on approval.
 *
 * Garmin does not sign notifications. The residual risk and what limits
 * it are written at `verifyWebhook`.
 */

const API = "https://apis.garmin.com";
const AUTHORIZE = "https://connect.garmin.com/oauth2Confirm";
const TOKEN = "https://diauth.garmin.com/di-oauth2-service/oauth/token";

/** Activity files come from Garmin's API host, on the activity file path, with the rider's token. */
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
    `${API}/wellness-api/rest/user/id`,
    { headers: bearer(accessToken) },
    z.object({ userId: GarminId }),
  );
  return answer.userId;
}

async function deregister(accessToken: string): Promise<void> {
  await requestOk(`${API}/wellness-api/rest/user/registration`, {
    method: "DELETE",
    headers: bearer(accessToken),
  });
}

/**
 * Garmin offers no signature on its notifications, so there is nothing
 * to prove origin with. What a forged ping can do is therefore limited
 * elsewhere, and this is the residual risk accepted:
 *
 * - the file is fetched only from apis.garmin.com's activity file path,
 *   over https, with the token of the rider the ping names — so a forgery
 *   can at most make Kadence fetch that rider's own activity from Garmin,
 *   and never anything from anywhere else;
 * - the same activity twice is a duplicate and changes nothing;
 * - a deregistration is believed only once Garmin itself refuses the
 *   rider's token (webhooks.ts), so a forgery cannot disconnect anyone;
 * - the endpoint is rate limited per address and body-capped.
 *
 * One more check where Garmin gives the means: a notification that names
 * a client (the `garmin-client-id` header) must name this installation's.
 * Verify against the partner docs on approval whether that header is sent
 * on every notification; if it is, it should become required.
 */
function verifyWebhook(payload: unknown, headers: Headers): boolean {
  if (!configured() || !payload || typeof payload !== "object" || Array.isArray(payload))
    return false;
  const client = headers.get("garmin-client-id");
  return client === null || safeEqual(client, env.GARMIN_CLIENT_ID ?? "");
}

const Ping = z.object({
  activityFiles: z
    .array(
      z.object({
        userId: GarminId,
        summaryId: z.union([z.string().max(100), z.number()]).nullish(),
        activityId: z.union([z.string().max(100), z.number()]).nullish(),
        activityName: z.string().max(500).nullish(),
        fileType: z.string().max(16).nullish(),
        callbackURL: z.string().max(2048),
      }),
    )
    .max(200)
    .nullish(),
  deregistrations: z
    .array(z.object({ userId: GarminId }))
    .max(200)
    .nullish(),
});

/** Activity files (FIT only) and deregistrations; every other summary type is ignored. */
function webhookEvents(payload: unknown): WebhookEvent[] {
  const parsed = Ping.safeParse(payload);
  if (!parsed.success) return [];
  const events: WebhookEvent[] = [];
  for (const file of parsed.data.activityFiles ?? []) {
    if ((file.fileType ?? "FIT").toUpperCase() !== "FIT") continue;
    const externalId = String(file.activityId ?? file.summaryId ?? "");
    if (!/^[\w-]{1,100}$/.test(externalId)) continue;
    events.push({
      kind: "activity",
      externalUserId: file.userId,
      notification: {
        externalUserId: file.userId,
        externalId,
        url: file.callbackURL,
        fileName: activityFileName(file.activityName, "Garmin"),
      },
    });
  }
  for (const gone of parsed.data.deregistrations ?? [])
    events.push({ kind: "deregistration", externalUserId: gone.userId });
  return events;
}

async function fetchActivityFile(notification: ActivityNotification, accessToken: string | null) {
  if (!accessToken) throw new Error("garmin: an activity file takes the rider's token");
  const bytes = await downloadFile(notification.url, GARMIN_FILE_HOSTS, bearer(accessToken));
  return { bytes, fileName: notification.fileName, externalId: notification.externalId };
}

/**
 * Creates the workout, then schedules it on its day. Verify the paths
 * (training-api/workout and training-api/schedule), the answer's
 * `workoutId` and the schedule body against the partner docs on approval.
 */
async function pushWorkout(accessToken: string, workout: PushWorkout) {
  const headers = { ...bearer(accessToken), "Content-Type": "application/json" };
  const body = toGarminWorkout(workout.structure, workout.rider, workout.name, workout.description);
  const created = await requestJson(
    `${API}/training-api/workout`,
    { method: "POST", headers, body: JSON.stringify(body) },
    z.object({ workoutId: z.union([z.number().int(), z.string().regex(/^[\w-]{1,100}$/)]) }),
  );
  await requestOk(`${API}/training-api/schedule`, {
    method: "POST",
    headers,
    body: JSON.stringify({ workoutId: created.workoutId, date: workout.onDate }),
  });
  return { externalId: String(created.workoutId) };
}

export const garmin: DeviceProvider = {
  id: "garmin",
  configured,
  authorizeUrl,
  exchangeCode,
  refresh,
  userId,
  deregister,
  fileNeedsToken: true,
  verifyWebhook,
  webhookEvents,
  fetchActivityFile,
  pushWorkout,
};
