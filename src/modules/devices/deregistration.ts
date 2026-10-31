import { and, eq } from "drizzle-orm";
import { Refused } from "@/core/action";
import { deviceLinks } from "@/core/db/schema";
import { withOrgContext } from "@/core/db/tenant";
import { withdrawGarminConsents } from "@/modules/consent/garmin";
import { DeviceHttpError } from "./http";
import { NO_TOKENS } from "./link-seal";
import { accessTokenFor } from "./link-tokens";
import type { LinkOwner } from "./links";
import type { WebhookOutcome } from "./outcome";
import type { DeviceProvider } from "./providers";

/**
 * Garmin says a rider is gone: they removed Kadence in Garmin Connect, or
 * Kadence asked Garmin to forget them (docs/adr/0113). The push is
 * unsigned, so it is believed only when Garmin itself refuses the rider's
 * token — asking whose account it is (a 401 or 403), or refusing to renew
 * it. A forged push therefore cannot disconnect anyone. Garmin merely
 * unavailable is tried again later.
 *
 * Confirmed, the link ends as disconnecting would end it, in the rider's
 * name: the tokens go, the link stays as "revoked" with `deregistered` so
 * the rider's devices page says what happened, and both of the rider's
 * yeses to Garmin — to rides coming in and to the AI reading them — are
 * withdrawn in the same transaction.
 */
export async function confirmDeregistration(
  provider: DeviceProvider,
  owner: LinkOwner,
): Promise<WebhookOutcome> {
  let token: string;
  try {
    token = await accessTokenFor(owner, provider);
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    // Garmin would not renew the token: that is Garmin saying so.
    if (error.detail === "reconnect") return endLink(provider, owner);
    if (error.detail === "provider_unavailable") throw error;
    return "revoked";
  }
  try {
    await provider.userId(token);
    return "still_connected";
  } catch (error) {
    if (!(error instanceof DeviceHttpError)) throw error;
    const refused = error.status === 401 || error.status === 403;
    if (!refused && !error.rejected) throw error;
    if (!refused) return "still_connected";
  }
  return endLink(provider, owner);
}

/** The link without tokens, "revoked", and the rider's yeses to Garmin withdrawn. */
export async function endLink(provider: DeviceProvider, owner: LinkOwner): Promise<WebhookOutcome> {
  const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
  await withOrgContext(riderCtx, async (tx) => {
    await tx
      .update(deviceLinks)
      .set({ ...NO_TOKENS, permissions: null, status: "revoked", lastError: "deregistered" })
      .where(and(eq(deviceLinks.riderId, owner.riderId), eq(deviceLinks.provider, provider.id)));
    if (provider.id === "garmin") await withdrawGarminConsents(tx, riderCtx);
  });
  return "revoked";
}
