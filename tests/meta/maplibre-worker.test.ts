import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The map's worker is served from public/maplibre (ADR 0023). A copy that
 * drifts from the installed maplibre-gl breaks the map without an error
 * anyone sees, so this fails first: run scripts/copy-maplibre-worker.ts.
 */
describe("the map's worker", () => {
  for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"])
    it(`serves the installed maplibre-gl's ${file}`, () => {
      expect(
        readFileSync(`public/maplibre/${file}`).equals(
          readFileSync(`node_modules/maplibre-gl/dist/${file}`),
        ),
      ).toBe(true);
    });
});
