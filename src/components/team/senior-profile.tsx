import { seasonStartYear } from "@/modules/dcu";
import { isSeniorProfile } from "@/modules/paradigms";
import { isSeniorIn } from "@/modules/season/class";
import { TrainingProfileCard } from "./training-profile-card";

/**
 * The training profile's card, for a rider whose class this season is
 * senior and for nobody else (docs/adr/0091): U17–U23 plan by DCU, and a
 * youth rider has no hours of DCU's either.
 */
export function SeniorProfile({
  rider,
  today,
}: {
  rider: {
    id: string;
    birthYear: number;
    categoryOverride: string | null;
    trainingProfile: string | null;
  };
  today: string;
}) {
  if (!isSeniorIn(rider, seasonStartYear(today))) return null;
  return (
    <TrainingProfileCard
      riderId={rider.id}
      profile={isSeniorProfile(rider.trainingProfile) ? rider.trainingProfile : null}
    />
  );
}
