import { describe, expect, it } from "vitest";
import {
  HARD_PER_WEEK,
  SENIOR_BIKE_SESSIONS,
  SENIOR_CONTENT_KEYS,
  SENIOR_LONGEST_RIDE,
  SENIOR_STRENGTH_PROGRAMMES,
  SENIOR_WEEKS,
  seasonOfMonth,
  seniorSession,
  seniorWeek,
  sessionsFor,
} from "@/modules/paradigms";
import {
  bikeStructureSchema,
  flattenSteps,
  resolveStrengthSession,
  strengthStructureSchema,
  structureMinutes,
} from "@/modules/workouts/structure";

/**
 * Kadence's own content for an adult (docs/adr/0092,
 * docs/research/motionist-pas-og-programmer.md): the bike sessions with
 * their minutes and zones, the two strength programmes and their
 * progression, and the eight ready weeks — one or two hard sessions, a
 * rest day, strength apart, the hours the research note gives. None of it
 * is labelled as DCU's.
 */

const minutes = (key: string) => structureMinutes(seniorSession(key)!.structure);

/** The zones a session's work is ridden in; ftp_pct read as the zone it falls in. */
function workZones(key: string): number[] {
  return flattenSteps(seniorSession(key)!.structure)
    .filter((s) => s.intent === "work")
    .map((s) =>
      s.target.kind === "zone" ? s.target.zone : s.target.kind === "ftp_pct" ? s.target.high : 0,
    );
}

describe("Kadence's bike sessions for adults", () => {
  it("are eight to twelve, valid, with stable keys of Kadence's own", () => {
    expect(SENIOR_BIKE_SESSIONS.length).toBeGreaterThanOrEqual(8);
    expect(SENIOR_BIKE_SESSIONS.length).toBeLessThanOrEqual(12);
    const keys = SENIOR_BIKE_SESSIONS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const s of SENIOR_BIKE_SESSIONS) {
      expect(s.key, s.key).toMatch(/^kadence-/);
      expect(bikeStructureSchema.safeParse(s.structure).success, s.key).toBe(true);
      for (const field of [s.name, s.when, s.why])
        for (const text of [field.da, field.en]) {
          expect(text.trim().length, s.key).toBeGreaterThan(0);
          expect(text, s.key).not.toContain("!");
          expect(text, s.key).not.toMatch(/\bDCU\b/);
        }
      expect(s.source, s.key).toContain("Kadence's own judgement");
      expect(s.source, s.key).not.toMatch(/\bDCU\b/);
    }
  });

  it("last as their names say", () => {
    expect(minutes("kadence-recovery-45")).toBe(45);
    expect(minutes("kadence-endurance-60")).toBe(60);
    expect(minutes("kadence-endurance-90")).toBe(90);
    expect(minutes("kadence-endurance-120")).toBe(120);
    expect(minutes("kadence-long-150")).toBe(150);
    expect(minutes("kadence-long-240")).toBe(240);
    expect(minutes("kadence-tempo-2x20")).toBe(75);
    expect(minutes("kadence-threshold-3x10")).toBe(70);
    expect(minutes("kadence-vo2-4x4")).toBe(58);
    expect(minutes("kadence-30-15")).toBe(65);
    expect(minutes("kadence-hills-6x2")).toBe(60);
    expect(minutes("kadence-indoor-45")).toBe(45);
  });

  it("hold the work in the zone the form is ridden in", () => {
    expect(workZones("kadence-tempo-2x20")).toEqual([3, 3]);
    expect(workZones("kadence-threshold-3x10")).toEqual([4, 4, 4]);
    expect(workZones("kadence-vo2-4x4")).toEqual([5, 5, 5, 5]);
    expect(workZones("kadence-hills-6x2")).toEqual(Array(6).fill(5));
    // Rønnestad's 3 series of 13 × 30 s, at 115–125 % of FTP.
    expect(workZones("kadence-30-15")).toEqual(Array(39).fill(125));
    expect(workZones("kadence-indoor-45")).toEqual([93, 93, 93]);
    // The easy rides have no work at all: zone 1 and 2 only.
    for (const key of ["kadence-recovery-45", "kadence-endurance-90", "kadence-long-240"]) {
      expect(workZones(key), key).toEqual([]);
      for (const step of flattenSteps(seniorSession(key)!.structure))
        expect(step.target, key).toMatchObject({ kind: "zone" });
    }
  });

  it("keep each long ride within the profile's longest", () => {
    for (const s of SENIOR_BIKE_SESSIONS) {
      const longest = Math.min(
        ...s.profiles.map((p) => SENIOR_LONGEST_RIDE[`senior-${p}`].hours * 60),
      );
      expect(structureMinutes(s.structure), s.key).toBeLessThanOrEqual(longest);
    }
  });

  it("offer a motionist the sessions that suit one, and a supermotionist all", () => {
    const motionist = sessionsFor("motionist").map((s) => s.key);
    expect(motionist).not.toContain("kadence-long-240");
    expect(motionist).not.toContain("kadence-30-15");
    expect(motionist).toContain("kadence-indoor-45");
    expect(sessionsFor("super-motionist")).toHaveLength(SENIOR_BIKE_SESSIONS.length);
  });
});

describe("Kadence's strength programmes for adults", () => {
  const motionist = SENIOR_STRENGTH_PROGRAMMES.motionist;
  const superM = SENIOR_STRENGTH_PROGRAMMES["super-motionist"];

  it("are valid programmes of Kadence's own, with a caution to the rider", () => {
    for (const p of [motionist, superM]) {
      expect(p.key).toMatch(/^kadence-strength-/);
      expect(strengthStructureSchema.safeParse(p.structure).success, p.key).toBe(true);
      expect(p.about.da).toContain("læge");
      expect(p.about.en).toContain("doctor");
      expect(`${p.name.da} ${p.name.en} ${p.source}`).not.toMatch(/\bDCU\b/);
    }
  });

  it("give a motionist 6–8 exercises for hips and legs, trunk, upper back and a jump", () => {
    const ex = motionist.structure.exercises;
    expect(ex.length).toBeGreaterThanOrEqual(6);
    expect(ex.length).toBeLessThanOrEqual(8);
    for (const group of ["legs", "core", "upper"] as const)
      expect(
        ex.some((e) => e.group === group),
        group,
      ).toBe(true);
    expect(ex.some((e) => /hop/i.test(e.name))).toBe(true);
    expect(motionist.structure.minutes).toBeGreaterThanOrEqual(30);
    expect(motionist.structure.minutes).toBeLessThanOrEqual(40);
  });

  it("move a motionist's legs from learning to more sets to more load", () => {
    const legs = (n: number) => resolveStrengthSession(motionist.structure, n)[0]!;
    expect(legs(1)).toMatchObject({ sets: 2, reps: "15" });
    expect(legs(10)).toMatchObject({ sets: 3, reps: "12" });
    expect(legs(20)).toMatchObject({ sets: 3, reps: "8-10" });
  });

  it("give a supermotionist Rønnestad's four leg exercises, from 10 RM towards 4 RM", () => {
    const names = superM.structure.exercises.filter((e) => e.group === "legs").map((e) => e.name);
    expect(names).toEqual(["Halv squat", "Etbens benpres", "Hoftebøjning", "Tåhæv"]);
    const squat = (n: number) =>
      resolveStrengthSession(superM.structure, n).find((e) => e.name === "Halv squat")!;
    expect(squat(1)).toMatchObject({ sets: 3, reps: "12", load: "let, lær teknikken" });
    expect([3, 9, 15, 21].map((n) => squat(n).reps)).toEqual(["10", "8", "6", "4-5"]);
    expect([3, 9, 15, 21].every((n) => squat(n).load === "RM" && squat(n).sets === 3)).toBe(true);
    // Twelve weeks at two a week reach the heaviest step.
    expect(squat(24).reps).toBe("4-5");
    // The jump and the trunk keep their own dose throughout.
    const jump = (n: number) =>
      resolveStrengthSession(superM.structure, n).find((e) => e.group === "other")!;
    expect(jump(21)).toMatchObject({ sets: 3, reps: "6" });
  });
});

describe("Kadence's ready weeks for adults", () => {
  const bikeMinutes = (week: (typeof SENIOR_WEEKS)[number]) =>
    week.items
      .map((i) => seniorSession(i.session))
      .reduce((sum, s) => sum + (s ? structureMinutes(s.structure) : 0), 0);
  const strengthDays = (week: (typeof SENIOR_WEEKS)[number]) =>
    week.items.filter((i) => i.session.startsWith("kadence-strength-")).map((i) => i.day);

  it("are four per profile, one week each, naming only installed content", () => {
    for (const profile of ["motionist", "super-motionist"] as const)
      expect(SENIOR_WEEKS.filter((w) => w.profile === profile).map((w) => w.season)).toEqual([
        "winter",
        "spring",
        "summer",
        "easy",
      ]);
    for (const w of SENIOR_WEEKS) {
      expect(w.key).toMatch(/^kadence-week-/);
      for (const item of w.items) {
        expect(SENIOR_CONTENT_KEYS.has(item.session), `${w.key}: ${item.session}`).toBe(true);
        expect(item.day).toBeGreaterThanOrEqual(0);
        expect(item.day).toBeLessThanOrEqual(6);
      }
    }
  });

  it("hold at most the profile's hard sessions, and none in the easy week", () => {
    for (const w of SENIOR_WEEKS) {
      const hard = w.items.filter((i) => seniorSession(i.session)?.intensity === "hard").length;
      expect(hard, w.key).toBeLessThanOrEqual(HARD_PER_WEEK[w.profile]);
      if (w.season === "easy") expect(hard, w.key).toBe(0);
    }
    expect(HARD_PER_WEEK).toEqual({ motionist: 1, "super-motionist": 2 });
  });

  it("keep a day off the bike, the profile's strength apart, and its own sessions", () => {
    for (const w of SENIOR_WEEKS) {
      const bikeDays = new Set(
        w.items.filter((i) => seniorSession(i.session) !== null).map((i) => i.day),
      );
      expect(bikeDays.size, w.key).toBeLessThan(7);
      const days = strengthDays(w);
      expect(days.length, w.key).toBe(w.season === "winter" ? 2 : 1);
      if (days.length === 2) expect(days[1]! - days[0]!, w.key).toBeGreaterThanOrEqual(2);
      const own = SENIOR_STRENGTH_PROGRAMMES[w.profile].key;
      expect(
        w.items
          .filter((i) => i.session.startsWith("kadence-strength-"))
          .every((i) => i.session === own),
        w.key,
      ).toBe(true);
      for (const item of w.items) {
        const session = seniorSession(item.session);
        if (session) expect(session.profiles, `${w.key}: ${item.session}`).toContain(w.profile);
      }
    }
  });

  it("ride the hours the research note gives", () => {
    const hours = (
      profile: "motionist" | "super-motionist",
      season: Parameters<typeof seniorWeek>[1],
    ) => bikeMinutes(seniorWeek(profile, season)) / 60;
    expect(hours("motionist", "winter")).toBeCloseTo(4.25, 2);
    expect(hours("motionist", "spring")).toBeCloseTo(5.4, 1);
    expect(hours("motionist", "summer")).toBeCloseTo(6.5, 1);
    expect(hours("motionist", "easy")).toBeCloseTo(3.25, 2);
    expect(hours("super-motionist", "winter")).toBeCloseTo(7.5, 1);
    expect(hours("super-motionist", "spring")).toBeCloseTo(10.4, 1);
    expect(hours("super-motionist", "summer")).toBeCloseTo(11.3, 1);
    expect(hours("super-motionist", "easy")).toBeCloseTo(5.25, 2);
  });

  it("fit the months: October easy, November to February winter", () => {
    expect([10, 11, 2, 3, 5, 6, 9].map(seasonOfMonth)).toEqual([
      "easy",
      "winter",
      "winter",
      "spring",
      "spring",
      "summer",
      "summer",
    ]);
  });
});
