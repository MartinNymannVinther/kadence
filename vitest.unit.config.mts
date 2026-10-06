import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * The pure logic on its own: DCU's numbers, age classes, load, zones,
 * guardrails, the FIT decoder, the workout files, the coach guide, a
 * rider's page at Cykling Danmark, Rulle's routes, physics, timeline and
 * Bluetooth, and the open calculators and guides. No database, no global
 * setup, no network — `pnpm test:unit` runs anywhere, in a second.
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
      "tests/{dcu,load,fit,workouts,charts,coach,files,rulle,results,paradigms,calc,guides}/**/*.test.ts",
      // The championship's arithmetic only; tests/club/championship.test.ts needs the database.
      "tests/club/standings.test.ts",
      // Reminders' keys, timing and words; the job and the policies need the database.
      "tests/push/{vapid,due,texts}.test.ts",
    ],
  },
});
