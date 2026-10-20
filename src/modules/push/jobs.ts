import { payload } from "@/core/jobs/payload";
import { handle, jobKind } from "@/core/jobs/registry";
import { SCHEDULE } from "@/core/jobs/schedule";
import { runRemindersOnce } from "./timer";

/**
 * The reminder run as a recurring job (docs/adr/0060, 0085), every ten
 * minutes. Idempotent by the run's own design: each reminder is written
 * down in push_runs before it is sent, with a check that nobody wrote it
 * first (runs.ts), so a run repeated after a lost lease sends nothing
 * twice. A run that fails is logged by runRemindersOnce and tried again
 * by the next one, as it was with the timer, so the job itself is done
 * either way. Without the push keys it does nothing.
 */

export const remindersJob = jobKind("push.reminders", payload({}), {
  every: SCHEDULE.reminders,
  // A run must end before the next is due.
  timeoutMs: 9 * 60_000,
});

export const remindersHandler = handle(remindersJob, () => runRemindersOnce());
