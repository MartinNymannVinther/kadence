import { describe, expect, it } from "vitest";
import { MARK, personOf } from "@/components/rulle/scene/folk-look";
import { PALETTE } from "@/components/rulle/scene/palette";

describe("people of their own", () => {
  const people = Array.from({ length: 400 }, (_, k) => personOf(k));

  it("are the same for the same number, every ride", () => {
    expect(personOf(17)).toEqual(personOf(17));
  });

  it("come in many skins, hairs and trousers, the fair skins the commoner", () => {
    const skins = new Set(people.map((p) => p.skin));
    expect(skins.size).toBe(8);
    expect(new Set(people.map((p) => p.hair)).size).toBeGreaterThanOrEqual(8);
    expect(new Set(people.map((p) => p.trousers)).size).toBe(7);
    const fair = people.filter((p) => ["#f4dccb", "#ecc9b0", "#dfb999"].includes(p.skin)).length;
    expect(fair / people.length).toBeGreaterThan(0.45);
    expect(fair / people.length).toBeLessThan(0.75);
  });

  it("give the darkest skins dark hair", () => {
    const dark = people.filter((p) => ["#6f4a35", "#503528"].includes(p.skin));
    expect(dark.length).toBeGreaterThan(0);
    for (const p of dark) expect(["#2a221d", "#3b2c22", "#1f1a17", "#4a3a2e"]).toContain(p.hair);
  });

  it("paint a crowd in markers no colour of the landscape uses", () => {
    const used = new Set(
      Object.values(PALETTE)
        .flat()
        .map((c) => c.toLowerCase()),
    );
    for (const mark of Object.values(MARK)) expect(used.has(mark)).toBe(false);
  });
});
