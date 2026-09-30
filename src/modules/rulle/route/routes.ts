/**
 * The routes that come with Kadence (ADR 0033, 0035). Each is an ordinary GPX file in
 * `public/rulle/routes`, fetched by the browser and read through the same
 * import as a rider's own file (`gpx-route.ts`, `course.ts`): the file is
 * the route, and adding one is a file and a line here.
 *
 * `credits` names where the roads and heights came from, as their
 * licences ask; the words for each are in the message catalogues
 * (`rulle.credits`).
 */

export type RouteCredit = "osm" | "eudem" | "race";

export type BundledRoute = {
  key: string;
  file: string;
  credits: readonly RouteCredit[];
  /** Kilometres a lap and metres climbed, as the file comes to (a test holds them to it). */
  km: number;
  climb: number;
  /** A race's course: the lap ends at a finish line where it starts, with its arch. */
  finish?: boolean;
};

export const ROUTES = [
  {
    key: "bu-dm-2026",
    /**
     * The road race of the Danish youth championships, B&U DM 2026, in
     * Vejle on 30 August 2026: a one-way lap of 10 km from the finish at
     * Vejledalen (toppen), down Sleldevej and up Vardevej to the top again
     * (https://www.sportstiming.dk/event/17480). The race's own route file,
     * heights as in it.
     */
    file: "/rulle/routes/bu-dm-2026-vejle.gpx",
    credits: ["race"],
    km: 10.0,
    climb: 144,
    finish: true,
  },
  {
    key: "vejle",
    /**
     * Vejle station, the south shore of Vejle Fjord, Munkebjerg, the
     * plateau and Kiddesvej: 18.0 km with about 230 m of climbing. Roads
     * from OpenStreetMap routed by BRouter; heights from EU-DEM v1.1
     * (25 m), with the shoreline points it leaves empty from SRTM.
     */
    file: "/rulle/routes/vejle-munkebjerg.gpx",
    credits: ["osm", "eudem"],
    km: 18.0,
    climb: 222,
  },
  {
    key: "himmelbjerget",
    /**
     * From Ry station through the woods up to Himmelbjerget above Julsø,
     * south past Gammel Rye and back to Ry: 22.5 km. Roads from
     * OpenStreetMap routed by BRouter (fastbike); heights from EU-DEM v1.1.
     */
    file: "/rulle/routes/ry-himmelbjerget.gpx",
    credits: ["osm", "eudem"],
    km: 22.5,
    climb: 218,
  },
] as const satisfies readonly BundledRoute[];

export type RouteKey = (typeof ROUTES)[number]["key"];

export const DEFAULT_ROUTE: RouteKey = "bu-dm-2026";

export function bundledRoute(key: string | null | undefined): BundledRoute {
  return ROUTES.find((r) => r.key === key) ?? ROUTES[0];
}
