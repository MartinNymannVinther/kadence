import { describe, expect, it } from "vitest";
import { dcuReadRider, GAP_MS, readKey, spacedBy } from "@/modules/results/queue";

/**
 * The line readings from Cykling Danmark wait in (ADR 0039), as jobs
 * (docs/adr/0085): a reading carries whose it is and as whom, nobody waits
 * in it twice, and readings put in together are ten seconds apart. That
 * the worker runs them, puts a busy one back and reads as the right
 * person is tests/team/race-visits.test.ts.
 */

describe("a reading in the line", () => {
  it("carries ids and a word, and nothing else", () => {
    expect(
      dcuReadRider.payload.parse({ as: "coach", userId: "user_1", riderId: "rider_1" }),
    ).toEqual({ as: "coach", userId: "user_1", riderId: "rider_1" });
    expect(dcuReadRider.payload.safeParse({ as: "rider", userId: "user_1" }).success).toBe(true);
    expect(
      dcuReadRider.payload.safeParse({ as: "rider", userId: "user_1", name: "Ida" }).success,
    ).toBe(false);
    expect(dcuReadRider.payload.safeParse({ as: "rider", userId: "Ida Holm" }).success).toBe(false);
    expect(dcuReadRider.payload.safeParse({ as: "parent", userId: "user_1" }).success).toBe(false);
  });

  it("is a team's work", () => {
    expect(dcuReadRider.team).toBe(true);
  });

  it("waits once per rider for coaches, and once per person for their own", () => {
    expect(readKey({ as: "coach", userId: "a", riderId: "r1" })).toBe("coach:r1");
    expect(readKey({ as: "coach", userId: "b", riderId: "r1" })).toBe("coach:r1");
    expect(readKey({ as: "rider", userId: "a" })).toBe("rider:a");
  });

  it("is spaced ten seconds from the one put in before it", () => {
    expect([0, 1, 2].map(spacedBy)).toEqual([0, GAP_MS, 2 * GAP_MS]);
    expect(GAP_MS).toBe(10_000);
  });
});
