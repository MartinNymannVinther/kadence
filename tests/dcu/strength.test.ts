import { describe, expect, it } from "vitest";
import {
  MIN_WINTER_SESSIONS,
  MIN_WINTER_SESSIONS_BY_CATEGORY,
  STRENGTH_PROGRAMMES,
  strengthFrequency,
  strengthPeriod,
} from "@/modules/dcu";
import { addDaysIso } from "@/core/dates";
import {
  resolveStrengthSession,
  strengthStructureSchema,
  type StrengthStructure,
} from "@/modules/workouts/structure";

/** "sets×reps load" of every exercise in session n, by name. */
function session(structure: StrengthStructure, n: number): Record<string, string> {
  return Object.fromEntries(
    resolveStrengthSession(structure, n).map((e) => [e.name, `${e.sets}×${e.reps} ${e.load}`]),
  );
}

describe("DCU's strength programmes", () => {
  it.each(["U17", "U19", "U23"] as const)("%s is a valid strength session", (category) => {
    const { structure } = STRENGTH_PROGRAMMES[category];
    expect(strengthStructureSchema.parse(structure)).toEqual(structure);
  });

  it("keep stable keys", () => {
    expect(Object.values(STRENGTH_PROGRAMMES).map((p) => p.key)).toEqual([
      "dcu-strength-u17-2016",
      "dcu-strength-u19-2016",
      "dcu-strength-u23-2016",
    ]);
  });

  it("have the programmes' exercises: seven for U17, five for U19, four for U23", () => {
    expect(STRENGTH_PROGRAMMES.U17.structure.exercises).toHaveLength(7);
    expect(STRENGTH_PROGRAMMES.U19.structure.exercises).toHaveLength(5);
    expect(STRENGTH_PROGRAMMES.U23.structure.exercises).toHaveLength(4);
  });
});

describe("the U17 progression", () => {
  const u17 = STRENGTH_PROGRAMMES.U17.structure;

  it("goes 3×16 RM for sessions 1-6, 3×12 RM for 7-12, then 4×6-8 RM", () => {
    for (const [n, expected] of [
      [1, "3×16 RM"],
      [6, "3×16 RM"],
      [7, "3×12 RM"],
      [12, "3×12 RM"],
      [13, "4×6-8 RM"],
      [40, "4×6-8 RM"],
    ] as const) {
      const s = session(u17, n);
      expect(s["Ben ekstension (i stedet for squat)"]).toBe(expected);
      expect(s["Ben fleksion"]).toBe(expected);
      expect(s["Benpres"]).toBe(expected);
      expect(s["Læg strækning"]).toBe(expected);
    }
  });

  it("keeps the core at 3×15-20 RM and the warm-up squat at 1×20 throughout", () => {
    for (const n of [1, 7, 13]) {
      const s = session(u17, n);
      expect(s["Mave bøjning"]).toBe("3×15-20 RM");
      expect(s["Faldskærm - Ryg bøjning"]).toBe("3×15-20 RM");
      expect(s["Squat – opvarmning"]).toBe("1×20 lav belastning");
    }
  });

  it("warms up 8 minutes on the bike, as the programme says", () => {
    expect(u17.warmup).toMatch(/^8 minutter/);
  });
});

describe("the U19 progression", () => {
  const u19 = STRENGTH_PROGRAMMES.U19.structure;

  it("goes 3×12 RM for sessions 1-4, 3×8 RM for 5-8, then 4×6 RM", () => {
    for (const [n, expected] of [
      [1, "3×12 RM"],
      [4, "3×12 RM"],
      [5, "3×8 RM"],
      [8, "3×8 RM"],
      [9, "4×6 RM"],
      [30, "4×6 RM"],
    ] as const) {
      const s = session(u19, n);
      expect(s["Ben ekstension (i stedet for squat)"]).toBe(expected);
      expect(s["Ben fleksion"]).toBe(expected);
      expect(s["Et bens pres"]).toBe(expected);
      expect(s["Mave bøjning med vægtstang"]).toBe("3×15-20 RM");
    }
  });

  it("says squat replaces leg extension once the technique is there", () => {
    const legExtension = u19.exercises.find((e) => e.name.startsWith("Ben ekstension"));
    expect(legExtension?.note).toContain("4 sæt af 6 RM");
  });
});

describe("the U23 progression", () => {
  const u23 = STRENGTH_PROGRAMMES.U23.structure;

  it("goes 3×10-12 RM for sessions 1-3, 3×8 RM for 4-6, then 4×4-6 RM", () => {
    for (const [n, expected] of [
      [1, "3×10-12 RM"],
      [3, "3×10-12 RM"],
      [4, "3×8 RM"],
      [6, "3×8 RM"],
      [7, "4×4-6 RM"],
    ] as const) {
      const s = session(u23, n);
      expect(s["Squat"]).toBe(expected);
      expect(s["Et bens pres"]).toBe(expected);
      expect(s["Ryg bøjning evt. med vægt på brystet"]).toBe("3×15-20 RM");
    }
  });
});

describe("how often to train strength", () => {
  it("is 2-3 a week from 1 November to mid-March, 48 hours apart", () => {
    for (const date of ["2025-11-01", "2025-12-24", "2026-01-15", "2026-03-15"])
      expect(strengthFrequency(date)).toEqual({
        period: "build",
        perWeekMin: 2,
        perWeekMax: 3,
        minHoursBetween: 48,
      });
  });

  it("is 1 a week from mid-March to the start of November", () => {
    for (const date of ["2026-03-16", "2026-06-01", "2026-10-31"])
      expect(strengthFrequency(date)).toEqual({
        period: "maintenance",
        perWeekMin: 1,
        perWeekMax: 1,
        minHoursBetween: 48,
      });
  });

  it("asks at least 30 sessions a winter of U17 and U19, and the build has room for them", () => {
    expect(MIN_WINTER_SESSIONS).toBe(30);
    expect(MIN_WINTER_SESSIONS_BY_CATEGORY).toEqual({ U17: 30, U19: 30, U23: null });
    let buildDays = 0;
    for (let d = "2025-10-01"; d <= "2026-09-30"; d = addDaysIso(d, 1))
      if (strengthPeriod(d) === "build") buildDays++;
    expect(Math.floor(buildDays / 7) * 2).toBeGreaterThanOrEqual(MIN_WINTER_SESSIONS);
  });
});
