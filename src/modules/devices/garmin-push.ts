import { z } from "zod";
import { deviceModelName } from "./device-name";
import { activityFileName } from "./file-name";
import { garminSport } from "./garmin-sport";
import type { WebhookEvent } from "./providers";

/**
 * What a push from Garmin asks of Kadence (docs/adr/0113). Kadence turns
 * on three kinds in Garmin's tools and reads those three:
 *
 * - `activityFiles`: a ride's FIT file is ready at `callbackURL`, with the
 *   activity's type, name and the device it was recorded on;
 * - `deregistrations`: the rider disconnected Kadence at Garmin, or
 *   Kadence asked Garmin to forget them;
 * - `userPermissionsChange`: the rider changed what they share.
 *
 * Every other key is ignored. Each entry is read on its own, so one that
 * does not fit is left out and the rest still count; the lists have no
 * length limit of their own, since the body is capped before it is read
 * (webhooks.ts). Nothing here is trusted: a permission change only says
 * that the permissions should be read again, with the rider's token, and
 * a deregistration is believed only when Garmin refuses that token
 * (deregistration.ts). Pure.
 */

const GarminId = z.string().regex(/^[\w-]{1,100}$/);
const IdLike = z.union([z.string().max(100), z.number()]);

const ActivityFileEntry = z.object({
  userId: GarminId,
  summaryId: IdLike.nullish(),
  activityId: IdLike.nullish(),
  activityName: z.string().max(500).nullish(),
  activityType: z.string().max(100).nullish(),
  deviceName: z.string().max(500).nullish(),
  fileType: z.string().max(16).nullish(),
  callbackURL: z.string().max(2048),
  manual: z.boolean().nullish(),
});

const UserEntry = z.object({ userId: GarminId });

const Push = z.object({
  activityFiles: z.array(z.unknown()).nullish(),
  deregistrations: z.array(z.unknown()).nullish(),
  userPermissionsChange: z.array(z.unknown()).nullish(),
});

/** The entries of `list` that fit `schema`, each on its own. */
function entries<S extends z.ZodType>(list: unknown[] | null | undefined, schema: S): z.infer<S>[] {
  const out: z.infer<S>[] = [];
  for (const item of list ?? []) {
    const parsed = schema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/** An activity file as the event Kadence queues; null for a file Kadence does not read (not FIT). */
function activityEvent(file: z.infer<typeof ActivityFileEntry>): WebhookEvent | null {
  if ((file.fileType ?? "FIT").toUpperCase() !== "FIT") return null;
  const externalId = String(file.activityId ?? file.summaryId ?? "");
  if (!/^[\w-]{1,100}$/.test(externalId)) return null;
  const deviceName = deviceModelName(file.deviceName, file.manual ?? false);
  const sport = garminSport(file.activityType);
  return {
    kind: "activity",
    externalUserId: file.userId,
    notification: {
      externalUserId: file.userId,
      externalId,
      url: file.callbackURL,
      fileName: activityFileName(file.activityName, "Garmin"),
      ...(deviceName ? { deviceName } : {}),
      ...(sport ? { sport } : {}),
    },
  };
}

/** The events in a push: activity files (FIT only), deregistrations and permission changes. */
export function garminPushEvents(payload: unknown): WebhookEvent[] {
  const parsed = Push.safeParse(payload);
  if (!parsed.success) return [];
  const events: WebhookEvent[] = [];
  for (const file of entries(parsed.data.activityFiles, ActivityFileEntry)) {
    const event = activityEvent(file);
    if (event) events.push(event);
  }
  for (const gone of entries(parsed.data.deregistrations, UserEntry))
    events.push({ kind: "deregistration", externalUserId: gone.userId });
  for (const change of entries(parsed.data.userPermissionsChange, UserEntry))
    events.push({ kind: "permissions", externalUserId: change.userId });
  return events;
}
