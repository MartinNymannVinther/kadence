import { Refused } from "@/core/action";
import { appPool } from "@/core/db/client";
import { payload } from "@/core/jobs/payload";
import { handle, jobKind } from "@/core/jobs/registry";
import { SCHEDULE } from "@/core/jobs/schedule";
import { log } from "@/core/log";
import { loggable } from "./http";
import { renewLink } from "./link-tokens";
import type { LinkOwner } from "./links";
import { refreshPermissions } from "./permissions";
import { providerById } from "./providers";

/**
 * Keeps Garmin links alive (docs/adr/0113), once a day. Garmin's refresh
 * token runs out a few months after it was issued, and only a refresh
 * hands out a new one. A rider who stops riding for the winter makes no
 * call that would refresh it, so without this the link would die quietly
 * — and with it Kadence's means of telling Garmin to forget the rider.
 * A link whose refresh token runs out within RENEW_AHEAD_MS, or whose
 * end nobody knows, is renewed; a link whose permissions were never read
 * has them read. Neither asks Garmin for any data.
 *
 * `device_links_to_renew()` (drizzle/0061) names the links, three ids
 * each, for this job with nobody signed in; everything after it runs as
 * the rider, under the ordinary policies, exactly as a ride from a push
 * does. A link Garmin refuses to renew is left in "error" for the rider
 * to connect again (link-tokens.ts); one Garmin did not answer for is
 * tried again tomorrow, which leaves two weeks of tries. The log gets
 * counts only.
 */

/** How long before the refresh token runs out a link is renewed. */
export const RENEW_AHEAD_MS = 14 * 24 * 60 * 60 * 1000;

export const deviceRefresh = jobKind("device.refresh", payload({}), {
  every: SCHEDULE.deviceRefresh,
  timeoutMs: 10 * 60_000,
});

export type RefreshRun = { renewed: number; permissions: number; failed: number };

type Due = {
  org_id: string;
  rider_id: string;
  rider_user_id: string;
  renew: boolean;
  unknown_permissions: boolean;
};

export async function renewGarminLinks(
  now: Date = new Date(),
  signal?: AbortSignal,
): Promise<RefreshRun> {
  const run: RefreshRun = { renewed: 0, permissions: 0, failed: 0 };
  const garmin = providerById("garmin");
  if (!garmin.configured()) return run;
  const { rows } = await appPool.query<Due>("select * from device_links_to_renew($1, $2)", [
    "garmin",
    new Date(now.getTime() + RENEW_AHEAD_MS),
  ]);
  for (const row of rows) {
    if (signal?.aborted) break;
    const owner: LinkOwner = {
      orgId: row.org_id,
      riderId: row.rider_id,
      riderUserId: row.rider_user_id,
    };
    try {
      if (row.renew) {
        await renewLink(owner, garmin);
        run.renewed++;
      }
      if (row.unknown_permissions && (await refreshPermissions(garmin, owner)) === "permissions")
        run.permissions++;
    } catch (error) {
      run.failed++;
      if (!(error instanceof Refused))
        await log.warn("device refresh: a link was not renewed", { error: loggable(error) });
    }
  }
  await log.info("device refresh: garmin links", run);
  return run;
}

export const deviceRefreshHandler = handle(deviceRefresh, (_payload, { signal }) =>
  renewGarminLinks(new Date(), signal),
);
