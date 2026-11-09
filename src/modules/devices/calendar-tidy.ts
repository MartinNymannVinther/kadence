import { and, eq } from "drizzle-orm";
import { Refused } from "@/core/action";
import { deviceLinks } from "@/core/db/schema";
import { withOrgContext } from "@/core/db/tenant";
import { log } from "@/core/log";
import { BudgetSpent } from "./calendar-budget";
import { pastKeeping } from "./calendar-plan";
import { dropRow, noteRow, rowsOf, type DeviceWorkoutRow } from "./device-workouts";
import { DeviceHttpError, loggable } from "./http";
import type { LinkOwner } from "./links";
import { allowsWorkouts } from "./permission-words";
import type { DeviceProvider } from "./providers";
import { calendarSync, takeOff } from "./workout-sync";

/**
 * Kadence tidies what it put on a rider's calendar at the provider
 * (docs/adr/0115). A workout stays for KEEP_PAST_DAYS after its day, as
 * the rider's recent history there; then its schedule and the workout are
 * deleted at the provider and the row is dropped, so a season does not
 * leave hundreds of workouts in the rider's library. The ride the rider
 * rode is another thing at the provider and is never touched.
 *
 * It is done for every link that holds such rows, whatever the rider's
 * switch says, and for workouts a press sent: it is Kadence's own to tidy,
 * and it sends nothing. The job does it after the upcoming sessions are
 * sent, on the same budgets, and leaves a share of them for sending
 * (calendar-budget.ts `spendTidyCall`).
 *
 * What the provider answers:
 * - gone (404, 410): the rider deleted it already, which is what was
 *   wanted; the row goes;
 * - 429, a budget spent, or a provider that failed to answer: the row
 *   stays for a later run;
 * - 401, 403, 412, a token that cannot be had, or a link known not to let
 *   Kadence hold workouts there: Kadence can no longer take them off, so
 *   the rider's rows that are due are dropped without another call. The
 *   link is left as it is; whether it works is the rides' business;
 * - another refusal: the provider will not delete it, and the row goes.
 */

export type TidyRun = { tidied: number; dropped: number; failed: number };

/** Why tidying a rider ended early: the run's budget, or the rider's for the day. */
export type TidyEnd = "busy" | "spent" | null;

type Answer = "busy" | "spent" | "give_up" | "drop" | "keep";

function answerTo(error: unknown): Answer {
  if (error instanceof BudgetSpent) return error.scope === "rider" ? "spent" : "busy";
  if (error instanceof Refused) return error.detail === "provider_unavailable" ? "keep" : "give_up";
  if (!(error instanceof DeviceHttpError)) throw error;
  if (error.status === 429) return "busy";
  if (error.status === 401 || error.status === 403 || error.status === 412) return "give_up";
  return error.rejected ? "drop" : "keep";
}

/** Whether the link still lets Kadence hold workouts at the provider, as far as Kadence knows. */
async function mayTakeOff(owner: LinkOwner, provider: DeviceProvider): Promise<boolean> {
  const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
  const [link] = await withOrgContext(riderCtx, (tx) =>
    tx
      .select({ permissions: deviceLinks.permissions, lastError: deviceLinks.lastError })
      .from(deviceLinks)
      .where(and(eq(deviceLinks.riderId, owner.riderId), eq(deviceLinks.provider, provider.id))),
  );
  if (!link || link.lastError === "workouts_refused") return false;
  // Permissions not read yet are not a no, as for a press (push.ts).
  return provider.id !== "garmin" || !link.permissions || allowsWorkouts(link.permissions);
}

/** The rider's workouts whose days are up, taken off the provider's calendar. */
export async function tidyCalendar(
  owner: LinkOwner,
  provider: DeviceProvider,
  today: string,
  run: TidyRun,
  signal?: AbortSignal,
): Promise<TidyEnd> {
  const due = pastKeeping(await rowsOf(owner, provider.id), today);
  if (due.length === 0) return null;
  let may = await mayTakeOff(owner, provider);
  const sync = calendarSync(owner, provider, { tidying: true });
  const drop = async (row: DeviceWorkoutRow) => {
    await dropRow(owner, row);
    run.dropped++;
  };
  for (const row of due) {
    if (signal?.aborted) return "busy";
    if (!may || !row.externalWorkoutId) {
      await drop(row);
      continue;
    }
    try {
      await takeOff(sync, row);
      await dropRow(owner, row);
      run.tidied++;
    } catch (error) {
      const answer = answerTo(error);
      if (error instanceof DeviceHttpError)
        await log.warn("device calendar: a past workout was not taken off", {
          provider: provider.id,
          error: loggable(error),
        });
      if (answer === "busy" || answer === "spent") return answer;
      if (answer === "keep") {
        await noteRow(owner, row, "provider_error");
        run.failed++;
        continue;
      }
      // The provider will not, or Kadence can no longer: stop asking.
      if (answer === "give_up") may = false;
      await drop(row);
    }
  }
  return null;
}
