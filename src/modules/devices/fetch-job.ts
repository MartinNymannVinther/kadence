import { field, payload } from "@/core/jobs/payload";
import { enqueue } from "@/core/jobs/queue";
import { jobKind } from "@/core/jobs/registry";
import { errorName, log } from "@/core/log";
import { SPORTS } from "@/modules/training/vocabulary";
import { PROVIDER_IDS, type ProviderId, type WebhookEvent } from "./providers";

/**
 * A verified notification from Wahoo, Garmin or Polar becomes one job per
 * event (docs/adr/0085), written before the provider gets its 200: the
 * fetch and the import (webhooks.ts) happen in the worker, and a provider
 * that is down for a moment is asked again after 1, 5, 15, 60 and 240
 * minutes. Before, the work ran after the answer in the same process
 * (Next's after()), and a deploy or a provider's bad minute lost the ride
 * with nothing trying again.
 *
 * The payload is what the work needs and nothing else: the provider, the
 * provider's ids for the person and the activity, where the file is, the
 * file's name as the device named the ride, the model of the device and
 * the sport the provider names (Garmin, docs/adr/0113). Never the
 * notification's other fields — a summary can carry a heart rate. A
 * deregistration and a change of permissions carry the person's id only.
 *
 * Idempotent: the same activity notified twice waits once (the dedupe
 * key), and a job run twice finds the ride already imported, by the
 * provider's id for it, and answers "duplicate".
 */

export const deviceFetch = jobKind(
  "device.fetch",
  payload({
    provider: field.word(PROVIDER_IDS),
    event: field.word(["activity", "deregistration", "permissions"]),
    externalUserId: field.id(),
    externalId: field.id().optional(),
    url: field.ref().optional(),
    fileName: field.file().optional(),
    deviceName: field.device().optional(),
    sport: field.word(SPORTS).optional(),
  }),
  // A file is fetched with a fifteen-second deadline and imported in a
  // second or two; two minutes leaves room for a token refresh as well.
  { timeoutMs: 2 * 60_000 },
);

type DeviceFetch = ReturnType<typeof deviceFetch.payload.parse>;

export function eventPayload(provider: ProviderId, event: WebhookEvent): DeviceFetch {
  if (event.kind !== "activity")
    return { provider, event: event.kind, externalUserId: event.externalUserId };
  const { externalId, url, fileName, deviceName, sport } = event.notification;
  return {
    provider,
    event: "activity",
    externalUserId: event.externalUserId,
    externalId,
    url,
    fileName,
    ...(deviceName ? { deviceName } : {}),
    ...(sport ? { sport } : {}),
  };
}

/** The event a job's payload describes, as the provider's adapter gave it. */
export function payloadEvent(job: DeviceFetch): WebhookEvent {
  if (job.event === "permissions")
    return { kind: "permissions", externalUserId: job.externalUserId };
  if (job.event === "deregistration" || !job.externalId || !job.url)
    return { kind: "deregistration", externalUserId: job.externalUserId };
  return {
    kind: "activity",
    externalUserId: job.externalUserId,
    notification: {
      externalUserId: job.externalUserId,
      externalId: job.externalId,
      url: job.url,
      fileName: job.fileName ?? `${job.provider}.fit`,
      ...(job.deviceName ? { deviceName: job.deviceName } : {}),
      ...(job.sport ? { sport: job.sport } : {}),
    },
  };
}

/**
 * Queues every event, however many a notification holds. An event whose
 * ids do not fit a payload is left out and logged by name, never by
 * value: it could not have been fetched either. Throws when the queue cannot be written, so the provider is told
 * to try again rather than told all is well.
 */
export async function enqueueDeviceEvents(
  provider: ProviderId,
  events: WebhookEvent[],
): Promise<number> {
  let queued = 0;
  for (const event of events) {
    const parsed = deviceFetch.payload.safeParse(eventPayload(provider, event));
    if (!parsed.success) {
      await log.warn("device webhook: event not queued", {
        provider,
        error: errorName(parsed.error),
      });
      continue;
    }
    const id = parsed.data.externalId ?? parsed.data.event;
    const key = `${provider}:${parsed.data.externalUserId}:${id}`.slice(0, 200);
    if (await enqueue(deviceFetch, parsed.data, { dedupeKey: key })) queued += 1;
  }
  return queued;
}
