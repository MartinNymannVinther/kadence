import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Copies MapLibre's worker and the module it imports into public/maplibre,
 * so Kadence serves them itself (ADR 0023): MapLibre 6 loads its tile
 * worker as a module from a URL, which a bundler does not follow. Run after
 * upgrading maplibre-gl; tests/meta/maplibre-worker.test.ts fails while
 * the copies and the installed package differ.
 *
 *     pnpm script scripts/copy-maplibre-worker.ts
 */
export const WORKER_FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"] as const;

const from = resolve("node_modules/maplibre-gl/dist");
const to = resolve("public/maplibre");
mkdirSync(to, { recursive: true });
for (const file of WORKER_FILES) copyFileSync(resolve(from, file), resolve(to, file));
console.log(`copy-maplibre-worker: ${WORKER_FILES.join(", ")} → public/maplibre`);
