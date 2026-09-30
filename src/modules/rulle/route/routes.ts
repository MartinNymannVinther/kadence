/**
 * The routes that come with Kadence (ADR 0033, 0035). Each is an ordinary GPX file in
 * `public/rulle/routes`, fetched by the browser and read through the same
 * import as a rider's own file (`gpx-route.ts`, `course.ts`): the file is
 * the route, and adding one is a file and a line here. Beside it lies the
 * land round it (`land.ts`), made once by `scripts/rulle-land.ts`.
 *
 * `credits` names where the roads, the heights and the land came from, as
 * their licences ask; the words for each are in the message catalogues
 * (`rulle.credits`).
 */

export type RouteCredit =
  "osm" | "eudem" | "terrain" | "terrainCanada" | "buDm2026" | "futureRacing2026" | "montreal2026";

/** The cities a route that comes with Kadence runs through (ADR 0036). */
export type City = "kobenhavn" | "montreal";

export type BundledRoute = {
  key: string;
  file: string;
  /** The land round the route: heights, woods, water, towns (ADR 0035). */
  land?: string;
  credits: readonly RouteCredit[];
  /** Kilometres a lap and metres climbed, as the file comes to (a test holds them to it). */
  km: number;
  climb: number;
  /** A race's course: the lap ends at a finish line where it starts, with its arch. */
  finish?: boolean;
  /**
   * In a city: streets with kerbs, cycle tracks and pavements, blocks of
   * flats, and on race day its crowd and its marshals (ADR 0036).
   */
  city?: City;
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
    land: "/rulle/routes/bu-dm-2026-vejle.land.json",
    credits: ["buDm2026", "osm", "terrain"],
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
    land: "/rulle/routes/vejle-munkebjerg.land.json",
    credits: ["osm", "eudem", "terrain"],
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
    land: "/rulle/routes/ry-himmelbjerget.land.json",
    credits: ["osm", "eudem", "terrain"],
    km: 22.5,
    climb: 218,
  },
  {
    key: "future-racing-2026",
    /**
     * Future Racing 2026, the youth race on the Copenhagen Sprint circuit on
     * 14 June 2026, in the morning before the professionals ride it (DCU
     * District Sjælland with CC Hillerød and ABC København,
     * https://www.sportstiming.dk/event/18537): a closed lap of 10.3 km
     * from the finish by SMK in Sølvgade, past Kastellet, over the cobbles
     * of Adelgade, down Nørre Farimagsgade to Rådhuspladsen, along
     * the Lakes and back through Nørrebro. The organiser's route file, its
     * lap starting at the finish line, with its marks (the obstacles, the
     * cobbles, the feed zone); heights from EU-DEM v1.1.
     */
    file: "/rulle/routes/future-racing-2026-kobenhavn.gpx",
    land: "/rulle/routes/future-racing-2026-kobenhavn.land.json",
    credits: ["futureRacing2026", "osm", "eudem", "terrain"],
    km: 10.3,
    climb: 50,
    finish: true,
    city: "kobenhavn",
  },
  {
    key: "montreal-2026",
    /**
     * The Mont-Royal circuit of the 2026 UCI Road World Championships in
     * Montreal (20–27 September 2026), the circuit alone: from the finish
     * on Avenue du Parc by the George-Étienne Cartier monument up Voie
     * Camillien-Houde, down Chemin Remembrance and Côte-des-Neiges, up
     * Chemin de Polytechnique through the Université de Montréal, through
     * Outremont, round Parc Jeanne-Mance and up Avenue du Parc to the line.
     * 13.4 km and 269 m by the official course map
     * (https://www.montreal2026.org/defi-montreal-2026/); drawn along
     * OpenStreetMap's roads through the streets that map names, 13.6 km
     * and 271 m. Heights from Mapzen's terrain model (CDEM in Canada).
     */
    file: "/rulle/routes/montreal-2026-mont-royal.gpx",
    land: "/rulle/routes/montreal-2026-mont-royal.land.json",
    credits: ["montreal2026", "osm", "terrainCanada"],
    km: 13.6,
    climb: 271,
    finish: true,
    city: "montreal",
  },
] as const satisfies readonly BundledRoute[];

export type RouteKey = (typeof ROUTES)[number]["key"];

export const DEFAULT_ROUTE: RouteKey = "bu-dm-2026";

export function bundledRoute(key: string | null | undefined): BundledRoute {
  return ROUTES.find((r) => r.key === key) ?? ROUTES[0];
}
