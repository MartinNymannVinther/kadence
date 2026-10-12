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
      // Exercises and programmes: the contract, the figures, Kadence's own and their words,
      // the URL composition, the downloaded file, the pose editor and its props, the programme builder's
      // draft and a programme as a session. The team's own, laying a programme in and the
      // download route need the database.
      "tests/exercises/{builtin,contract,figure,view,compose,download-html,html-escape,library-paths,pose-edit,pose-props,program-draft,program-session}.test.ts",
      // The menu and the settings tabs by role and group (docs/adr/0068).
      "tests/core/{nav-items,settings-items,log,new-version}.test.ts",
      // Which week plan the planner shows when this device and the shared draft differ
      // (docs/adr/0043, amended 2026-10-07); the draft's service and policies need the database.
      "tests/training/week-draft-merge.test.ts",
      // The shorter check-in's starting answers (backlog P2-11; docs/adr/0021, amended 2026-10-07).
      "tests/wellbeing/checkin-prefill.test.ts",
      // Søg's matching, its groups and the words its static places need; the index needs the database.
      "tests/search/{match,groups,places}.test.ts",
      // What a model call costs, and the providers' token counts it is priced from
      // (docs/adr/0089); recording it and the budget need the database.
      "tests/ai/prices.test.ts",
      // Which price plan applies, what it costs, and what the pages say about a plan
      // (docs/adr/0090); the plans in the database, the job and the mails need it.
      "tests/billing/{which-plan,banner,allowlist,landing,price-page}.test.ts",
      "tests/llm/usage-fixtures.test.ts",
      // The calendar's month and season: the grid, the addresses, the days and a month's standing
      // (docs/adr/0093); what they read needs the database.
      "tests/calendar/{grid,href,month-days,standing,team-days}.test.ts",
    ],
  },
});
