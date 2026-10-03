import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * The pure logic on its own: DCU's numbers, age classes, load, zones,
 * guardrails, the FIT decoder, the workout files, the coach guide, a
 * rider's page at Cykling Danmark, and Rulle's routes, physics, timeline
 * and Bluetooth. No database, no global setup, no network —
 * `pnpm test:unit` runs anywhere, in a second.
 * `pnpm test` runs these too, with everything else.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: [
      "tests/{dcu,load,fit,workouts,charts,coach,files,rulle,results,club,paradigms}/**/*.test.ts",
    ],
  },
});
