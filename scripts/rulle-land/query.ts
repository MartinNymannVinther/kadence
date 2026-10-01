/**
 * What the land script (`rulle-land.ts`, ADR 0035) asks OpenStreetMap's
 * Overpass API for: what covers the land in the box round the route, the
 * buildings near the road (or every one in the box), and what must be
 * found within metres of the road. `along` is the road's line every few
 * hundred metres, `near` every 20, both as "lat,lon".
 */

/** Street trees are fetched this close to the road. */
export const TREES = 60;
/** Cobbled streets are fetched this close to the road. */
export const SETTS = 30;
/** Bridges and tunnels are fetched this close to the road. */
export const STRUCTURES = 60;

export function landQuery(
  bbox: string,
  along: string[],
  near: string[],
  /** Metres from the road to fetch the buildings; "all" for every one in the box. */
  reach: number | "all",
): string {
  const buildings =
    reach === "all"
      ? `way["building"](${bbox});
    way["building:part"](${bbox});`
      : `way["building"](around:${reach},${along.join(",")});
    way["building:part"](around:${reach},${along.join(",")});
    way["building"]["height"](${bbox});
    way["building:part"]["height"](${bbox});
    way["building"~"^(church|cathedral|chapel|basilica)$"](${bbox});`;
  return `[out:json][timeout:180];
  (
    way["natural"~"^(wood|water|wetland|heath|scrub|grassland|beach|sand)$"](${bbox});
    relation["natural"~"^(wood|water|wetland|heath|scrub|grassland)$"](${bbox});
    way["landuse"~"^(forest|farmland|meadow|grass|residential|industrial|commercial|retail|orchard|allotments|cemetery|farmyard|recreation_ground|village_green|reservoir|basin)$"](${bbox});
    relation["landuse"~"^(forest|farmland|meadow|grass|residential|industrial|commercial|retail|orchard|farmyard)$"](${bbox});
    way["leisure"~"^(park|golf_course|garden|pitch)$"](${bbox});
    relation["leisure"~"^(park|golf_course|garden)$"](${bbox});
    relation["landuse"~"^(grass|meadow|recreation_ground|cemetery|allotments)$"](${bbox});
    way["waterway"~"^(river|stream|canal|riverbank|ditch|drain)$"](${bbox});
    way["natural"="tree_row"](${bbox});
    way["barrier"="hedge"](${bbox});
    way["landuse"="cemetery"](${bbox});
    way["amenity"="grave_yard"](${bbox});
    ${buildings}
    node["natural"="tree"](around:${TREES},${along.join(",")});
    way["highway"]["surface"~"^(sett|cobblestone|unhewn_cobblestone)$"](around:${SETTS},${near.join(",")});
    way["bridge"]["bridge"!="no"](around:${STRUCTURES},${near.join(",")});
    way["tunnel"]["tunnel"!="no"](around:${STRUCTURES},${near.join(",")});
    node["generator:source"="wind"](${bbox});
  );
  out geom qt;`;
}
