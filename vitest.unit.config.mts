import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * The pure logic on its own: DCU's numbers, age classes, load, zones,
 * guardrails, the FIT decoder and the workout files. No database, no
 * global setup, no network — `pnpm test:unit` runs anywhere, in a second.
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
    include: ["tests/{dcu,load,fit,workouts}/**/*.test.ts"],
  },
});
