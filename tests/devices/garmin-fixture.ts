import type { Pool } from "pg";
import { saveLink } from "@/modules/devices/links";
import { handleWebhook, type WebhookOutcome } from "@/modules/devices/webhooks";
import { drainResults } from "../helpers/jobs";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Simulated pushes from Garmin for the tests of docs/adr/0113: what a
 * push carries as the proxy in front passes it on, and a team of riders
 * with Garmin links, each with a Garmin user id of its own (`<key>-<who>`)
 * so no two test files claim the same Garmin account.
 */

export const CALLBACK = "https://apis.garmin.com/wellness-api/rest/activityFile";
export const FROM_GARMIN = {
  "garmin-client-id": "garmin-client",
  "x-forwarded-for": "204.77.162.10",
};
export const ID_URL = "GET https://apis.garmin.com/partner-gateway/rest/user/id";
export const PERMISSIONS_URL = "GET https://apis.garmin.com/partner-gateway/rest/user/permissions";
export const TOKEN_URL = "POST https://diauth.garmin.com/di-oauth2-service/oauth/token";

export function postGarmin(body: unknown, headers: Record<string, string> = FROM_GARMIN) {
  return handleWebhook(
    "garmin",
    new Request("http://localhost:3000/api/devices/garmin/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

/** Posts a push, then runs the jobs it queued as the worker would; their outcomes. */
export async function deliverGarmin(body: unknown) {
  const response = await postGarmin(body);
  const outcomes = (await drainResults(["device.fetch"])) as WebhookOutcome[];
  return { status: response.status, outcomes };
}

/** A team `org_<key>` with a rider `<key>_<who>` per name, each with a connected Garmin link. */
export async function seedGarminTeam(
  admin: Pool,
  key: string,
  people: readonly string[],
  expired: readonly string[] = [],
) {
  const orgId = `org_${key}`;
  const ctx = (who: string) => ({ orgId, userId: `user_${key}_${who}` });
  for (const who of people) {
    await seedPerson(admin, orgId, ctx(who).userId, "member");
    const q = insertSql("riders", {
      org_id: orgId,
      id: `${key}_${who}`,
      user_id: ctx(who).userId,
      name: who,
      birth_year: 2008,
    });
    await admin.query(q.text, q.values);
    const expiresAt = new Date(Date.now() + (expired.includes(who) ? -60_000 : 3600_000));
    await saveLink(
      ctx(who),
      "garmin",
      `${key}-${who}`,
      { accessToken: `acc-${who}`, refreshToken: `ref-${who}`, expiresAt },
      ["ACTIVITY_EXPORT", "WORKOUT_IMPORT"],
    );
  }
  const link = async (who: string) =>
    (
      await admin.query("select * from device_links where rider_id = $1 and provider = 'garmin'", [
        `${key}_${who}`,
      ])
    ).rows[0] as Record<string, unknown>;
  return { orgId, ctx, link };
}
