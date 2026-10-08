import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EnvSchema } from "@/core/env";
import { FEATURES, featuresFrom, PARKED_PATHS, parkedPath, type Features } from "@/core/features";

/**
 * The parts an installation may park (docs/adr/0057) are on unless it
 * says "off", and a setting the app reads in production is
 * worth nothing unless docker-compose.yml forwards it to the container.
 */

const REQUIRED = {
  APP_DATABASE_URL: "postgres://app:app@localhost:5432/kadence",
  AUTH_DATABASE_URL: "postgres://auth:auth@localhost:5432/kadence",
  BETTER_AUTH_SECRET: "not-a-real-secret-for-tests-only",
};

describe("the installation's features", () => {
  it("are all on by default", () => {
    const parsed = EnvSchema.parse(REQUIRED);
    expect(Object.values(featuresFrom(parsed)).every((on) => on)).toBe(true);
  });

  it("go off one at a time", () => {
    const parsed = EnvSchema.parse({ ...REQUIRED, COACHES_ROOM: "off", GUIDE_FOOD: "off" });
    expect(featuresFrom(parsed)).toEqual({
      rulleWorld: true,
      coachesRoom: false,
      clubChampionship: true,
      energyCalculator: true,
      foodGuide: false,
      teamsGuide: true,
    });
  });

  it("refuse anything but on and off", () => {
    expect(EnvSchema.safeParse({ ...REQUIRED, RULLE_WORLD: "yes" }).success).toBe(false);
  });

  it("name every feature once", () => {
    expect(new Set(FEATURES).size).toBe(FEATURES.length);
  });
});

/**
 * The proxy's decision (backlog P2-09): which paths answer 404 before
 * anything renders. The pathname arrives with its locale prefix already
 * stripped, as the proxy reads it.
 */
describe("a parked path", () => {
  const allOn = featuresFrom(EnvSchema.parse(REQUIRED));
  const allOff: Features = {
    rulleWorld: false,
    coachesRoom: false,
    clubChampionship: false,
    energyCalculator: false,
    foodGuide: false,
    teamsGuide: false,
  };

  it("is each parked part's page and everything under it, while the part is off", () => {
    expect(parkedPath("/coaches", allOff)).toBe(true);
    expect(parkedPath("/coaches/t1", allOff)).toBe(true);
    expect(parkedPath("/club", allOff)).toBe(true);
    expect(parkedPath("/calculators/energy", allOff)).toBe(true);
    expect(parkedPath("/guides/food", allOff)).toBe(true);
  });

  it("is nothing while every part is on", () => {
    for (const { path } of PARKED_PATHS) expect(parkedPath(path, allOn)).toBe(false);
  });

  it("follows its own flag and no other", () => {
    const only = { ...allOn, clubChampionship: false };
    expect(parkedPath("/club", only)).toBe(true);
    expect(parkedPath("/coaches", only)).toBe(false);
    expect(parkedPath("/guides/food", only)).toBe(false);
  });

  it("matches a path segment, not a prefix of one", () => {
    expect(parkedPath("/clubs", allOff)).toBe(false);
    expect(parkedPath("/coaches-guide", allOff)).toBe(false);
    expect(parkedPath("/calculators", allOff)).toBe(false);
    expect(parkedPath("/calculators/gearing", allOff)).toBe(false);
    expect(parkedPath("/guides", allOff)).toBe(false);
    expect(parkedPath("/guides/classes", allOff)).toBe(false);
  });

  it("leaves the rest of Kadence alone", () => {
    for (const path of ["/", "/today", "/rulle", "/settings/team", "/login", "/en"])
      expect(parkedPath(path, allOff)).toBe(false);
  });

  it("names a path for every part that has one, and none for Rulle's world", () => {
    const named = new Set(PARKED_PATHS.map((p) => p.feature));
    expect([...named].sort()).toEqual(
      ["clubChampionship", "coachesRoom", "energyCalculator", "foodGuide", "teamsGuide"].sort(),
    );
    expect(named.has("rulleWorld")).toBe(false);
  });
});

describe("the push key pair", () => {
  const PUBLIC = "B".repeat(87);
  const PRIVATE = "p".repeat(43);

  it("comes as a pair or not at all", () => {
    expect(EnvSchema.safeParse({ ...REQUIRED, PUSH_PUBLIC_KEY: PUBLIC }).success).toBe(false);
    expect(EnvSchema.safeParse({ ...REQUIRED, PUSH_PRIVATE_KEY: PRIVATE }).success).toBe(false);
    expect(
      EnvSchema.safeParse({ ...REQUIRED, PUSH_PUBLIC_KEY: PUBLIC, PUSH_PRIVATE_KEY: PRIVATE })
        .success,
    ).toBe(true);
  });

  it("takes a contact as mailto or https only", () => {
    expect(EnvSchema.safeParse({ ...REQUIRED, PUSH_CONTACT: "you@example.com" }).success).toBe(
      false,
    );
    expect(
      EnvSchema.safeParse({ ...REQUIRED, PUSH_CONTACT: "mailto:you@example.com" }).success,
    ).toBe(true);
  });
});

describe("docker-compose.yml", () => {
  const compose = readFileSync("docker-compose.yml", "utf8");

  it.each([
    "DCU_RESULTS",
    "RULLE_WORLD",
    "COACHES_ROOM",
    "CLUB_CHAMPIONSHIP",
    "CALC_ENERGY",
    "GUIDE_FOOD",
    "GUIDE_TEAMS",
    "TEAMS_DCU",
    "PUSH_PUBLIC_KEY",
    "PUSH_PRIVATE_KEY",
    "PUSH_CONTACT",
  ])("forwards %s to the container", (name) => {
    expect(compose).toContain(`${name}: \${${name}:-}`);
  });
});
