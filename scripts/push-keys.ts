/**
 * Prints a fresh key pair for reminders (docs/adr/0059), in the format
 * .env and Coolify take:
 *
 *   pnpm script scripts/push-keys.ts
 *
 * The public key goes to every browser that turns reminders on; the
 * private key signs each push and is a secret — .env locally, Coolify in
 * production, never the repository. A new pair means every browser has
 * to turn reminders on again, so make one per installation and keep it.
 *
 * node:crypto makes the pair (P-256), so no web-push package is needed.
 */
import { newVapidKeyPair, parseVapidKeys } from "@/modules/push/vapid";

const pair = newVapidKeyPair();
// The same check the app runs when it starts: the two belong together.
parseVapidKeys(pair.publicKey, pair.privateKey);

console.log(`PUSH_PUBLIC_KEY=${pair.publicKey}`);
console.log(`PUSH_PRIVATE_KEY=${pair.privateKey}`);
console.log("PUSH_CONTACT=mailto:you@example.com");
