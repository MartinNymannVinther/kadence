import type { RiderRow } from "@/core/db/schema";
import type { OrgContext } from "@/core/db/tenant";
import { getTeamSettings } from "@/modules/team/settings";
import { knownPainView, listKnownPains } from "@/modules/wellbeing/known-pains";
import { isYouth, listMeasurements } from "@/modules/wellbeing/measurements";
import { KnownPainsCard } from "./known-pains-card";
import { MeasurementsCard, type MeasurementRow } from "./measurements-card";

/**
 * The body on a coach's rider page: height through the growth spurt (ADR
 * 0013) and the known pains (docs/adr/0097), each read under RLS as the
 * coach.
 */
export async function RiderBodyCards({
  ctx,
  rider,
  today,
}: {
  ctx: OrgContext;
  rider: RiderRow;
  today: string;
}) {
  const [measurements, settings, pains] = await Promise.all([
    listMeasurements(ctx, rider.id),
    getTeamSettings(ctx),
    listKnownPains(ctx, rider.id),
  ]);
  const shown: MeasurementRow[] = measurements.flatMap((m) =>
    m.kind === "height_cm" || m.kind === "weight_kg"
      ? [{ id: m.id, measuredOn: m.measuredOn, kind: m.kind, value: Number(m.value) }]
      : [],
  );
  return (
    <>
      <MeasurementsCard
        riderId={rider.id}
        today={today}
        rows={shown}
        weightAllowed={settings.allowYouthWeight || !isYouth(rider.birthYear, today)}
      />
      <KnownPainsCard riderId={rider.id} pains={pains.map(knownPainView)} own={false} />
    </>
  );
}
