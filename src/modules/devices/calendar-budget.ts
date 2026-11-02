import { rateLimit } from "@/core/rate-limit";
import { inFlight } from "./in-flight";
import type { ProviderId } from "./providers";

/**
 * How often Kadence may call a provider's calendar (docs/adr/0114).
 * Garmin's Starter tier allows 100 calls a minute for the whole app, OAuth
 * included, and 200 a day for each rider, in rolling windows; rides,
 * permissions and renewals use the same allowance. Kadence's counters are
 * fixed windows (src/core/counters.ts), which can let twice the count
 * through across a window's edge, so each budget is well under half of
 * Garmin's: what is left is the rides' and the renewals'.
 *
 * Every call to the calendar takes one from both budgets first. A spent
 * budget is not an error: the job stops and comes back on its next run,
 * and a press is told to try again in a moment.
 */

export const APP_CALLS_PER_MINUTE = 40;
export const RIDER_CALLS_PER_DAY = 80;
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** A budget ran out: the app's for this minute, or the rider's for the day. */
export class BudgetSpent extends Error {
  constructor(readonly scope: "app" | "rider") {
    super(`calendar budget spent: ${scope}`);
    this.name = "BudgetSpent";
  }
}

/** Takes one call from the app's and the rider's budgets, or throws BudgetSpent. */
export async function spendCall(provider: ProviderId, riderId: string): Promise<void> {
  const app = await rateLimit(`calendar:${provider}`, APP_CALLS_PER_MINUTE, MINUTE);
  if (!app.allowed) throw new BudgetSpent("app");
  const rider = await rateLimit(`calendar:${provider}:${riderId}`, RIDER_CALLS_PER_DAY, DAY);
  if (!rider.allowed) throw new BudgetSpent("rider");
}

/**
 * One sync of a rider's calendar at a time, whoever starts it — the job or
 * a press — so the same session is never created twice at the provider.
 * A lease, given back by the clock if an instance dies holding it.
 */
export const calendarTurn = inFlight("calendar", 1);
