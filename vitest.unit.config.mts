import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * The pure logic on its own: DCU's numbers, age classes, load, zones,
 * guardrails, the FIT decoder, the workout files, the coach guide, a
 * rider's page at Cykling Danmark, Rulle's routes, physics, timeline and
 * Bluetooth, the open calculators and guides, and what Today and a
 * ride's page decide (docs/adr/0063). No database, no global
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
      "tests/{dcu,load,fit,workouts,charts,coach,files,rulle,results,paradigms,calc,guides,today,activities}/**/*.test.ts",
      // The championship's arithmetic only; tests/club/championship.test.ts needs the database.
      "tests/club/standings.test.ts",
      // Reminders' keys, timing and words; the job and the policies need the database.
      "tests/push/{vapid,due,texts}.test.ts",
      // The pilot's three numbers (docs/adr/0066); the service and the overview need the database.
      "tests/insight/pilot-numbers.test.ts",
      // The list "Inviter hele holdet" reads and who its links go to; the service needs the database.
      "tests/team/{bulk-parse,invitation-recipients}.test.ts",
      // Exercises and programmes: the contract, the figures, Kadence's own,
      // their words, the URL composition and the downloaded file. Not
      // team-exercises, team-programs or team-schema: those need the database.
      "tests/exercises/{builtin,contract,figure,view,compose,download-html,html-escape}.test.ts",
    ],
  },
});
