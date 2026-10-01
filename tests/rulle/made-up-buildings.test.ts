import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ground } from "@/components/rulle/scene/ground";
import { madeUpBuildings } from "@/components/rulle/scene/made-up-buildings";
import { CHUNK } from "@/components/rulle/scene/terrain";
import { buildCourse, MAPPED, readLand, readRouteGpx } from "@/modules/rulle";

const ry = buildCourse(
  readRouteGpx(readFileSync("public/rulle/routes/ry-himmelbjerget.gpx", "utf8")),
);
const ground = new Ground(
  ry,
  readLand(JSON.parse(readFileSync("public/rulle/routes/ry-himmelbjerget.land.json", "utf8")), ry),
);

/** The landscape draws the chunks whose middle is this near the rider, on the road. */
const DRAWN = 2300;

/** Every house made up in the chunks drawn round Ry, with the land's buildings out to `mapped`. */
function madeUp(mapped: number) {
  const out = [];
  for (let cx = -8; cx < 8; cx++)
    for (let cz = -10; cz < 10; cz++) {
      if (ground.nearest((cx + 0.5) * CHUNK, (cz + 0.5) * CHUNK, DRAWN).d > DRAWN) continue;
      out.push(...madeUpBuildings(ground, 1, cx, cz, [], () => true, mapped));
    }
  return out;
}

describe("the buildings no one mapped for the ride", () => {
  it("fill the towns beyond the land's own, and never nearer the road", () => {
    const houses = madeUp(MAPPED);
    expect(houses.length).toBeGreaterThan(100);
    for (const b of houses) expect(ground.nearest(b.x, b.z, MAPPED + 50).d).toBeGreaterThan(MAPPED);
  });

  it("are none where the land has every building it holds (ADR 0046)", () => {
    expect(madeUp(2600)).toEqual([]);
  });
});
