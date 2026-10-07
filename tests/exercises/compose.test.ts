import { describe, expect, it } from "vitest";
import {
  COMPOSE_MAX_ITEMS,
  decodeComposition,
  encodeComposition,
} from "@/modules/exercises/compose";
import type { ProgramPart } from "@/modules/exercises/types";

/**
 * "Sammensæt dit eget" lives in the URL only: a composition round-trips
 * through the compact string, and anything that does not fit the contract
 * decodes to null rather than throwing.
 */

describe("a composition", () => {
  it("round-trips a programme's parts through the compact string", () => {
    const parts: ProgramPart[] = [
      {
        key: "morning",
        items: [
          { exercise: "builtin:catCow" },
          {
            exercise: "builtin:plank",
            dose: { kind: "time", seconds: 30, perSide: false, sets: 3 },
          },
        ],
      },
      {
        key: "evening",
        items: [
          {
            exercise: "builtin:hipFlexor",
            dose: { kind: "reps", reps: 12, perSide: true, sets: 1 },
          },
        ],
      },
    ];
    const encoded = encodeComposition(parts);
    expect(encoded).toBe("morning=catCow,plank-t30x3;evening=hipFlexor-r12s");
    expect(decodeComposition(encoded)).toEqual(parts);
  });

  it("leaves out a dose that matches nothing special: a bare id decodes with no override", () => {
    const parts: ProgramPart[] = [{ key: "any", items: [{ exercise: "builtin:squat" }] }];
    const encoded = encodeComposition(parts);
    expect(encoded).toBe("any=squat");
    expect(decodeComposition(encoded)).toEqual(parts);
  });

  it("leaves a team's own exercise out of the encoding: only built-in travels in a link", () => {
    const parts: ProgramPart[] = [
      {
        key: "any",
        items: [
          { exercise: "builtin:squat" },
          { exercise: "team:11111111-1111-1111-1111-111111111111" },
        ],
      },
    ];
    expect(encodeComposition(parts)).toBe("any=squat");
  });

  it("refuses an empty string, and whatever is not asked for", () => {
    expect(decodeComposition("")).toBeNull();
  });

  it("refuses a part key twice, used or not in the contract", () => {
    expect(decodeComposition("any=squat;any=plank")).toBeNull();
    expect(decodeComposition("notapart=squat")).toBeNull();
  });

  it("refuses a malformed item: no id, a bad character, or a dose outside the contract", () => {
    expect(decodeComposition("any=")).toBeNull();
    expect(decodeComposition("any=-t30")).toBeNull();
    expect(decodeComposition("any=Squat")).toBeNull();
    expect(decodeComposition("any=squat-x30")).toBeNull();
    expect(decodeComposition("any=squat-t9999")).toBeNull();
    expect(decodeComposition("any=squat-t30x99")).toBeNull();
  });

  it("refuses more parts than the contract allows", () => {
    expect(decodeComposition("any=a;morning=a;midday=a;evening=a;before=a;after=a;x=a")).toBeNull();
  });

  it("refuses more items than the cap, and a string longer than is reasonable", () => {
    const many = Array.from({ length: COMPOSE_MAX_ITEMS + 1 }, (_, i) => `id${i}`).join(",");
    expect(decodeComposition(`any=${many}`)).toBeNull();
    expect(decodeComposition(`any=${"a".repeat(2001)}`)).toBeNull();
  });

  it("decodes a dose with per side and sets together", () => {
    expect(decodeComposition("any=plank-t45sx2")).toEqual([
      {
        key: "any",
        items: [
          {
            exercise: "builtin:plank",
            dose: { kind: "time", seconds: 45, perSide: true, sets: 2 },
          },
        ],
      },
    ]);
  });
});
