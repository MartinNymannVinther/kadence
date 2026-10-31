import { and, eq } from "drizzle-orm";
import { Refused } from "@/core/action";
import { deviceLinks } from "@/core/db/schema";
import { withOrgContext } from "@/core/db/tenant";
import { log } from "@/core/log";
import { DeviceHttpError, loggable } from "./http";
import { accessTokenFor } from "./link-tokens";
import { markLink, type LinkOwner } from "./links";
import type { WebhookOutcome } from "./outcome";
import type { DeviceProvider } from "./providers";

/**
 * The rider's permissions at the provider, read with the rider's token and
 * kept on the link (docs/adr/0113): after connecting (connect.ts), when
 * Garmin pushes that they changed (webhooks.ts), and by the daily job for
 * a link whose list was never read (refresh-job.ts). A push's own list is
 * never trusted; it comes unsigned. Reading them asks Garmin for no data.
 */

/** The list, or null when the provider has none or did not answer; never throws. */
export async function readPermissionsQuietly(
  provider: DeviceProvider,
  accessToken: string,
): Promise<string[] | null> {
  if (!provider.permissions) return null;
  try {
    return await provider.permissions(accessToken);
  } catch (error) {
    await log.warn("device permissions: not read", {
      provider: provider.id,
      error: loggable(error),
    });
    return null;
  }
}

/**
 * Reads the list again for a connected link and stores it, as the rider.
 * A token Garmin refuses leaves the link in "error" for the rider to
 * connect again; a provider that is unavailable is thrown, so the job is
 * tried again later.
 */
export async function refreshPermissions(
  provider: DeviceProvider,
  owner: LinkOwner,
): Promise<WebhookOutcome> {
  if (!provider.permissions) return "refused";
  const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
  let permissions: string[];
  try {
    const token = await accessTokenFor(owner, provider);
    permissions = await provider.permissions(token);
  } catch (error) {
    if (error instanceof Refused && error.detail === "provider_unavailable") throw error;
    if (error instanceof Refused) return "reconnect";
    if (!(error instanceof DeviceHttpError)) throw error;
    if (error.unauthorized) {
      await markLink(riderCtx, owner.riderId, provider.id, {
        status: "error",
        lastError: "unauthorized",
      });
      return "reconnect";
    }
    if (!error.rejected) throw error;
    await log.warn("device permissions: refused", {
      provider: provider.id,
      error: loggable(error),
    });
    return "refused";
  }
  await withOrgContext(riderCtx, (tx) =>
    tx
      .update(deviceLinks)
      .set({ permissions })
      .where(and(eq(deviceLinks.riderId, owner.riderId), eq(deviceLinks.provider, provider.id))),
  );
  return "permissions";
}
