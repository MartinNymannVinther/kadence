import { payload } from "@/core/jobs/payload";
import { handle, jobKind } from "@/core/jobs/registry";
import { SCHEDULE } from "@/core/jobs/schedule";
import { sweepUnverifiedSignups } from "./sweep";

/**
 * Door 2's clean-up (docs/adr/0088): once a day, the accounts a person
 * created alone and never confirmed within thirty days. It runs whatever
 * `SIGNUP` says now, so an installation that closes door 2 again still
 * clears what came in while it was open. Idempotent: the database refuses,
 * by doing nothing, an account another run deleted first.
 */
export const signupSweepJob = jobKind("signup.sweep", payload({}), {
  every: SCHEDULE.signupSweep,
  timeoutMs: 5 * 60_000,
});

export const signupSweepHandler = handle(signupSweepJob, async () => ({
  removed: await sweepUnverifiedSignups(),
}));
