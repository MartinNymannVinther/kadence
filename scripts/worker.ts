// A checkout keeps its database URLs in .env; the container has them in
// the environment already, and a missing file is silently fine.
import "dotenv/config";

/**
 * The worker container's process (docs/adr/0085): the background jobs
 * without Next. It boots the environment, the database pools and the list
 * of job kinds, puts the recurring jobs in place, and takes due jobs until
 * it is told to stop.
 *
 *   pnpm script scripts/worker.ts            # beside `pnpm dev`, with WORKER=on in .env
 *   docker compose up worker                 # the `worker` service, same code, same tree
 *
 * On SIGTERM (a deploy, `docker compose stop`) it stops taking jobs,
 * gives back the ones it took and did not start, and waits up to eight
 * seconds for the one running; Docker's own grace is ten. A job still
 * running then is not lost: its lease runs out and the next worker takes
 * it again.
 *
 * An environment that does not validate stops the process with the
 * reason, as the app's own start does (src/instrumentation-node.ts), and
 * Docker restarts it rather than showing it as up.
 */

async function main() {
  try {
    await import("../src/core/env");
  } catch (error) {
    console.error("kadence worker: refusing to start, the environment is not valid.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
  const { startJobs } = await import("../src/modules/jobs/start");
  const { appPool, authPool } = await import("../src/core/db/client");
  const worker = await startJobs({ keepAlive: true });

  let stopping = false;
  const stop = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`kadence worker: ${signal}, stopping`);
    await worker.stop(8_000);
    await Promise.allSettled([appPool.end(), authPool.end()]);
    process.exit(0);
  };
  process.on("SIGTERM", () => void stop("SIGTERM"));
  process.on("SIGINT", () => void stop("SIGINT"));
}

main().catch((error) => {
  console.error("kadence worker: failed to start", error instanceof Error ? error.name : error);
  process.exit(1);
});
