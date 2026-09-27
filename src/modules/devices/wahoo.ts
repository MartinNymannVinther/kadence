import { z } from "zod";
import { diffDays } from "@/core/dates";
import { env } from "@/core/env";
import { structureMinutes } from "@/modules/workouts/structure";
import { activityFileName } from "./file-name";
import { bearer, downloadFile, formBody, requestJson, requestOk, type HostRule } from "./http";
import { safeEqual, tokenRequest } from "./oauth";
import type { DeviceProvider, PushWorkout, WebhookEvent } from "./providers";
import { toWahooPlan } from "./wahoo-plan";

/**
 * Wahoo's Cloud API (cloud-api.wahooligan.com; developers.wahooligan.com).
 *
 * - OAuth 2.0 authorization code at api.wahooligan.com/oauth/authorize and
 *   /oauth/token, with PKCE (Wahoo documents plain and S256). Access tokens
 *   live two hours; refreshing rotates them.
 * - GET /v1/user names the account; DELETE /v1/permissions disconnects it.
 * - A `workout_summary` webhook carries the user's id, the summary's id and
 *   the FIT file's URL, and echoes the webhook token set in Wahoo's
 *   developer portal — the only proof of origin Wahoo offers, compared here
 *   in constant time. Wahoo retries until it gets a 200.
 * - A planned session goes out as a plan (POST /v1/plans, Wahoo's plan
 *   JSON as a base64 data URL, wahoo-plan.ts) scheduled by a workout on its
 *   day (POST /v1/workouts with the plan's id). Both are form posts.
 *
 * Each endpoint and shape sits in one small function below. Where the
 * public reference is thin, the function says: verify against the partner
 * docs on approval.
 */

const API = "https://api.wahooligan.com";
const SCOPES = "user_read workouts_read offline_data plans_write workouts_write";
const BIKING = 0;

/**
 * Where workout files live: Wahoo's CDN, the host its reference shows for
 * files it serves (plan files at cdn.wahooligan.com/wahoo-cloud/…). The
 * sample webhook's file URL is a placeholder, so this host is the one
 * thing to verify against the partner docs on approval.
 */
export const WAHOO_FILE_HOSTS: HostRule = { hosts: ["cdn.wahooligan.com"] };

function configured(): boolean {
  return Boolean(env.WAHOO_CLIENT_ID && env.WAHOO_CLIENT_SECRET);
}

function authorizeUrl(state: string, challenge: string, redirectUri: string): string {
  const url = new URL(`${API}/oauth/authorize`);
  url.search = new URLSearchParams({
    client_id: env.WAHOO_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

/**
 * The reference shows the token parameters as a query string; they go in
 * a form body here, which OAuth servers accept and which keeps the client
 * secret out of access logs. Verify against the partner docs on approval.
 */
function exchangeCode(code: string, verifier: string, redirectUri: string) {
  return tokenRequest(`${API}/oauth/token`, {
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri,
    client_id: env.WAHOO_CLIENT_ID,
    client_secret: env.WAHOO_CLIENT_SECRET,
  });
}

function refresh(refreshToken: string) {
  return tokenRequest(`${API}/oauth/token`, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env.WAHOO_CLIENT_ID,
    client_secret: env.WAHOO_CLIENT_SECRET,
  });
}

const WahooId = z
  .union([z.number().int().nonnegative(), z.string().regex(/^[\w-]{1,64}$/)])
  .transform(String);

async function userId(accessToken: string): Promise<string> {
  const user = await requestJson(
    `${API}/v1/user`,
    { headers: bearer(accessToken) },
    z.object({ id: WahooId }),
  );
  return user.id;
}

async function deregister(accessToken: string): Promise<void> {
  await requestOk(`${API}/v1/permissions`, { method: "DELETE", headers: bearer(accessToken) });
}

function verifyWebhook(payload: unknown): boolean {
  const expected = env.WAHOO_WEBHOOK_TOKEN;
  if (!expected || !configured() || !payload || typeof payload !== "object") return false;
  const token = (payload as { webhook_token?: unknown }).webhook_token;
  return typeof token === "string" && safeEqual(token, expected);
}

const Named = z.object({ name: z.string().max(500).nullish() }).nullish();

/** The reference's sample payload, cut to what Kadence reads. */
const WahooWebhook = z.object({
  event_type: z.string().max(64),
  user: z.object({ id: WahooId }),
  workout_summary: z
    .object({
      id: WahooId,
      file: z.object({ url: z.string().max(2048) }).nullish(),
      workout: Named,
    })
    .nullish(),
  workout: Named,
});

function webhookEvents(payload: unknown): WebhookEvent[] {
  const parsed = WahooWebhook.safeParse(payload);
  if (!parsed.success || parsed.data.event_type !== "workout_summary") return [];
  const { user, workout_summary: summary, workout } = parsed.data;
  if (!summary?.file?.url) return [];
  return [
    {
      kind: "activity",
      externalUserId: user.id,
      notification: {
        externalUserId: user.id,
        externalId: summary.id,
        url: summary.file.url,
        fileName: activityFileName(summary.workout?.name ?? workout?.name, "Wahoo"),
      },
    },
  ];
}

/** Files are served from the CDN without the user's token; none is sent there. */
async function fetchActivityFile(notification: {
  url: string;
  fileName: string;
  externalId: string;
}) {
  const bytes = await downloadFile(notification.url, WAHOO_FILE_HOSTS);
  return { bytes, fileName: notification.fileName, externalId: notification.externalId };
}

const Created = z.object({ id: WahooId });

/**
 * The plan first, then the workout that puts it on the day. `starts` is
 * noon UTC, which is the planned day in every timezone from UTC-11 to
 * UTC+11, and `day_code` (days since 2020-01-01) names the day outright.
 * The plan's external id is the session and its last change, so a session
 * changed after it was sent goes out as a new plan. Verify the form field
 * names and the day_code convention against the partner docs on approval.
 */
async function pushWorkout(accessToken: string, workout: PushWorkout) {
  const plan = toWahooPlan(workout.structure, workout.rider, workout.name, workout.description);
  const file = Buffer.from(JSON.stringify(plan), "utf8").toString("base64");
  const headers = { ...bearer(accessToken), "Content-Type": "application/x-www-form-urlencoded" };
  const created = await requestJson(
    `${API}/v1/plans`,
    {
      method: "POST",
      headers,
      body: formBody({
        "plan[file]": `data:application/json;base64,${file}`,
        "plan[filename]": "plan.json",
        "plan[external_id]": `kadence-${workout.sessionId}-${workout.updatedAt.getTime()}`,
        "plan[provider_updated_at]": workout.updatedAt.toISOString(),
      }),
    },
    Created,
  );
  const scheduled = await requestJson(
    `${API}/v1/workouts`,
    {
      method: "POST",
      headers,
      body: formBody({
        "workout[name]": plan.header.name,
        "workout[workout_token]": workout.sessionId,
        "workout[workout_type_id]": BIKING,
        "workout[starts]": `${workout.onDate}T12:00:00.000Z`,
        "workout[minutes]": Math.max(1, structureMinutes(workout.structure)),
        "workout[plan_id]": created.id,
        "workout[day_code]": diffDays("2020-01-01", workout.onDate),
      }),
    },
    Created,
  );
  return { externalId: scheduled.id };
}

export const wahoo: DeviceProvider = {
  id: "wahoo",
  configured,
  authorizeUrl,
  exchangeCode,
  refresh,
  userId,
  deregister,
  fileNeedsToken: false,
  verifyWebhook,
  webhookEvents,
  fetchActivityFile,
  pushWorkout,
};
