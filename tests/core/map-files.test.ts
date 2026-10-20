import { mkdtemp, rm, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MAX_RANGE_BYTES, firstMapFile, rangeResponse } from "@/core/map/file";
import { LEGACY_DETAIL_FILE, mapCandidates, mapVersion } from "@/core/map/paths";

/**
 * Which map file is read (docs/adr/0099): the configured one, and until
 * the new fetch has run, the old Denmark file beside the detail file.
 */
describe("the map files' paths", () => {
  it("tries the detail file, then the old Denmark file beside it", () => {
    expect(mapCandidates("detail", { MAP_FILE: "/data/map/detail.pmtiles" }, "/app")).toEqual([
      "/data/map/detail.pmtiles",
      "/data/map/denmark.pmtiles",
    ]);
    expect(mapCandidates("detail", { MAP_FILE: "./data/map/detail.pmtiles" }, "/repo")).toEqual([
      "/repo/data/map/detail.pmtiles",
      "/repo/data/map/denmark.pmtiles",
    ]);
  });

  it("keeps an older .env that names the Denmark file as it is", () => {
    expect(mapCandidates("detail", { MAP_FILE: "./data/map/denmark.pmtiles" }, "/repo")).toEqual([
      "/repo/data/map/denmark.pmtiles",
    ]);
  });

  it("has a world only when MAP_WORLD_FILE names one, with no stand-in", () => {
    expect(mapCandidates("world", { MAP_FILE: "/data/map/detail.pmtiles" }, "/app")).toEqual([]);
    expect(mapCandidates("world", { MAP_WORLD_FILE: "/data/map/world.pmtiles" }, "/app")).toEqual([
      "/data/map/world.pmtiles",
    ]);
    expect(mapCandidates("detail", {}, "/app")).toEqual([]);
  });

  it("gives a new file a new version", () => {
    expect(mapVersion(638656681, 1_760_000_000_000)).not.toBe(
      mapVersion(638656681, 1_760_000_100_000),
    );
    expect(mapVersion(1, 2)).not.toBe(mapVersion(2, 2));
    expect(mapVersion(638656681, 1_760_000_000_000.7)).toMatch(/^[0-9a-z]+-[0-9a-z]+$/);
  });
});

describe("reading the map files", () => {
  let dir = "";
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "kadence-map-"));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("falls back to the old Denmark file until the detail file is there", async () => {
    const detail = join(dir, "detail.pmtiles");
    const legacy = join(dir, LEGACY_DETAIL_FILE);
    const paths = [detail, legacy];
    expect(await firstMapFile(paths)).toBeNull();

    await writeFile(legacy, "denmark");
    expect((await firstMapFile(paths))?.path).toBe(legacy);

    // An empty file is no map.
    await writeFile(detail, "");
    expect((await firstMapFile(paths))?.path).toBe(legacy);

    await writeFile(detail, "denmark and the camps");
    const found = await firstMapFile(paths);
    expect(found).toMatchObject({ path: detail, size: 21 });
    expect(found?.version).toMatch(/^l-/);
  });

  it("answers one range with the bytes, and refuses a range that is too big", async () => {
    const path = join(dir, "world.pmtiles");
    await writeFile(path, "0123456789");
    const file = (await firstMapFile([path]))!;

    const ok = await rangeResponse("bytes=2-5", file);
    expect(ok.status).toBe(206);
    expect(ok.headers.get("Content-Range")).toBe("bytes 2-5/10");
    expect(ok.headers.get("ETag")).toBe(`"${file.version}"`);
    expect(ok.headers.get("Cache-Control")).toContain("private");
    expect(await ok.text()).toBe("2345");

    expect((await rangeResponse(null, file)).status).toBe(416);

    await truncate(path, MAX_RANGE_BYTES + 10);
    const big = (await firstMapFile([path]))!;
    const refused = await rangeResponse(`bytes=0-${MAX_RANGE_BYTES}`, big);
    expect(refused.status).toBe(416);
    expect(refused.headers.get("Content-Range")).toBe(`bytes */${MAX_RANGE_BYTES + 10}`);
  });
});
