import { and, eq } from "drizzle-orm";
import { Refused } from "@/core/action";
import { deviceLinks } from "@/core/db/schema";
import { withOrgContext } from "@/core/db/tenant";
import { callerKey, rateLimit } from "@/core/rate-limit";
import { DeviceHttpError, loggable, readLimited } from "./http";
import { importFitIn } from "./import";
import { accessTokenFor, linkOwner, markLink, type LinkOwner } from "./links";
import { isProviderId, providerById, type DeviceProvider, type WebhookEvent } from "./providers";

/**
 * A provider tells Kadence something happened: a ride was saved, a rider
 * left. The request is rate limited per address, its body capped, and its
 * origin verified before any row is touched — a failed verification is a
 * 401 and nothing else happens. A verified notification is answered 200
 * at once, recognised or not (an unknown user, a duplicate, an event
 * Kadence does not use), so the provider does not retry it for days; the
 * work runs after the answer (`defer`, Next's `after()` in the route),
 * which is also what Garmin requires: respond, then call back.
 *
 * The work is done as the rider. `device_link_owner` finds whose link the
 * provider's user id is; from there the transaction runs with the rider's
 * team and account as its context, so the import, the dedupe and the
 * match to the planned session are exactly those of the rider's own
 * upload, under the same policies. The link notes the outcome: the last
 * sync, or a short code in `last_error`.
 *
 * Nothing about the payload or a token is logged.
 */

export const MAX_WEBHOOK_BYTES = 256 * 1024;
/** At most this many events are worked through per notification. */
const MAX_EVENTS = 50;
const RATE_LIMIT = { count: 600, windowMs: 60_000 };

export type Defer = (work: () => Promise<unknown>) => void;

export type WebhookOutcome =
  | "imported"
  | "duplicate"
  | "unknown_user"
  | "download_failed"
  | "invalid_file"
  | "reconnect"
  | "revoked"
  | "still_connected"
  | "refused";

export async function handleWebhook(
  providerId: string,
  request: Request,
  defer: Defer,
): Promise<Response> {
  if (!isProviderId(providerId)) return new Response(null, { status: 404 });
  const provider = providerById(providerId);

  const limit = await rateLimit(
    callerKey(request.headers, `device-webhook:${provider.id}`),
    RATE_LIMIT.count,
    RATE_LIMIT.windowMs,
  );
  if (!limit.allowed)
    return new Response(null, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });

  let payload: unknown;
  let raw: Uint8Array;
  try {
    raw = await readLimited(request.body, MAX_WEBHOOK_BYTES, request.headers.get("content-length"));
    payload = JSON.parse(new TextDecoder().decode(raw));
  } catch (error) {
    const tooLarge = error instanceof DeviceHttpError && error.code === "too_large";
    return new Response(null, { status: tooLarge ? 413 : 400 });
  }

  // A ping asks for nothing and comes before the provider has handed over
  // the key it signs with (Polar): it is answered, and nothing else happens.
  if (provider.isPing?.(payload, request.headers)) return new Response(null, { status: 200 });
  if (!provider.verifyWebhook(payload, request.headers, raw))
    return new Response(null, { status: 401 });

  const events = provider.webhookEvents(payload).slice(0, MAX_EVENTS);
  if (events.length > 0) defer(() => processWebhookEvents(provider, events));
  return new Response(null, { status: 200 });
}

/** Works through a verified notification's events one by one; one failing stops none of the others. */
export async function processWebhookEvents(
  provider: DeviceProvider,
  events: WebhookEvent[],
): Promise<WebhookOutcome[]> {
  const outcomes: WebhookOutcome[] = [];
  for (const event of events) {
    try {
      outcomes.push(await processEvent(provider, event));
    } catch (error) {
      console.error("device webhook: event failed", provider.id, loggable(error));
      outcomes.push("refused");
    }
  }
  return outcomes;
}

async function processEvent(
  provider: DeviceProvider,
  event: WebhookEvent,
): Promise<WebhookOutcome> {
  const owner = await linkOwner(provider.id, event.externalUserId);
  if (!owner) return "unknown_user";
  if (event.kind === "deregistration") return confirmDeregistration(provider, owner);

  const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
  let token: string | null = null;
  if (provider.fileNeedsToken) {
    try {
      token = await accessTokenFor(owner, provider);
    } catch (error) {
      if (error instanceof Refused) return "reconnect";
      throw error;
    }
  }

  let file;
  try {
    file = await provider.fetchActivityFile(event.notification, token);
  } catch (error) {
    if (!(error instanceof DeviceHttpError)) throw error;
    await markLink(
      riderCtx,
      owner.riderId,
      provider.id,
      token && error.unauthorized
        ? { status: "error", lastError: "unauthorized" }
        : { lastError: `download_${error.code}` },
    );
    return "download_failed";
  }

  try {
    await withOrgContext(riderCtx, async (tx) => {
      await importFitIn(tx, riderCtx, owner.riderId, file.fileName, file.bytes, {
        source: provider.id,
        externalId: file.externalId,
      });
      await tx
        .update(deviceLinks)
        .set({ lastSyncAt: new Date(), lastError: "" })
        .where(and(eq(deviceLinks.riderId, owner.riderId), eq(deviceLinks.provider, provider.id)));
    });
    return "imported";
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    if (error.detail === "duplicate") {
      await markLink(riderCtx, owner.riderId, provider.id, {
        lastSyncAt: new Date(),
        lastError: "",
      });
      return "duplicate";
    }
    if (error.code === "invalid") {
      await markLink(riderCtx, owner.riderId, provider.id, { lastError: "invalid_file" });
      return "invalid_file";
    }
    return "refused";
  }
}

/**
 * A deregistration is believed only when the provider confirms it by
 * refusing the rider's token: a notification anyone could have sent must
 * not be able to disconnect a rider. Confirmed, the link is "revoked" and
 * the rider sees that it has to be connected again.
 */
async function confirmDeregistration(
  provider: DeviceProvider,
  owner: LinkOwner,
): Promise<WebhookOutcome> {
  let token: string;
  try {
    token = await accessTokenFor(owner, provider);
  } catch (error) {
    if (error instanceof Refused) return "revoked";
    throw error;
  }
  try {
    await provider.userId(token);
    return "still_connected";
  } catch (error) {
    const refused =
      error instanceof DeviceHttpError && (error.status === 401 || error.status === 403);
    if (!refused) return "still_connected";
  }
  await markLink({ orgId: owner.orgId, userId: owner.riderUserId }, owner.riderId, provider.id, {
    status: "revoked",
    lastError: "deregistered",
  });
  return "revoked";
}
