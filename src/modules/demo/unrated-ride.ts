import { addDaysIso } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { importFit } from "@/modules/devices/import";
import { rideFit, routeFor } from "./rides";
import { pick, RIDERS, type L } from "./seed-data";

/**
 * Yesterday evening's ride for the demo's rider, come in as a file with
 * no answer yet to "how hard", so Today asks it (docs/adr/0063). Later in
 * the day than anything else the demo writes, so it is her latest ride.
 */
export async function seedUnratedRide(
  ctx: OrgContext,
  l: L,
  { today, riderId }: { today: string; riderId: string },
): Promise<void> {
  const emma = RIDERS[0]!;
  const yesterday = addDaysIso(today, -1);
  await importFit(
    ctx,
    riderId,
    `${pick({ da: "Aftentur med vennerne", en: "Evening ride with friends" }, l)}.fit`,
    rideFit(
      {
        route: routeFor(3, 60),
        kind: "endurance",
        minutes: 60,
        ftp: emma.ftp,
        thresholdHr: emma.thr,
        factor: 1,
        seed: 900,
      },
      Date.parse(`${yesterday}T16:30:00Z`),
    ),
  );
}
