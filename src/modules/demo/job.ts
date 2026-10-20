import { payload } from "@/core/jobs/payload";
import { handle, jobKind } from "@/core/jobs/registry";
import { SCHEDULE } from "@/core/jobs/schedule";
import { cleanupExpiredDemos, demoEnabled } from "./service";

/**
 * Demos past their 24 hours are deleted every hour (docs/adr/0085), so an
 * installation that gets no visitors does not keep yesterday's demos and
 * their throwaway accounts until somebody comes by. A new demo still
 * cleans up first (service.ts), because it counts the live demos against
 * the ceiling right after, and `/api/demo/cleanup` and
 * scripts/cleanup-demos.ts stay for an installation that drives it from
 * outside. Idempotent: delete_expired_demo() refuses, by doing nothing, a
 * demo another clean-up deleted first.
 */

export const demoCleanupJob = jobKind("demo.cleanup", payload({}), {
  every: SCHEDULE.demoCleanup,
  timeoutMs: 5 * 60_000,
});

export const demoCleanupHandler = handle(demoCleanupJob, async () =>
  demoEnabled() ? { removed: await cleanupExpiredDemos() } : null,
);
