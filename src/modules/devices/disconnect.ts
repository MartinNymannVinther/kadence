import { Refused } from "@/core/action";
import type { OrgContext } from "@/core/db/tenant";
import { loggable } from "./http";
import { accessTokenFor, deleteOwnLink, ownLinkOwner } from "./links";
import { providerById, type ProviderId } from "./providers";

/**
 * A rider disconnects their own Wahoo or Garmin account. The provider is
 * told first where its API allows (Wahoo: DELETE /v1/permissions; Garmin:
 * DELETE …/user/registration, which Garmin requires of a partner that
 * offers a disconnect), then the link and its tokens are deleted. Telling
 * the provider is a courtesy the rider's choice does not wait for: if the
 * provider cannot be reached, or the keys are gone from the installation,
 * the link is deleted all the same and the rider can revoke Kadence from
 * the provider's own settings.
 */
export async function disconnect(ctx: OrgContext, providerId: ProviderId): Promise<void> {
  const owner = await ownLinkOwner(ctx);
  const provider = providerById(providerId);
  if (provider.deregister && provider.configured()) {
    try {
      await provider.deregister(await accessTokenFor(owner, provider));
    } catch (error) {
      if (!(error instanceof Refused))
        console.error("device disconnect: deregister failed", providerId, loggable(error));
    }
  }
  if (!(await deleteOwnLink(ctx, providerId))) throw new Refused("notFound", "not_connected");
}
