import type { RiderRow } from "@/core/db/schema";
import type { OrgContext } from "@/core/db/tenant";
import { hasRidesForProposal } from "@/modules/training/threshold-proposal";
import { ThresholdsForm } from "./thresholds-form";

/**
 * The thresholds form as the rider's own page and the coach's rider page
 * show it: with "Foreslå ud fra …" when the rider has a ride in the last
 * year, opened straight away when a ride's page sent the reader here
 * (`?forslag=1`, docs/adr/0094).
 */
export async function RiderThresholds({
  ctx,
  rider,
  today,
  own,
  ask,
}: {
  ctx: OrgContext;
  rider: RiderRow;
  today: string;
  own: boolean;
  /** The page's `forslag` search parameter. */
  ask: string | undefined;
}) {
  const canPropose = await hasRidesForProposal(ctx, rider.id, today);
  return (
    <ThresholdsForm
      riderId={rider.id}
      today={today}
      own={own}
      canPropose={canPropose}
      autoPropose={canPropose && ask === "1"}
      initial={{
        ftpWatts: rider.ftpWatts,
        thresholdHr: rider.thresholdHr,
        maxHr: rider.maxHr,
        restingHr: rider.restingHr,
        thresholdsOn: rider.thresholdsOn,
      }}
    />
  );
}
