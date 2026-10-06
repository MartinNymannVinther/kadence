import { env } from "@/core/env";
import { remindersOn } from "@/core/features";
import { runReminders, type RunReport } from "./job";
import type { PushConfig } from "./send";
import { parseVapidKeys, vapidSubject } from "./vapid";

/**
 * When the reminder run happens (docs/adr/0060): inside the app's own
 * process, every ten minutes, started once from the instrumentation hook
 * — no scheduler, no second container, no cloud. `POST /api/push/tick`
 * runs the same thing for an installation that would rather drive it
 * from outside. Two runs never overlap in one process, and the job's
 * own marks make overlapping runs across processes harmless.
 */

export const INTERVAL_MS = 10 * 60 * 1000;
/** The first run waits a minute, so a server that is starting is not also sending. */
const FIRST_RUN_MS = 60 * 1000;

const state = globalThis as unknown as {
  kadenceReminderTimer?: ReturnType<typeof setInterval>;
  kadenceReminderRun?: Promise<RunReport | null>;
};

/** The installation's push settings, or null when reminders are off. */
export function pushConfig(): PushConfig | null {
  if (!remindersOn() || !env.PUSH_PUBLIC_KEY || !env.PUSH_PRIVATE_KEY) return null;
  return {
    keys: parseVapidKeys(env.PUSH_PUBLIC_KEY, env.PUSH_PRIVATE_KEY),
    subject: vapidSubject(env.PUSH_CONTACT, env.BETTER_AUTH_URL),
  };
}

/** One run, unless one is already going in this process; then that one's answer. */
export function runRemindersOnce(): Promise<RunReport | null> {
  if (state.kadenceReminderRun) return state.kadenceReminderRun;
  const run = (async () => {
    try {
      const config = pushConfig();
      if (!config) return null;
      const report = await runReminders(config);
      if (report.sent + report.gone + report.failed > 0)
        console.info(
          `reminders: ${report.sent} sent, ${report.gone} gone, ${report.failed} failed`,
        );
      return report;
    } catch (error) {
      console.error("reminders: the run failed", error instanceof Error ? error.message : "");
      return null;
    }
  })();
  state.kadenceReminderRun = run;
  // Cleared after the assignment above, never before it, even for a run
  // that has nothing to do and settles at once.
  void run.finally(() => {
    if (state.kadenceReminderRun === run) state.kadenceReminderRun = undefined;
  });
  return run;
}

/**
 * Starts the timer, once per process however often it is asked. The
 * timer never keeps the process alive and a failed run never reaches it.
 */
export function startReminderTimer(): boolean {
  if (state.kadenceReminderTimer) return false;
  const tick = () => void runRemindersOnce();
  state.kadenceReminderTimer = setInterval(tick, INTERVAL_MS);
  state.kadenceReminderTimer.unref?.();
  setTimeout(tick, FIRST_RUN_MS).unref?.();
  return true;
}
