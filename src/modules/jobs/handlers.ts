import { registry, type Handler } from "@/core/jobs/registry";
import { sweepHandler } from "@/core/jobs/sweep";
import { demoCleanupHandler } from "@/modules/demo/job";
import { deviceFetchHandler } from "@/modules/devices/webhooks";
import { remindersHandler } from "@/modules/push/jobs";
import { dcuRacesHandler, dcuReadHandler } from "@/modules/results/jobs";
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
  dcuReadHandler,
  dcuRacesHandler,
  teamsRefreshHandler,
  demoCleanupHandler,
  fileTombstonesHandler,
  filesMoveHandler,
  filesMigrateHandler,
];

export function jobHandlers(): Map<string, Handler> {
  return registry(HANDLERS);
}
