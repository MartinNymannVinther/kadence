import { and, eq } from "drizzle-orm";
import { Refused } from "@/core/action";
import { deviceLinks } from "@/core/db/schema";
import { withOrgContext } from "@/core/db/tenant";
import { GiveUp } from "@/core/jobs/registry";
import { isPlanRefusal } from "@/modules/billing/plan";
import { isQuotaRefusal } from "@/modules/storage/quota";
import { DeviceHttpError } from "./http";
import { importFitIn } from "./import";
import { dropWaiting, dropWaitingIn, keepWaiting, waitingFile, type InboxKey } from "./inbox";
import { accessTokenFor } from "./link-tokens";
import { markLink, type LinkOwner } from "./links";
import type { WebhookOutcome } from "./outcome";
import type { ActivityNotification, DeviceProvider } from "./providers";

/**
 * One ride a provider told Kadence about, in the worker (webhooks.ts):
 * downloaded once, kept, imported as the rider.
 *
 * 1. A file an earlier try already downloaded is taken from the inbox
 *    (inbox.ts) and not asked for again: Garmin answers a second download
 *    with 410.
 * 2. Otherwise it is fetched — with the rider's token where the provider
 *    needs one — and kept in the inbox before anything else happens.
 * 3. It is imported as the rider, exactly as the rider's own upload, and
 *    leaves the inbox in the same transaction. A ride refused for good (a
 *    duplicate, a file that cannot be read, a full quota, a workspace that
 *    may only be read) leaves it too; an error worth trying again keeps it
 *    for the next try, until the last, which lets it go and says so on
 *    the link.
 *
 * The link notes the outcome: the last sync, or a short code in
 * `last_error` that the devices page puts into words.
 */

/** The provider could not answer just now: worth asking again later. */
function unavailable(error: DeviceHttpError): boolean {
  return (
    error.code === "timeout" ||
    error.code === "network" ||
    (error.code === "status" && !error.rejected)
  );
}

export type ActivityTry = { lastTry?: boolean };

export async function processActivity(
  provider: DeviceProvider,
  owner: LinkOwner,
  notification: ActivityNotification,
  { lastTry = false }: ActivityTry = {},
): Promise<WebhookOutcome> {
  const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
  const key: InboxKey = {
    riderId: owner.riderId,
    provider: provider.id,
    externalId: notification.externalId,
  };

  let waiting = await waitingFile(riderCtx, key);
  if (!waiting) {
    let token: string | null = null;
    if (provider.fileNeedsToken) {
      try {
        token = await accessTokenFor(owner, provider);
      } catch (error) {
        // A provider that could not renew the token just now is asked
        // again with the job: Garmin's file waits a day, not forever.
        if (error instanceof Refused && error.detail !== "provider_unavailable") return "reconnect";
        throw error;
      }
    }
    try {
      const file = await provider.fetchActivityFile(notification, token);
      waiting = {
        bytes: file.bytes,
        fileName: file.fileName,
        deviceName: notification.deviceName ?? null,
        sport: notification.sport ?? null,
      };
    } catch (error) {
      if (!(error instanceof DeviceHttpError)) throw error;
      if (error.gone) {
        await markLink(riderCtx, owner.riderId, provider.id, { lastError: "download_gone" });
        return "gone";
      }
      await markLink(
        riderCtx,
        owner.riderId,
        provider.id,
        token && error.unauthorized
          ? { status: "error", lastError: "unauthorized" }
          : { lastError: `download_${error.code}` },
      );
      if (unavailable(error)) throw error;
      return "download_failed";
    }
    await keepWaiting(riderCtx, key, waiting);
  }

  const file = waiting;
  try {
    await withOrgContext(riderCtx, async (tx) => {
      await importFitIn(tx, riderCtx, owner.riderId, file.fileName, file.bytes, {
        source: provider.id,
        externalId: notification.externalId,
        deviceName: file.deviceName,
        sport: file.sport ?? undefined,
      });
      await dropWaitingIn(tx, key);
      await tx
        .update(deviceLinks)
        .set({ lastSyncAt: new Date(), lastError: "" })
        .where(and(eq(deviceLinks.riderId, owner.riderId), eq(deviceLinks.provider, provider.id)));
    });
    return "imported";
  } catch (error) {
    if (!(error instanceof Refused)) {
      if (lastTry) {
        await dropWaiting(riderCtx, key);
        await markLink(riderCtx, owner.riderId, provider.id, { lastError: "import_failed" });
      }
      throw error;
    }
    await dropWaiting(riderCtx, key);
    return refusedOutcome(provider, owner, error);
  }
}

/** A ride the import refused for good: the link says why, and the job ends or gives up. */
async function refusedOutcome(
  provider: DeviceProvider,
  owner: LinkOwner,
  error: Refused,
): Promise<WebhookOutcome> {
  const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
  if (error.detail === "duplicate") {
    await markLink(riderCtx, owner.riderId, provider.id, { lastSyncAt: new Date(), lastError: "" });
    return "duplicate";
  }
  if (isQuotaRefusal(error)) {
    // The workspace's file quota is full (docs/adr/0087): trying again in
    // an hour changes nothing, so the job gives up and the link says why.
    // The rider can still upload the file from the provider's own pages.
    await markLink(riderCtx, owner.riderId, provider.id, { lastError: "quota" });
    throw new GiveUp("quota");
  }
  if (isPlanRefusal(error)) {
    // The workspace may only be read (docs/adr/0090): the same, until the
    // installation's owner registers a payment.
    await markLink(riderCtx, owner.riderId, provider.id, { lastError: "planExpired" });
    throw new GiveUp("planExpired");
  }
  if (error.code === "invalid") {
    await markLink(riderCtx, owner.riderId, provider.id, { lastError: "invalid_file" });
    return "invalid_file";
  }
  return "refused";
}
