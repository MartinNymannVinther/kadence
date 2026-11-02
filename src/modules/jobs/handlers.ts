import { registry, type Handler } from "@/core/jobs/registry";
import { sweepHandler } from "@/core/jobs/sweep";
import { billingExpireHandler } from "@/modules/billing/jobs";
import { demoCleanupHandler } from "@/modules/demo/job";
import { deviceRefreshHandler } from "@/modules/devices/refresh-job";
import { retimeHandler } from "@/modules/devices/retime-job";
import { deviceFetchHandler } from "@/modules/devices/webhooks";
import { deviceWorkoutsHandler } from "@/modules/devices/workouts-job";
import { remindersHandler } from "@/modules/push/jobs";
import { dcuRacesHandler, dcuReadHandler } from "@/modules/results/jobs";
import { signupSweepHandler } from "@/modules/signup/job";
import { filesMigrateHandler } from "@/modules/storage/migrate";
import { filesMoveHandler } from "@/modules/storage/move";
import { fileTombstonesHandler } from "@/modules/storage/tombstones";
import { teamsRefreshHandler } from "@/modules/teams/refresh";

/**
 * Every kind of job Kadence has, and what runs it (docs/adr/0085). The
 * worker runs from this list and nothing else; a kind missing here is a
 * job nobody would run, which tests/jobs/payload.test.ts catches for every
 * kind a module declares.
 */
export const HANDLERS: readonly Handler[] = [
  sweepHandler,
  remindersHandler,
  deviceFetchHandler,
  deviceRefreshHandler,
  deviceWorkoutsHandler,
  dcuReadHandler,
  dcuRacesHandler,
  teamsRefreshHandler,
  demoCleanupHandler,
  signupSweepHandler,
  billingExpireHandler,
  fileTombstonesHandler,
  filesMoveHandler,
  filesMigrateHandler,
  retimeHandler,
];

export function jobHandlers(): Map<string, Handler> {
  return registry(HANDLERS);
}
