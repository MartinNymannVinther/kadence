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
 * Starts the app's own worker (docs/adr/0085) unless a worker container
 * runs the jobs (`WORKER=on`): then the app only puts work in the queue.
 * Without one, the app takes the jobs itself, as it ran the reminder
 * timer before (docs/adr/0060), so an installation of one container
 * works as it did. Never in the test suite, which runs jobs itself.
 *
 * Nothing in here may stop the server. Push keys that do not parse are
 * said once, here, and the rest of Kadence runs without reminders; a
 * worker that cannot start is said, and the app serves pages without it.
 */
export async function startJobs(): Promise<void> {
  if (process.env.NODE_ENV === "test") return;
  try {
    const { remindersOn } = await import("@/core/features");
    if (remindersOn()) {
      const { pushConfig } = await import("@/modules/push/timer");
      pushConfig();
    }
  } catch (error) {
    console.error("kadence: reminders are off, the push keys did not load.");
    console.error(error instanceof Error ? error.message : String(error));
  }
  try {
    const { env } = await import("@/core/env");
    if (env.WORKER === "on") return;
    const { startJobsInApp } = await import("@/modules/jobs/start");
    await startJobsInApp();
  } catch (error) {
    console.error("kadence: background jobs did not start in the app.");
    console.error(error instanceof Error ? error.name : "unknown");
  }
}
