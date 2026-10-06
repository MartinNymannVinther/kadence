import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { demoExpiresAt, hoursLeft } from "@/modules/demo/expiry";

/**
 * The demo stripe counts down to the clean-up ("slettes om 23 t"); it
 * never says zero while the demo still stands, and a workspace that is no
 * demo has no date.
 */

describe("the hours a demo has left", () => {
  const now = new Date("2026-10-06T08:00:00Z");
  const at = (hours: number) => new Date(now.getTime() + hours * 3_600_000);

  it("are whole hours, rounded up", () => {
    expect(hoursLeft(at(24), now)).toBe(24);
    expect(hoursLeft(at(23.2), now)).toBe(24);
    expect(hoursLeft(at(1.01), now)).toBe(2);
  });

  it("never fall below one before the clean-up has run", () => {
    expect(hoursLeft(at(0.1), now)).toBe(1);
    expect(hoursLeft(at(-2), now)).toBe(1);
  });

  it("belong to demos only", async () => {
    expect(await demoExpiresAt(randomUUID())).toBeNull();
  });
});
