import { log } from "@/core/log";
import { rowsOf } from "./device-workouts";
import { loggable } from "./http";
import type { LinkOwner } from "./links";
import type { DeviceProvider } from "./providers";
import { calendarSync, takeOff } from "./workout-sync";

/**
 * Before a link goes — the rider disconnects, is erased, deletes their
 * account or loses their workspace — every workout Kadence still remembers
 * putting on the rider's calendar is taken off (docs/adr/0114, 0115), with
 * the token that is about to stop working, and before Garmin is told to
 * forget the rider: today's and later, and those of the last few days the
 * job would have tidied later (calendar-tidy.ts), since no later run will.
 * The rides stay; they are another thing at the provider.
 *
 * A courtesy that never holds a deletion up for long and never fails it:
 * every workout at once, each call with a short deadline, the whole within
 * WITHDRAW_DEADLINE_MS, and a failure logged by its code. Kadence's
 * budget for calls (calendar-budget.ts) still applies; what it does not
 * allow is left on the calendar for the rider to delete.
 */

export const WITHDRAW_DEADLINE_MS = 3_000;
const CALL_TIMEOUT_MS = 2_500;

/** The rider's workouts off the provider's calendar; how many went. Never throws. */
export async function withdrawWorkouts(
  owner: LinkOwner,
  provider: DeviceProvider,
  accessToken: string,
): Promise<number> {
  if (!provider.calendar) return 0;
  const sync = calendarSync(owner, provider, { accessToken });
  let taken = 0;
  const work = (async () => {
    const rows = await rowsOf(owner, provider.id);
    await Promise.all(
      rows
        .filter((row) => row.externalWorkoutId)
        .map((row) =>
          takeOff(sync, row, CALL_TIMEOUT_MS).then(
            () => void taken++,
            async (error: unknown) =>
              log.warn("device exit: a workout stayed on the calendar", {
                provider: provider.id,
                error: loggable(error),
              }),
          ),
        ),
    );
  })().catch(async (error: unknown) => {
    await log.warn("device exit: workouts not read", { error: loggable(error) });
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    work,
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, WITHDRAW_DEADLINE_MS);
    }),
  ]).finally(() => clearTimeout(timer));
  return taken;
}
