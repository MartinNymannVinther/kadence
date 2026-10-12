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
  "teamsGuide",
] as const;
export type Feature = (typeof FEATURES)[number];
export type Features = Record<Feature, boolean>;

type FeatureEnv = Pick<
  typeof env,
  | "RULLE_WORLD"
  | "COACHES_ROOM"
  | "CLUB_CHAMPIONSHIP"
  | "CALC_ENERGY"
  | "GUIDE_FOOD"
  | "GUIDE_TEAMS"
>;

/** The installation's features from its environment. Pure, for the tests. */
export function featuresFrom(source: FeatureEnv): Features {
  return {
    rulleWorld: source.RULLE_WORLD === "on",
    coachesRoom: source.COACHES_ROOM === "on",
    clubChampionship: source.CLUB_CHAMPIONSHIP === "on",
    energyCalculator: source.CALC_ENERGY === "on",
    foodGuide: source.GUIDE_FOOD === "on",
    teamsGuide: source.GUIDE_TEAMS === "on",
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

/**
 * Where the parked parts answer, without a locale prefix: each path and
 * everything under it. Rulle's world is not a path — the session stays
 * and the world goes — so it is not here.
 */
export const PARKED_PATHS: ReadonlyArray<{ path: string; feature: Feature }> = [
  { path: "/coaches", feature: "coachesRoom" },
  { path: "/club", feature: "clubChampionship" },
  { path: "/calculators/energy", feature: "energyCalculator" },
  { path: "/guides/food", feature: "foodGuide" },
  { path: "/guides/teams", feature: "teamsGuide" },
];

/**
 * Whether `pathname` (its locale prefix already stripped) belongs to a
 * part the installation has off. The proxy asks before anything renders,
 * so the answer is a real 404 and not a not-found page streamed as 200
 * (docs/adr/0057, backlog P2-09). Pure, for the tests.
 */
export function parkedPath(pathname: string, on: Features): boolean {
  return PARKED_PATHS.some(
    ({ path, feature }) => !on[feature] && (pathname === path || pathname.startsWith(`${path}/`)),
  );
}

/**
 * The open price page, at /priser in Danish and /en/prices in English
 * (docs/adr/0090): it is there only while the installation prices its
 * workspaces. Not a part an installation parks — BILLING is off unless it
 * is turned on — but it answers 404 the same way, from the proxy, before
 * anything renders.
 */
export const PRICE_PATHS: readonly string[] = ["/priser", "/prices"];

/** Whether this installation prices its workspaces (BILLING=on). */
export function pricesOn(): boolean {
  return env.BILLING === "on";
}

/** Whether `pathname` (its locale prefix stripped) is the price page while there are no prices. Pure. */
export function pricePageParked(pathname: string, billing: boolean): boolean {
  return !billing && PRICE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Whether reminders can be sent: the installation has a push key pair. */
export function remindersOn(): boolean {
  return Boolean(env.PUSH_PUBLIC_KEY && env.PUSH_PRIVATE_KEY);
}
