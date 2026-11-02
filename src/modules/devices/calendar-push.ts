import { Refused } from "@/core/action";
import type { ActionError } from "@/core/result";
import { todayInCopenhagen } from "@/core/dates";
import { calendarTurn } from "./calendar-budget";
import { rowFor } from "./device-workouts";
import { clearLinkError, type LinkOwner } from "./links";
import type { DeviceProvider, PushWorkout } from "./providers";
import { calendarSync, syncWorkout, type SyncOutcome } from "./workout-sync";

/**
 * "Send til Garmin" on a session (docs/adr/0114): the same path the job
 * takes (workout-sync.ts), so a press on a session already on the rider's
 * calendar sends nothing, and a press on a changed one changes it rather
 * than adding a copy. A press also tries again what Garmin turned down
 * before, and lifts the link's `workouts_refused` once Garmin takes a
 * workout. It works whether or not the rider sends automatically.
 *
 * The caller's right to send was checked before (push.ts); everything
 * here is done in the rider's name, as every use of a link is.
 */

const REFUSAL: Partial<Record<SyncOutcome, [ActionError, string]>> = {
  too_many_steps: ["invalid", "too_many_steps"],
  rejected: ["conflict", "provider_rejected"],
  reconnect: ["conflict", "reconnect"],
  refused: ["forbidden", "workouts_refused"],
  permission: ["forbidden", "provider_permission"],
  busy: ["conflict", "provider_busy"],
  spent: ["conflict", "provider_busy"],
  failed: ["conflict", "provider_error"],
};

/** How long a press waits for the job to finish with the same rider, at most. */
const TURN_TRIES = 5;
const TURN_WAIT_MS = 400;

async function takeTurn(key: string): Promise<boolean> {
  for (let i = 0; i < TURN_TRIES; i++) {
    if (await calendarTurn.enter(key)) return true;
    await new Promise((resolve) => setTimeout(resolve, TURN_WAIT_MS));
  }
  return false;
}

export async function pushToCalendar(
  owner: LinkOwner,
  provider: DeviceProvider,
  workout: PushWorkout,
): Promise<{ externalId: string }> {
  const key = `${provider.id}:${owner.riderId}`;
  if (!(await takeTurn(key))) throw new Refused("conflict", "provider_busy");
  try {
    const sync = calendarSync(owner, provider, todayInCopenhagen(), { again: true });
    const row = await rowFor(owner, provider.id, workout.sessionId);
    const outcome = await syncWorkout(sync, row, { kind: "send", workout });
    const refusal = REFUSAL[outcome];
    if (refusal) throw new Refused(...refusal);
    const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
    await clearLinkError(riderCtx, owner.riderId, provider.id, "workouts_refused");
    const sent = await rowFor(owner, provider.id, workout.sessionId);
    return { externalId: sent?.externalWorkoutId ?? "" };
  } finally {
    await calendarTurn.leave(key);
  }
}
