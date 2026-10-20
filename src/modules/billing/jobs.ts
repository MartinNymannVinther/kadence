import { sql } from "drizzle-orm";
import { appDb } from "@/core/db/client";
import { env } from "@/core/env";
import { payload } from "@/core/jobs/payload";
import { handle, jobKind } from "@/core/jobs/registry";
import { SCHEDULE } from "@/core/jobs/schedule";
import { sendPlanNotices } from "./notices";
import { billingOn } from "./state";

/**
 * Once a day (docs/adr/0090): what time has moved, moved — a trial or a
 * payment past its end becomes read only, a free workspace past its date
 * becomes a trial of TRIAL_DAYS days — and then the mails that are due.
 * Never in the middle of a request. With BILLING=off it does nothing at
 * all, so an installation that turns billing off keeps every workspace
 * as it is and sends nothing.
 */

export type MovedPlan = { orgId: string; from: string; to: string };

/** Runs `expire_workspaces()` (drizzle/0052) with nobody signed in; the rows it moved. */
export async function expireWorkspaces(trialDays: number = env.TRIAL_DAYS): Promise<MovedPlan[]> {
  const result = await appDb.execute(
    sql`select org_id, plan_before, plan_after from expire_workspaces(${trialDays})`,
  );
  return (result.rows as Array<{ org_id: string; plan_before: string; plan_after: string }>).map(
    (r) => ({ orgId: r.org_id, from: r.plan_before, to: r.plan_after }),
  );
}

export const billingExpireJob = jobKind("billing.expire", payload({}), {
  every: SCHEDULE.billingExpire,
  timeoutMs: 10 * 60_000,
});

export const billingExpireHandler = handle(billingExpireJob, async () => {
  if (!billingOn()) return { moved: 0, mails: 0 };
  const moved = await expireWorkspaces();
  const mails = await sendPlanNotices();
  return { moved: moved.length, mails: mails.sent, failed: mails.failed };
});
