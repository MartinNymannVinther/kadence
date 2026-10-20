import { describe, expect, it } from "vitest";
import { dcuPicks, kadencePicks, pickOf } from "@/components/rulle/ready/choices";
import { sessionsFor } from "@/modules/paradigms";

/**
 * Rulle's picker for an adult (docs/adr/0092): Kadence's own sessions for
 * the rider's training profile, under `kadence:` ids, with their words for
 * when and their source; nothing for a rider in U17–U23, whose picker
 * holds DCU's as before.
 */
describe("Kadence's sessions in Rulle's picker", () => {
  it("offers a motionist the profile's sessions, marked as Kadence's", () => {
    const picks = kadencePicks("da", "motionist");
    expect(picks.map((p) => p.id)).toEqual(sessionsFor("motionist").map((s) => `kadence:${s.key}`));
    for (const p of picks) {
      expect(p.kind).toBe("kadence");
      expect(p.when).toBeTruthy();
      expect(p.source).toContain("Kadence's own judgement");
      expect(p.title).not.toMatch(/\bDCU\b/);
      expect(p.minutes).toBeGreaterThan(0);
    }
    expect(picks.find((p) => p.id === "kadence:kadence-vo2-4x4")?.title).toBe("VO2max 4 × 4 min");
  });

  it("offers a supermotionist the long ride and the short intervals too, in English", () => {
    const picks = kadencePicks("en", "super-motionist");
    expect(pickOf("kadence:kadence-long-240", picks)?.title).toBe("Long ride 4 hours");
    expect(pickOf("kadence:kadence-30-15", picks)?.minutes).toBe(65);
  });

  it("offers nothing of Kadence's to a rider without a profile, and DCU's as before", () => {
    expect(kadencePicks("da", null)).toEqual([]);
    expect(dcuPicks("da").every((p) => p.kind === "dcu" && p.id.startsWith("dcu:"))).toBe(true);
  });
});
