import { handle } from "@/core/jobs/registry";
import { log } from "@/core/log";
import { callerKey, rateLimit } from "@/core/rate-limit";
import { processActivity, type ActivityTry } from "./activity-event";
import { confirmDeregistration } from "./deregistration";
import { deviceFetch, enqueueDeviceEvents, payloadEvent } from "./fetch-job";
import { DeviceHttpError, loggable, readLimited } from "./http";
import { linkOwner } from "./links";
import type { WebhookOutcome } from "./outcome";
import { refreshPermissions } from "./permissions";
import {
  isProviderId,
  providerById,
  type DeviceProvider,
  type ProviderId,
  type WebhookEvent,
} from "./providers";

export type { WebhookOutcome } from "./outcome";

/**
 * A provider tells Kadence something happened: a ride was saved, a rider
 * left, a rider changed what they share. The request is rate limited per
 * address, its body capped, and its origin verified before any row is
 * touched — a failed verification is a 401, logged by provider and
 * nothing else. A verified notification is answered 200 at once,
 * recognised or not (an unknown user, a duplicate, an event Kadence does
 * not use), so the provider does not retry it for days. Every event in it
 * becomes a job, written before the answer (fetch-job.ts, docs/adr/0085)
 * and run by the worker, which is also what Garmin requires: respond,
 * then call back. No event within the body cap is left out. When the
 * queue cannot be written the answer is 503, so the provider sends the
 * notification again.
 *
 * The work is done as the rider. `device_link_owner` finds whose link the
 * provider's user id is; from there every transaction runs with the
 * rider's team and account as its context, so the import, the dedupe and
 * the match to the planned session are exactly those of the rider's own
 * upload, under the same policies (activity-event.ts). A deregistration
 * (deregistration.ts) and a change of permissions (permissions.ts) are
 * checked with Garmin before they change anything.
 *
 * Nothing about the payload or a token is logged.
 */

export const MAX_WEBHOOK_BYTES = 256 * 1024;
const RATE_LIMIT = { count: 600, windowMs: 60_000 };

/** Puts a verified notification's events in the queue: the job's by default, a test's own otherwise. */
export type Enqueue = (provider: ProviderId, events: WebhookEvent[]) => Promise<unknown>;

export async function handleWebhook(
  providerId: string,
  request: Request,
  enqueueEvents: Enqueue = enqueueDeviceEvents,
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
  if (!provider.verifyWebhook(payload, request.headers, raw)) {
    await log.warn("device webhook: not verified", { provider: provider.id });
    return new Response(null, { status: 401 });
  }

  const events = provider.webhookEvents(payload);
  if (events.length > 0) {
    try {
      await enqueueEvents(provider.id, events);
    } catch (error) {
      await log.error("device webhook: could not queue", {
        provider: provider.id,
        error: loggable(error),
      });
      return new Response(null, { status: 503 });
    }
  }
  return new Response(null, { status: 200 });
}

/**
 * The worker's part: one event, done as the rider. An error thrown from
 * here is the job's to try again; an outcome returned is final.
 */
export const deviceFetchHandler = handle(deviceFetch, (job, ctx) =>
  processEvent(providerById(job.provider), payloadEvent(job), {
    lastTry: ctx.attempt >= deviceFetch.maxAttempts,
  }),
);

export async function processEvent(
  provider: DeviceProvider,
  event: WebhookEvent,
  attempt: ActivityTry = {},
): Promise<WebhookOutcome> {
  const owner = await linkOwner(provider.id, event.externalUserId);
  if (!owner) return "unknown_user";
  if (event.kind === "deregistration") return confirmDeregistration(provider, owner);
  if (event.kind === "permissions") return refreshPermissions(provider, owner);
  return processActivity(provider, owner, event.notification, attempt);
}
