import { and, eq, lt } from "drizzle-orm";
import { deviceWorkouts, type DeviceWorkoutRow } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import type { LinkOwner } from "./links";
import type { ProviderId } from "./providers";

/**
 * The rows that remember what Kadence put on a rider's calendar at the
 * provider (`device_workouts`, docs/adr/0114). Written in the rider's
 * name, whoever set it off — the job, the rider's press or a coach's — as
 * every write about a link is (links.ts); read by whoever may read the
 * rider's training, under the ordinary policies.
 */

export type { DeviceWorkoutRow };

function riderCtx(owner: LinkOwner): OrgContext {
  return { orgId: owner.orgId, userId: owner.riderUserId };
}

/** Every row of the rider's at the provider. */
export async function rowsOf(owner: LinkOwner, provider: ProviderId): Promise<DeviceWorkoutRow[]> {
  return withOrgContext(riderCtx(owner), (tx) =>
    tx
      .select()
      .from(deviceWorkouts)
      .where(and(eq(deviceWorkouts.riderId, owner.riderId), eq(deviceWorkouts.provider, provider))),
  );
}

/** The row for one session at the provider, or null. */
export async function rowFor(
  owner: LinkOwner,
  provider: ProviderId,
  sessionId: string,
): Promise<DeviceWorkoutRow | null> {
  const [row] = await withOrgContext(riderCtx(owner), (tx) =>
    tx
      .select()
      .from(deviceWorkouts)
      .where(
        and(
          eq(deviceWorkouts.riderId, owner.riderId),
          eq(deviceWorkouts.provider, provider),
          eq(deviceWorkouts.plannedSessionId, sessionId),
        ),
      ),
  );
  return row ?? null;
}

export type RowValues = {
  externalWorkoutId: string | null;
  externalScheduleId: string | null;
  scheduledOn: string;
  contentHash: string;
  sentAt: Date | null;
  lastError: string;
};

/** Writes what the provider now holds for a session: the row given, or a new one. */
export async function saveRow(
  owner: LinkOwner,
  provider: ProviderId,
  sessionId: string | null,
  row: DeviceWorkoutRow | null,
  values: RowValues,
): Promise<DeviceWorkoutRow> {
  return withOrgContext(riderCtx(owner), async (tx) => {
    if (row) {
      const [updated] = await tx
        .update(deviceWorkouts)
        .set(values)
        .where(eq(deviceWorkouts.id, row.id))
        .returning();
      if (updated) return updated;
    }
    const [inserted] = await tx
      .insert(deviceWorkouts)
      .values({
        orgId: owner.orgId,
        riderId: owner.riderId,
        plannedSessionId: sessionId,
        provider,
        ...values,
      })
      .onConflictDoUpdate({
        target: [deviceWorkouts.plannedSessionId, deviceWorkouts.provider],
        set: values,
      })
      .returning();
    return inserted!;
  });
}

/** Notes what went wrong on a row, leaving what the provider holds as it was. */
export async function noteRow(owner: LinkOwner, row: DeviceWorkoutRow, lastError: string) {
  if (row.lastError === lastError) return;
  await withOrgContext(riderCtx(owner), (tx) =>
    tx.update(deviceWorkouts).set({ lastError }).where(eq(deviceWorkouts.id, row.id)),
  );
}

export async function dropRow(owner: LinkOwner, row: DeviceWorkoutRow): Promise<void> {
  await withOrgContext(riderCtx(owner), (tx) =>
    tx.delete(deviceWorkouts).where(eq(deviceWorkouts.id, row.id)),
  );
}

/**
 * The rows for days before `today`, dropped without asking the provider:
 * a workout whose day has passed is the rider's history there, and
 * Kadence leaves it alone. How many.
 */
export async function dropPastRows(
  owner: LinkOwner,
  provider: ProviderId,
  today: string,
): Promise<number> {
  const gone = await withOrgContext(riderCtx(owner), (tx) =>
    tx
      .delete(deviceWorkouts)
      .where(
        and(
          eq(deviceWorkouts.riderId, owner.riderId),
          eq(deviceWorkouts.provider, provider),
          lt(deviceWorkouts.scheduledOn, today),
        ),
      )
      .returning({ id: deviceWorkouts.id }),
  );
  return gone.length;
}

/**
 * Every row of the rider's at the provider, dropped in the transaction
 * that takes the link away: what was sent means nothing without it.
 */
export async function dropRowsIn(
  tx: AppTransaction,
  riderId: string,
  provider: ProviderId,
): Promise<void> {
  await tx
    .delete(deviceWorkouts)
    .where(and(eq(deviceWorkouts.riderId, riderId), eq(deviceWorkouts.provider, provider)));
}
