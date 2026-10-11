import { describe, expect, it } from "vitest";
import { env } from "@/core/env";
import { pushConfig, runRemindersOnce } from "@/modules/push/timer";
import { newVapidKeyPair } from "@/modules/push/vapid";

/**
 * One reminder run (docs/adr/0060): nothing without the key pair, and two
 * calls at once share one run. When it runs is a recurring job now
 * (docs/adr/0085, tests/jobs/moved.test.ts); the job itself is
 * tests/push/job.test.ts.
 */

describe("a run", () => {
  it("does nothing without the key pair", async () => {
    expect(env.PUSH_PUBLIC_KEY).toBeUndefined();
    expect(pushConfig()).toBeNull();
    expect(await runRemindersOnce()).toBeNull();
  });

  it("reads the key pair, and the installation's address as the contact", () => {
    const pair = newVapidKeyPair();
    const before = { PUSH_PUBLIC_KEY: env.PUSH_PUBLIC_KEY, PUSH_PRIVATE_KEY: env.PUSH_PRIVATE_KEY };
    Object.assign(env, { PUSH_PUBLIC_KEY: pair.publicKey, PUSH_PRIVATE_KEY: pair.privateKey });
    try {
      const config = pushConfig();
      expect(config?.keys.publicKey).toBe(pair.publicKey);
      expect(config?.subject).toBe("http://localhost:3000");
    } finally {
      Object.assign(env, before);
    }
  });

  it("is shared by two callers at once", () => {
    const first = runRemindersOnce();
    expect(runRemindersOnce()).toBe(first);
    return first;
  });
});
