import { sql } from "drizzle-orm";
import { todayInCopenhagen } from "@/core/dates";
import { authDb } from "@/core/db/client";
import { env } from "@/core/env";
import { errorName, log } from "@/core/log";
import { seasonEndFrom, whichPricePlan, youthFreeThrough, type PlanState } from "./which-plan";

/**
 * The plan a new workspace starts on (docs/adr/0090), set right after
 * Better Auth has made it, on the auth role, as its kind is set
 * (src/core/auth/register-personal.ts). The audit trigger on
 * organizations records it.
 *
 * With BILLING=off nothing is set: every workspace is free. With it on:
 * - a person alone tries Kadence for TRIAL_DAYS days, or is free with no
 *   date when the installation gives no trial;
 * - a person alone who is at most U19 this season rides free until the
 *   last day of their last U19 season, and then gets the trial;
 * - a club the installation's owner admitted rides its first season free,
 *   until the coming 30 September, and then gets the trial (Martin's
 *   answer 2, 12 October 2026).
 * A demo never comes here; it is free and thrown away.
 */

export type PlanStart =
  { kind: "personal"; birthYear: number | null } | { kind: "club"; admitted: boolean };

export type StartingPlan = {
  plan: Extract<PlanState, "free" | "trial">;
  pricePlan: string | null;
  /** Days of trial from now, for a trial. */
  trialDays: number | null;
  freeReason: string | null;
  /** The last Copenhagen day a free workspace with a date is free. */
  freeThrough: string | null;
};

const FREE: StartingPlan = {
  plan: "free",
  pricePlan: null,
  trialDays: null,
  freeReason: null,
  freeThrough: null,
};

/** Pure: the plan for a new workspace, given the installation's settings and today. */
export function startingPlan(
  start: PlanStart,
  settings: { billing: boolean; trialDays: number; todayIso: string },
): StartingPlan {
  if (!settings.billing) return FREE;
  if (start.kind === "club") {
    if (!start.admitted) return FREE;
    return {
      ...FREE,
      freeReason: "first-season",
      freeThrough: seasonEndFrom(settings.todayIso),
    };
  }
  const key = whichPricePlan({
    kind: "personal",
    birthYear: start.birthYear,
    todayIso: settings.todayIso,
  });
  if (key === "youth" && start.birthYear !== null)
    return {
      ...FREE,
      pricePlan: "youth",
      freeReason: "youth",
      freeThrough: youthFreeThrough(start.birthYear),
    };
  if (settings.trialDays <= 0) return FREE;
  return { ...FREE, plan: "trial", trialDays: settings.trialDays };
}

/** Writes the starting plan onto a workspace Better Auth has just made. */
export async function startPlan(orgId: string, start: PlanStart): Promise<StartingPlan> {
  const chosen = startingPlan(start, {
    billing: env.BILLING === "on",
    trialDays: env.TRIAL_DAYS,
    todayIso: todayInCopenhagen(),
  });
  if (env.BILLING !== "on") return chosen;
  await authDb.execute(sql`
    update organizations set
      plan = ${chosen.plan},
      price_plan = ${chosen.pricePlan},
      trial_ends_at = case when ${chosen.trialDays}::integer is null then null
                           else now() + make_interval(days => ${chosen.trialDays}::integer) end,
      free_reason = ${chosen.freeReason},
      free_until = case when ${chosen.freeThrough}::date is null then null
                        else (${chosen.freeThrough}::date + 1)::timestamp at time zone 'Europe/Copenhagen' end
    where id = ${orgId}`);
  return chosen;
}

/**
 * `startPlan` for a registration, which must not fail over it: a plan that
 * could not be written leaves the workspace free, which the installation's
 * owner sees under Betaling and can correct, and the log says so.
 */
export async function startPlanQuietly(orgId: string, start: PlanStart): Promise<void> {
  try {
    await startPlan(orgId, start);
  } catch (error) {
    await log.error("billing: starting plan not set", { orgId, error: errorName(error) });
  }
}
