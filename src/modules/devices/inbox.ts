import { and, eq } from "drizzle-orm";
import { deviceInbox } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import type { Sport } from "@/modules/training/vocabulary";
import type { ProviderId } from "./providers";

/**
 * A ride's file between its download and its import (docs/adr/0113,
 * drizzle/0061). Garmin hands a file over once; the bytes are kept here
 * as soon as they arrive, so a job that fails after the download — a
 * deploy, the database away for a moment — imports from them on its next
 * try instead of asking Garmin again and getting 410. The same for every
 * provider, so there is one path.
 *
 * Read and written as the rider, under the same policies as a ride's
 * file. The row goes in the import's own transaction, or as soon as the
 * ride is refused for good (activity-event.ts).
 */

export type InboxKey = { riderId: string; provider: ProviderId; externalId: string };

export type Waiting = {
  bytes: Uint8Array;
  fileName: string;
  deviceName: string | null;
  sport: Sport | null;
};

const where = (key: InboxKey) =>
  and(
    eq(deviceInbox.riderId, key.riderId),
    eq(deviceInbox.provider, key.provider),
    eq(deviceInbox.externalId, key.externalId),
  );

/** The file waiting for this activity, if a try before this one downloaded it. */
export async function waitingFile(riderCtx: OrgContext, key: InboxKey): Promise<Waiting | null> {
  const [row] = await withOrgContext(riderCtx, (tx) =>
    tx
      .select({
        bytes: deviceInbox.bytes,
        fileName: deviceInbox.fileName,
        deviceName: deviceInbox.deviceName,
        sport: deviceInbox.sport,
      })
      .from(deviceInbox)
      .where(where(key)),
  );
  if (!row) return null;
  return {
    bytes: new Uint8Array(row.bytes),
    fileName: row.fileName,
    deviceName: row.deviceName,
    sport: (row.sport as Sport | null) ?? null,
  };
}

/** Keeps a downloaded file, committed at once, before anything else is tried with it. */
export async function keepWaiting(
  riderCtx: OrgContext,
  key: InboxKey,
  file: Waiting,
): Promise<void> {
  const values = {
    fileName: file.fileName.slice(0, 200),
    deviceName: file.deviceName,
    sport: file.sport,
    bytes: Buffer.from(file.bytes),
  };
  await withOrgContext(riderCtx, (tx) =>
    tx
      .insert(deviceInbox)
      .values({ orgId: riderCtx.orgId, ...key, ...values })
      .onConflictDoUpdate({
        target: [deviceInbox.riderId, deviceInbox.provider, deviceInbox.externalId],
        set: values,
      }),
  );
}

/** The file is imported, in this transaction. */
export async function dropWaitingIn(tx: AppTransaction, key: InboxKey): Promise<void> {
  await tx.delete(deviceInbox).where(where(key));
}

/** The file is refused for good, or given up on. */
export async function dropWaiting(riderCtx: OrgContext, key: InboxKey): Promise<void> {
  await withOrgContext(riderCtx, (tx) => dropWaitingIn(tx, key));
}
