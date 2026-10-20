import { cleanupExpiredDemos, demoEnabled } from "../src/modules/demo/service";

/**
 * Deletes expired demo workspaces, now. The worker does this every hour
 * (`demo.cleanup`, docs/adr/0085) and a new demo does it first, so this
 * script is for a person who wants it done this minute, on a machine with
 * a checkout. The server's own way is a POST to `/api/demo/cleanup`.
 *
 *   pnpm script scripts/cleanup-demos.ts
 */
async function main() {
  if (!demoEnabled()) {
    console.log("cleanup-demos: DEMO is off, nothing to do");
    return;
  }
  const removed = await cleanupExpiredDemos();
  console.log(`cleanup-demos: removed ${removed} expired demo workspace(s)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("cleanup-demos: failed", error);
    process.exit(1);
  });
