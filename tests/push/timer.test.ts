import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "@/core/env";
import { pushConfig, runRemindersOnce, startReminderTimer } from "@/modules/push/timer";
import { newVapidKeyPair } from "@/modules/push/vapid";

/**
 * When the reminder run happens (docs/adr/0060): a timer started once per
 * process however often it is asked, never holding the process open, a
 * run that does nothing without the key pair, and two calls at once that
 * share one run. The job itself is tests/push/job.test.ts.
 */

const state = globalThis as unknown as { kadenceReminderTimer?: ReturnType<typeof setInterval> };

afterEach(() => {
  if (state.kadenceReminderTimer) clearInterval(state.kadenceReminderTimer);
  state.kadenceReminderTimer = undefined;
  vi.useRealTimers();
});

describe("the reminder timer", () => {
  it("starts once per process", () => {
    vi.useFakeTimers();
    expect(startReminderTimer()).toBe(true);
    expect(startReminderTimer()).toBe(false);
  });
});

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
