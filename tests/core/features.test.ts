import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EnvSchema } from "@/core/env";
import { FEATURES, featuresFrom } from "@/core/features";

/**
 * The parts that wait for a real winter (docs/adr/0056) are off unless an
 * installation says "on", and a setting the app reads in production is
 * worth nothing unless docker-compose.yml forwards it to the container.
 */

const REQUIRED = {
  APP_DATABASE_URL: "postgres://app:app@localhost:5432/kadence",
  AUTH_DATABASE_URL: "postgres://auth:auth@localhost:5432/kadence",
  BETTER_AUTH_SECRET: "not-a-real-secret-for-tests-only",
};

describe("the installation's features", () => {
  it("are all off by default", () => {
    const parsed = EnvSchema.parse(REQUIRED);
    expect(Object.values(featuresFrom(parsed)).every((on) => !on)).toBe(true);
  });

  it("come on one at a time", () => {
    const parsed = EnvSchema.parse({ ...REQUIRED, COACHES_ROOM: "on", GUIDE_FOOD: "on" });
    expect(featuresFrom(parsed)).toEqual({
      rulleWorld: false,
      coachesRoom: true,
      clubChampionship: false,
      energyCalculator: false,
      foodGuide: true,
    });
  });

  it("refuse anything but on and off", () => {
    expect(EnvSchema.safeParse({ ...REQUIRED, RULLE_WORLD: "yes" }).success).toBe(false);
  });

  it("name every feature once", () => {
    expect(new Set(FEATURES).size).toBe(FEATURES.length);
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
    "PUSH_PUBLIC_KEY",
    "PUSH_PRIVATE_KEY",
    "PUSH_CONTACT",
  ])("forwards %s to the container", (name) => {
    expect(compose).toContain(`${name}: \${${name}:-}`);
  });
});
