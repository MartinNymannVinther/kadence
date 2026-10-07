import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { BUILTIN_PROGRAMS } from "@/modules/exercises/builtin";
import type { Translate } from "@/modules/exercises/dose";
import {
  doseAmount,
  doseSeconds,
  MAX_SESSION_EXERCISES,
  PACE,
  programDoses,
  programMinutes,
  programStructure,
  refsInStructure,
} from "@/modules/exercises/program-session";
import type { Dose } from "@/modules/exercises/types";
import { builtinProgramView } from "@/modules/exercises/view";
import { readStructure, strengthStructureSchema } from "@/modules/workouts/structure";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * A programme as a session in the calendar: a strength session the
 * strength builder can read, its doses written as sets and reps, each
 * exercise carrying its reference, and minutes estimated from the doses.
 */

const translator = (locale: "da" | "en"): Translate =>
  createTranslator({
    locale,
    messages: locale === "da" ? da : en,
    namespace: "exercises",
  }) as unknown as Translate;
const tDa = translator("da");
const tEn = translator("en");

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

describe("a dose's time", () => {
  it("counts both sides, every set, and the rest between sets", () => {
    expect(doseSeconds(time(30))).toBe(30);
    expect(doseSeconds(time(30, true))).toBe(60);
    expect(doseSeconds(time(30, false, 3))).toBe(90 + 2 * PACE.restBetweenSets);
    expect(doseSeconds(reps(10))).toBe(10 * PACE.secondsPerRep);
    expect(doseSeconds(reps(8, true, 3))).toBe(8 * PACE.secondsPerRep * 2 * 3 + 60);
  });

  it("adds up to whole minutes, a change-over after each exercise", () => {
    expect(programMinutes([])).toBe(0);
    expect(programMinutes([time(5)])).toBe(1);
    // 30 + 60 + 40 seconds of work and three change-overs: 175 s.
    expect(programMinutes([time(30), time(30, true), reps(10)])).toBe(3);
  });

  it("places Kadence's own programmes at a plausible length", () => {
    const minutes = Object.fromEntries(
      BUILTIN_PROGRAMS.map((p) => [
        p.id,
        programMinutes(programDoses(builtinProgramView(p.id, tDa)!)),
      ]),
    );
    expect(minutes.afterRide).toBeGreaterThanOrEqual(6);
    expect(minutes.afterRide).toBeLessThanOrEqual(12);
    expect(minutes.strengthNoMachines).toBeGreaterThanOrEqual(25);
    expect(minutes.strengthNoMachines).toBeLessThanOrEqual(45);
    for (const id of ["strengthRoom", "trxBodyweight", "bandsKettlebell"]) {
      expect(minutes[id], id).toBeGreaterThanOrEqual(20);
      expect(minutes[id], id).toBeLessThanOrEqual(60);
    }
  });
});

describe("a dose as the strength session writes reps", () => {
  it("reads as a number, a time, or per side, in the coach's language", () => {
    expect(doseAmount(reps(10, false, 3), tDa)).toBe("10");
    expect(doseAmount(reps(10, true), tDa)).toBe("10 pr. side");
    expect(doseAmount(time(30), tDa)).toBe("30 sek");
    expect(doseAmount(time(120), tDa)).toBe("2 min");
    expect(doseAmount(time(20, true), tEn)).toBe("20 sec per side");
  });

  it("always fits the strength builder's 20 characters", () => {
    for (const dose of [time(600, true), time(595, true), reps(100, true)])
      for (const t of [tDa, tEn]) expect(doseAmount(dose, t).length).toBeLessThanOrEqual(20);
  });
});

describe("a programme as a strength session", () => {
  it("is a strength structure for every one of Kadence's own programmes", () => {
    for (const program of BUILTIN_PROGRAMS) {
      const view = builtinProgramView(program.id, tDa)!;
      const structure = programStructure(view, tDa);
      expect(strengthStructureSchema.parse(structure)).toEqual(structure);
      expect(readStructure(structure, "strength")).toEqual(structure);
      expect(structure.exercises.length).toBeLessThanOrEqual(MAX_SESSION_EXERCISES);
      expect(structure.minutes).toBe(programMinutes(programDoses(view)));
    }
  });

  it("carries each exercise's reference, name, group and dose in order", () => {
    const view = builtinProgramView("coreNoEquipment", tDa)!;
    const structure = programStructure(view, tDa);
    expect(structure.exercises[0]).toEqual({
      name: "Dead bug",
      group: "core",
      sets: 3,
      reps: "10",
      load: "",
      note: "",
      ref: "builtin:deadBug",
    });
    expect(structure.exercises.map((e) => e.ref)).toEqual(
      view.parts[0]!.items.map((i) => i.exercise.ref),
    );
  });

  it("writes a dose's load in a word in the session's load, in the coach's language", () => {
    const structure = programStructure(builtinProgramView("strengthRoom", tDa)!, tDa);
    const squat = structure.exercises.find((e) => e.ref === "builtin:backSquat" && e.sets === 3)!;
    expect(squat).toMatchObject({ sets: 3, reps: "12", load: "moderat", note: "Øvelser" });
    expect(structure.exercises[0]).toMatchObject({ reps: "20", load: "let", note: "Før" });
    const inEnglish = programStructure(builtinProgramView("strengthRoom", tEn)!, tEn);
    expect(inEnglish.exercises[0]!.load).toBe("light");
    // An exercise without a load leaves the field empty, as before.
    expect(structure.exercises.find((e) => e.ref === "builtin:superman")!.load).toBe("");
  });

  it("names the part in each exercise's note when there is more than one", () => {
    const structure = programStructure(builtinProgramView("mobilityDay", tDa)!, tDa);
    expect(structure.exercises[0]!.note).toBe("Morgen");
    expect(structure.exercises.at(-1)!.note).toBe("Aften");
  });

  it("names its references once each", () => {
    const structure = programStructure(builtinProgramView("mobilityDay", tDa)!, tDa);
    const refs = refsInStructure(structure);
    expect(new Set(refs).size).toBe(refs.length);
    expect(refs).toContain("builtin:catCow");
    expect(refsInStructure({ exercises: [] })).toEqual([]);
  });
});
