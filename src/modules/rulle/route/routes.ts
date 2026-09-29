/**
 * The routes that come with Kadence. Each is an ordinary GPX file in
 * `public/rulle/routes`, fetched by the browser and read through the same
 * import as a rider's own file (`gpx-route.ts`, `course.ts`): the file is
 * the route, and adding one is a file and a line here.
 *
 * `credits` names where the roads and heights came from, as their
 * licences ask; the words for each are in the message catalogues
 * (`rulle.credits`).
 */

export type RouteCredit = "osm" | "eudem";

export type BundledRoute = {
  key: string;
  file: string;
  credits: readonly RouteCredit[];
};

export const ROUTES = [
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
  },
] as const satisfies readonly BundledRoute[];

export type RouteKey = (typeof ROUTES)[number]["key"];

export const DEFAULT_ROUTE: RouteKey = "vejle";

export function bundledRoute(key: string | null | undefined): BundledRoute {
  return ROUTES.find((r) => r.key === key) ?? ROUTES[0];
}
