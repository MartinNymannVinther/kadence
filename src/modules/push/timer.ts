import { env } from "@/core/env";
import { remindersOn } from "@/core/features";
import { errorName, log } from "@/core/log";
import { mailConfigured } from "@/core/mail/mailer";
import { runReminders, type RunReport } from "./job";
import { runWeekMails } from "./mail-week";
import type { PushConfig } from "./send";
import { parseVapidKeys, vapidSubject } from "./vapid";

/**
 * One reminder run (docs/adr/0060), when its keys are there. It used to
 * be started every ten minutes by a timer in the app; now the run is a
 * recurring job (`push.reminders`, jobs.ts, docs/adr/0085), taken by the
 * worker container or, without one, by the app's own worker, every ten
 * minutes as before. `POST /api/push/tick` runs the same thing for an
 * installation that would rather drive it from outside. Two runs never
 * overlap in one process, and the job's own marks make overlapping runs
 * across processes harmless.
 *
 * The same run sends the parents' week by mail (docs/adr/0086) where the
 * installation sends mail, with or without the push keys.
 */

const state = globalThis as unknown as {
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

/** The parents' week by mail, when there is mail; a failure is said and never stops the push run. */
async function mailTheWeek(): Promise<void> {
  if (!mailConfigured()) return;
  try {
    const report = await runWeekMails();
    if (report.sent + report.failed > 0)
      await log.info("mail: week run finished", { sent: report.sent, failed: report.failed });
  } catch (error) {
    await log.error("mail: the week run failed", { error: errorName(error) });
  }
}

/** One run, unless one is already going in this process; then that one's answer. */
export function runRemindersOnce(): Promise<RunReport | null> {
  if (state.kadenceReminderRun) return state.kadenceReminderRun;
  const run = (async () => {
    await mailTheWeek();
    try {
      const config = pushConfig();
      if (!config) return null;
      const report = await runReminders(config);
      if (report.sent + report.gone + report.failed > 0)
        await log.info("reminders: run finished", {
          sent: report.sent,
          gone: report.gone,
          failed: report.failed,
        });
      return report;
    } catch (error) {
      await log.error("reminders: the run failed", { error: errorName(error) });
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
