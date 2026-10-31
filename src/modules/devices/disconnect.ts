import { Refused } from "@/core/action";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { log } from "@/core/log";
import { withdrawGarminConsents } from "@/modules/consent/garmin";
import { loggable } from "./http";
import { accessTokenFor } from "./link-tokens";
import { deleteOwnLink, linkExternalUserId, ownLinkOwner } from "./links";
import { providerById, type ProviderId } from "./providers";

/**
 * A rider disconnects their own Wahoo, Garmin or Polar account. The
 * provider is told first where its API allows (Wahoo: DELETE
 * /v1/permissions; Garmin: DELETE …/partner-gateway/rest/user/registration,
 * which Garmin requires whenever a rider leaves, exit.ts; Polar: DELETE
 * /v3/users/{user-id}, which also revokes the token), then the link and
 * its tokens are deleted. Telling the provider is a courtesy the rider's
 * choice does not wait for: if the provider cannot be reached, or the keys
 * are gone from the installation, the link is deleted all the same and
 * the rider can revoke Kadence from the provider's own settings.
 * Disconnecting Garmin withdraws the rider's yes to Garmin with it.
 */
export async function disconnect(ctx: OrgContext, providerId: ProviderId): Promise<void> {
  const owner = await ownLinkOwner(ctx);
  const provider = providerById(providerId);
  if (provider.deregister && provider.configured()) {
    try {
      const token = await accessTokenFor(owner, provider);
      const account = await linkExternalUserId(owner, providerId);
      if (account) await provider.deregister(token, account);
    } catch (error) {
      if (!(error instanceof Refused))
        await log.error("device disconnect: deregister failed", {
          provider: providerId,
          error: loggable(error),
        });
    }
  }
  if (!(await deleteOwnLink(ctx, providerId))) throw new Refused("notFound", "not_connected");
  if (providerId === "garmin") await withOrgContext(ctx, (tx) => withdrawGarminConsents(tx, ctx));
}
