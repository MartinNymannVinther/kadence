import type { OrgContext } from "@/core/db/tenant";
import { featureOn } from "@/core/features";
import { saveOrgImage } from "@/modules/team/images";
import { createTemplate } from "@/modules/training/templates";
import type { BikeStructure } from "@/modules/workouts/structure";
import { seedClubChampionship, type DemoRider } from "./club";
import { demoCoverPng, demoLogoPng } from "./club-images";
import { seedCoachesRoom } from "./coaches-room";
import { pick, type L } from "./seed-data";

/**
 * The rest of the product in the demo (docs/adr/0054), so a visitor sees
 * every part of it at work: the club's logo and picture (ADR 0048), a
 * rider's own session beside the library (ADR 0050), the club
 * championship (ADR 0051) and Trænerrummet with example threads
 * (ADR 0052). "Lav intensitet først" (ADR 0053) is a setting, turned on
 * with the others in seed.ts. Written through the ordinary services, as
 * the demo's coach. The demo follows the installation's flags (ADR 0056):
 * the championship and the room are seeded only where they are on.
 */

/** The demo rider's own session: what Emma rides on the trainer when it rains. */
const OWN_SESSION: BikeStructure = {
  kind: "bike",
  steps: [
    { kind: "step", intent: "warmup", seconds: 600, target: { kind: "zone", zone: 1 } },
    {
      kind: "repeat",
      times: 5,
      steps: [
        {
          kind: "step",
          intent: "work",
          seconds: 120,
          target: { kind: "zone", zone: 2 },
          cadenceLow: 100,
          cadenceHigh: 110,
        },
        { kind: "step", intent: "recover", seconds: 120, target: { kind: "zone", zone: 1 } },
      ],
    },
    { kind: "step", intent: "steady", seconds: 900, target: { kind: "zone", zone: 2 } },
    { kind: "step", intent: "cooldown", seconds: 300, target: { kind: "zone", zone: 1 } },
  ],
};

export async function seedShowcase(
  ctx: OrgContext,
  l: L,
  { today, riders, ownRiderId }: { today: string; riders: DemoRider[]; ownRiderId: string },
): Promise<void> {
  await saveOrgImage(ctx, "logo", demoLogoPng());
  await saveOrgImage(ctx, "cover", demoCoverPng());
  await createTemplate(ctx, {
    name: pick({ da: "Rolig rulletur med kadence", en: "Easy trainer ride with cadence" }, l),
    sport: "bike",
    description: pick(
      { da: "Det, jeg kører, når det regner.", en: "What I ride when it rains." },
      l,
    ),
    structure: OWN_SESSION,
    plannedMinutes: 0,
    riderId: ownRiderId,
  });
  if (featureOn("clubChampionship")) await seedClubChampionship(ctx, l, riders, today);
  if (featureOn("coachesRoom")) await seedCoachesRoom(ctx, l);
}
