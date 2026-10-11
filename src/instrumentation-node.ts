/**
 * The Node half of the instrumentation hook: make a bad environment fail
 * loudly at boot. Kept in its own module, imported only inside the
 * runtime check in instrumentation.ts, so the edge compilation never
 * sees `process.exit` — Turbopack compiles instrumentation.ts for both
 * runtimes and warns about every Node API it can see there, on every
 * request in development.
 *
 * Next itself only logs a failed hook and carries on serving 500s, which
 * is the same silence with a better log line, so the exit is ours: print
 * the zod message and stop the process. Docker then restarts it, the
 * container shows as restarting rather than up, and the message is the
 * last thing in the log.
 */
export async function validateEnvironmentOrExit(): Promise<boolean> {
  try {
    await import("@/core/env");
    return true;
  } catch (error) {
    console.error("kadence: refusing to start, the environment is not valid.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
    return false;
  }
}

/**
 * Starts the reminder timer (docs/adr/0060) when the installation has a
 * push key pair or sends mail (the parents' week by mail, docs/adr/0086),
 * and never in the test suite, which runs the job itself.
 * Started once per process (the timer keeps a flag on globalThis), and
 * nothing in here may stop the server: a key that does not parse is said
 * once, here, and the rest of Kadence runs without reminders.
 */
export async function startReminders(): Promise<void> {
  if (process.env.NODE_ENV === "test") return;
  try {
    const { remindersOn } = await import("@/core/features");
    const { mailConfigured } = await import("@/core/mail/mailer");
    if (!remindersOn() && !mailConfigured()) return;
    const { pushConfig, startReminderTimer } = await import("@/modules/push/timer");
    pushConfig();
    startReminderTimer();
  } catch (error) {
    console.error("kadence: reminders are off, the push keys did not load.");
    console.error(error instanceof Error ? error.message : String(error));
  }
}
