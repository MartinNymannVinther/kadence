import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { BUILTIN_PROGRAMS } from "@/modules/exercises/builtin";
import { formatDose, programMinutes, type Translate } from "@/modules/exercises/dose";
import type { Dose } from "@/modules/exercises/types";
import {
  builtinExerciseView,
  builtinLookup,
  builtinProgramView,
  programParts,
} from "@/modules/exercises/view";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * From stored to shown: an exercise or a programme in the reader's
 * language, with the programme's dose winning over the exercise's, and a
 * dose in the words the card shows.
 */

// next-intl types the keys from the catalogue; the views take any key, as a page's translator does.
const translator = (locale: "da" | "en"): Translate =>
  createTranslator({
    locale,
    messages: locale === "da" ? da : en,
    namespace: "exercises",
  }) as unknown as Translate;
const tDa = translator("da");
const tEn = translator("en");

describe("an exercise to show", () => {
  it("carries its words, its reference and its own dose", () => {
    const view = builtinExerciseView("hipFlexor", tDa)!;
    expect(view.ref).toBe("builtin:hipFlexor");
    expect(view.name).toBe("Hoftebøjerstræk");
    expect(view.how).toContain("knæ");
    expect(view.dose).toEqual({ kind: "time", seconds: 30, perSide: true, sets: 1 });
    expect(builtinExerciseView("hipFlexor", tEn)!.name).toBe("Hip flexor stretch");
  });

  it("is null for an id Kadence does not have", () => {
    expect(builtinExerciseView("nope", tDa)).toBeNull();
  });
});

describe("a programme to show", () => {
  it("names its parts and numbers nothing it cannot find", () => {
    const view = builtinProgramView("mobilityDay", tDa)!;
    expect(view.title).toBe("Bevægelighed hele dagen");
    expect(view.parts.map((p) => p.key)).toEqual(["morning", "midday", "evening"]);
    expect(view.parts[0]!.items[3]!.exercise.name).toBe("Hoftebøjerstræk");
  });

  it("lets the programme's dose win over the exercise's", () => {
    const view = builtinProgramView("strengthNoMachines", tDa)!;
    const squat = view.parts[0]!.items[0]!;
    expect(squat.exercise.ref).toBe("builtin:squat");
    expect(squat.exercise.dose).toEqual({ kind: "reps", reps: 15, perSide: false, sets: 3 });
    expect(squat.dose).toEqual({ kind: "reps", reps: 20, perSide: false, sets: 1 });
    const goblet = view.parts[1]!.items[0]!;
    expect(goblet.dose).toEqual(goblet.exercise.dose);
  });

  it("resolves every built-in programme in both languages", () => {
    for (const p of BUILTIN_PROGRAMS)
      for (const t of [tDa, tEn]) {
        const view = builtinProgramView(p.id, t)!;
        expect(view.parts.flatMap((part) => part.items)).toHaveLength(
          p.parts.flatMap((part) => part.items).length,
        );
      }
  });

  it("leaves out an exercise that is gone, and a part left empty by it", () => {
    const gone = "team:6f1c2a3b-0000-4000-8000-000000000000";
    const parts = programParts(
      [
        { key: "morning", items: [{ exercise: "builtin:plank" }, { exercise: gone }] },
        { key: "evening", items: [{ exercise: gone }] },
      ],
      builtinLookup(tDa),
    );
    expect(parts).toHaveLength(1);
    expect(parts[0]!.items.map((i) => i.exercise.ref)).toEqual(["builtin:plank"]);
  });

  it("is null for an id Kadence does not have", () => {
    expect(builtinProgramView("nope", tDa)).toBeNull();
  });
});

describe("a dose in words", () => {
  const time = (seconds: number, perSide = false, sets = 1): Dose => ({
    kind: "time",
    seconds,
    perSide,
    sets,
  });
  const reps = (n: number, perSide = false, sets = 1): Dose => ({
    kind: "reps",
    reps: n,
    perSide,
    sets,
  });
  const cases: Array<[Dose, string, string]> = [
    [time(30, true), "30 sek pr. side", "30 sec per side"],
    [reps(10, false, 3), "3 × 10", "3 × 10"],
    [time(30, false, 3), "3 × 30 sek", "3 × 30 sec"],
    [reps(10, true), "10 pr. side", "10 per side"],
    [reps(10), "10 gange", "10 times"],
    [reps(1), "1 gang", "1 time"],
    [time(120), "2 min", "2 min"],
    [time(90), "90 sek", "90 sec"],
    [time(20, true, 3), "3 × 20 sek pr. side", "3 × 20 sec per side"],
    [reps(8, true, 3), "3 × 8 pr. side", "3 × 8 per side"],
    [{ ...reps(10, false, 3), load: "moderate" }, "3 × 10 · moderat", "3 × 10 · moderate"],
    [{ ...reps(20), load: "light" }, "20 gange · let", "20 times · light"],
    [{ ...reps(6, true, 4), load: "heavy" }, "4 × 6 pr. side · tung", "4 × 6 per side · heavy"],
    [{ ...time(30, false, 3), load: "light" }, "3 × 30 sek · let", "3 × 30 sec · light"],
  ];

  for (const [dose, inDanish, inEnglish] of cases) {
    it(`reads "${inDanish}" and "${inEnglish}"`, () => {
      expect(formatDose(dose, tDa)).toBe(inDanish);
      expect(formatDose(dose, tEn)).toBe(inEnglish);
    });
  }
});

describe("a programme's whole time", () => {
  it("adds up every item, sets and sides together, to the nearest minute", () => {
    const view = builtinProgramView("mobilityDay", tDa)!;
    expect(programMinutes(view)).toBeGreaterThan(0);
  });

  it("is never zero, even for one short hold", () => {
    expect(
      programMinutes({
        parts: [
          {
            key: "any",
            items: [
              {
                exercise: builtinExerciseView("chinTuck", tDa)!,
                dose: { kind: "time", seconds: 5, perSide: false, sets: 1 },
              },
            ],
          },
        ],
      }),
    ).toBe(1);
  });
});
