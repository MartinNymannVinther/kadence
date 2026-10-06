import { env } from "@/core/env";

/**
 * The parts of Kadence an installation may park (docs/adr/0057). Each is
 * on unless the installation says "off". Turning one off hides it
 * everywhere at once — the menu, the page, the action behind it and the
 * demo — and removes nothing: the code stays, and so do the rows.
 *
 * Read on the server only. A client component that needs one gets the
 * answer as a prop from the page that rendered it.
 */
export const FEATURES = [
  "rulleWorld",
  "coachesRoom",
  "clubChampionship",
  "energyCalculator",
  "foodGuide",
] as const;
export type Feature = (typeof FEATURES)[number];
export type Features = Record<Feature, boolean>;

type FeatureEnv = Pick<
  typeof env,
  "RULLE_WORLD" | "COACHES_ROOM" | "CLUB_CHAMPIONSHIP" | "CALC_ENERGY" | "GUIDE_FOOD"
>;

/** The installation's features from its environment. Pure, for the tests. */
export function featuresFrom(source: FeatureEnv): Features {
  return {
    rulleWorld: source.RULLE_WORLD === "on",
    coachesRoom: source.COACHES_ROOM === "on",
    clubChampionship: source.CLUB_CHAMPIONSHIP === "on",
    energyCalculator: source.CALC_ENERGY === "on",
    foodGuide: source.GUIDE_FOOD === "on",
  };
}

/** This installation's features. */
export function features(): Features {
  return featuresFrom(env);
}

/** Whether this installation has turned `feature` on. */
export function featureOn(feature: Feature): boolean {
  return features()[feature];
}

/** Whether reminders can be sent: the installation has a push key pair. */
export function remindersOn(): boolean {
  return Boolean(env.PUSH_PUBLIC_KEY && env.PUSH_PRIVATE_KEY);
}
