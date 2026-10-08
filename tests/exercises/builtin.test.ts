import { describe, expect, it } from "vitest";
import { BUILTIN_EXERCISES, BUILTIN_PROGRAMS } from "@/modules/exercises/builtin";
import { figureGeometry, geometryBounds } from "@/modules/exercises/figure";
import {
  BOX,
  doseSchema,
  EQUIPMENT,
  EXERCISE_GROUPS,
  exerciseRefSchema,
  LOADS,
  PART_KEYS,
  poseSchema,
  programPartsSchema,
} from "@/modules/exercises/types";
import { EXERCISE_CATALOGUE } from "@/modules/workouts/exercise-catalogue";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * Kadence's own exercises and programmes are complete: words in both
 * languages, a pose that fits its box, a dose, and a source for each; a
 * programme names only exercises that exist. A new entry that forgets one
 * of these fails here rather than in front of a rider.
 */

type Messages = { [key: string]: string | Messages };
const word = (messages: Messages, path: string): unknown =>
  path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined,
      messages,
    );
const catalogues = [
  ["da", da as unknown as Messages],
  ["en", en as unknown as Messages],
] as const;

describe("Kadence's own exercises", () => {
  it("have unique ids that make a valid reference", () => {
    const ids = BUILTIN_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids)
      expect(exerciseRefSchema.safeParse(`builtin:${id}`).success, id).toBe(true);
  });

  it("number about sixteen or more, across every group but 'other'", () => {
    expect(BUILTIN_EXERCISES.length).toBeGreaterThanOrEqual(16);
    for (const group of EXERCISE_GROUPS.filter((g) => g !== "other"))
      expect(
        BUILTIN_EXERCISES.some((e) => e.group === group),
        group,
      ).toBe(true);
  });

  it("have a name, a how and a why in Danish and English", () => {
    for (const e of BUILTIN_EXERCISES)
      for (const [locale, messages] of catalogues)
        for (const field of ["name", "how", "why"]) {
          const text = word(messages, `exercises.items.${e.id}.${field}`);
          expect(
            typeof text === "string" && text.trim().length > 0,
            `${locale} ${e.id}.${field}`,
          ).toBe(true);
        }
  });

  it("write no exclamation marks", () => {
    for (const e of BUILTIN_EXERCISES)
      for (const [locale, messages] of catalogues)
        for (const field of ["name", "how", "why"])
          expect(String(word(messages, `exercises.items.${e.id}.${field}`)), locale).not.toContain(
            "!",
          );
  });

  it("have a pose the contract holds and a dose it holds", () => {
    for (const e of BUILTIN_EXERCISES) {
      expect(poseSchema.safeParse(e.pose).success, e.id).toBe(true);
      expect(doseSchema.safeParse(e.dose).success, e.id).toBe(true);
    }
  });

  it("draw inside the box, strokes and all", () => {
    for (const e of BUILTIN_EXERCISES) {
      const b = geometryBounds(figureGeometry(poseSchema.parse(e.pose)));
      expect(b.minX, e.id).toBeGreaterThanOrEqual(0);
      expect(b.minY, e.id).toBeGreaterThanOrEqual(0);
      expect(b.maxX, e.id).toBeLessThanOrEqual(BOX.width);
      expect(b.maxY, e.id).toBeLessThanOrEqual(BOX.height);
    }
  });

  it("show the movement or say why not", () => {
    // A hold has nothing to point at; everything else carries an arrow.
    const holds = new Set(["plank"]);
    for (const e of BUILTIN_EXERCISES)
      if (!holds.has(e.id)) expect(e.pose.arrows.length, e.id).toBeGreaterThan(0);
  });

  it("say where their dose and advice come from", () => {
    for (const e of BUILTIN_EXERCISES) expect(e.source.trim().length, e.id).toBeGreaterThan(20);
  });

  it("share their ids with the strength builder's catalogue where both have the exercise", () => {
    const keys = new Set(EXERCISE_CATALOGUE.map((c) => c.key).filter((k) => k !== null));
    const ids = new Set(BUILTIN_EXERCISES.map((e) => e.id));
    for (const key of keys) expect(ids.has(key!), key!).toBe(true);
    for (const c of EXERCISE_CATALOGUE.filter((c) => c.key && ids.has(c.key)))
      expect(BUILTIN_EXERCISES.find((e) => e.id === c.key)!.group, c.key!).toBe(c.group);
  });
});

describe("Kadence's own programmes", () => {
  const ids = new Set(BUILTIN_EXERCISES.map((e) => `builtin:${e.id}`));

  it("have unique ids and parts the contract holds", () => {
    const programIds = BUILTIN_PROGRAMS.map((p) => p.id);
    expect(new Set(programIds).size).toBe(programIds.length);
    for (const p of BUILTIN_PROGRAMS)
      expect(programPartsSchema.safeParse(p.parts).success, p.id).toBe(true);
  });

  it("name only exercises that exist", () => {
    for (const p of BUILTIN_PROGRAMS)
      for (const part of p.parts)
        for (const item of part.items)
          expect(ids.has(item.exercise), `${p.id}: ${item.exercise}`).toBe(true);
  });

  it("have a name and a description in Danish and English, and a source", () => {
    for (const p of BUILTIN_PROGRAMS) {
      expect(p.source.trim().length, p.id).toBeGreaterThan(20);
      for (const [locale, messages] of catalogues)
        for (const field of ["name", "description"]) {
          const text = word(messages, `exercises.programs.${p.id}.${field}`);
          expect(
            typeof text === "string" && text.trim().length > 0,
            `${locale} ${p.id}.${field}`,
          ).toBe(true);
        }
    }
  });

  it("include a day in parts, as the reference drawing has it", () => {
    const day = BUILTIN_PROGRAMS.find((p) => p.id === "mobilityDay")!;
    expect(day.parts.map((part) => part.key)).toEqual(["morning", "midday", "evening"]);
  });
});

describe("the strength room's exercises (Ø-06)", () => {
  /** What a figure draws when an exercise needs it, and needs when it draws it. */
  const DRAWN = ["kettlebell", "band", "barbell", "dumbbell", "trx", "pullupBar"] as const;
  const text = (messages: Messages, id: string, field: string) =>
    String(word(messages, `exercises.items.${id}.${field}`));

  it("use every new piece of equipment, about fifteen exercises in all", () => {
    const strength = BUILTIN_EXERCISES.filter((e) =>
      e.equipment.some((q) => ["barbell", "dumbbell", "trx", "pullupBar"].includes(q)),
    );
    expect(strength.length).toBeGreaterThanOrEqual(10);
    for (const item of ["barbell", "dumbbell", "trx", "pullupBar"] as const)
      expect(
        BUILTIN_EXERCISES.some((e) => e.equipment.includes(item)),
        item,
      ).toBe(true);
  });

  it("draw the weight, band or straps they need, and nothing they do not", () => {
    for (const e of BUILTIN_EXERCISES)
      for (const kind of DRAWN)
        expect(
          e.pose.props.some((p) => p.kind === kind),
          `${e.id}: ${kind}`,
        ).toBe(e.equipment.includes(kind));
  });

  it("start light with a free weight and have a coach watch the barbell", () => {
    for (const e of BUILTIN_EXERCISES) {
      const weight = e.equipment.some((q) => q === "barbell" || q === "dumbbell");
      if (!weight && !(e.equipment.includes("kettlebell") && e.dose.load)) continue;
      expect(text(da as unknown as Messages, e.id, "how"), e.id).toContain("Start let");
      expect(text(en as unknown as Messages, e.id, "how"), e.id).toContain("Start light");
      if (!e.equipment.includes("barbell")) continue;
      expect(text(da as unknown as Messages, e.id, "how"), e.id).toMatch(/[Tt]ræner/);
      expect(text(en as unknown as Messages, e.id, "how"), e.id).toContain("coach");
      // A bar is lifted with a straight back and the load in a word, not kilos.
      expect(e.dose.load, e.id).toBeDefined();
      expect(text(da as unknown as Messages, e.id, "how"), e.id).not.toMatch(/\bkg\b|kilo/);
    }
  });

  it("cite the free-weight sources where a weight is lifted", () => {
    for (const e of BUILTIN_EXERCISES.filter((x) =>
      x.equipment.some((q) => q === "barbell" || q === "dumbbell"),
    )) {
      expect(e.source, e.id).toContain("ATK 2.0");
      expect(e.source, e.id).toContain("Lloyd et al. 2014");
    }
  });
});

describe("the strength room's programmes (Ø-06)", () => {
  const ROOM = ["strengthRoom", "trxBodyweight", "bandsKettlebell"];
  const programs = BUILTIN_PROGRAMS.filter((p) => ROOM.includes(p.id));
  const exercise = (ref: string) => BUILTIN_EXERCISES.find((e) => `builtin:${e.id}` === ref)!;

  it("are three, in DCU's frame: a warm-up before and stretches after", () => {
    expect(programs.map((p) => p.id)).toEqual(ROOM);
    for (const p of programs) {
      expect(
        p.parts.map((part) => part.key),
        p.id,
      ).toEqual(["before", "any", "after"]);
      expect(p.source, p.id).toContain("48 h");
    }
  });

  it("use the room's equipment between them", () => {
    const used = new Set(
      programs.flatMap((p) =>
        p.parts.flatMap((part) => part.items.flatMap((i) => exercise(i.exercise).equipment)),
      ),
    );
    for (const item of ["barbell", "dumbbell", "trx", "pullupBar", "kettlebell", "band"] as const)
      expect(used.has(item), item).toBe(true);
  });

  it("say the bike's 8 minutes and DCU's 48 hours in both languages", () => {
    for (const p of programs) {
      const daText = String(
        word(da as unknown as Messages, `exercises.programs.${p.id}.description`),
      );
      const enText = String(
        word(en as unknown as Messages, `exercises.programs.${p.id}.description`),
      );
      expect(daText, p.id).toContain("8 minutter");
      expect(daText, p.id).toContain("48 timer");
      expect(enText, p.id).toContain("8 minutes");
      expect(enText, p.id).toContain("48 hours");
    }
  });

  it("follow DCU's start-up in the strength room: 3 × 12, not to exhaustion for U17", () => {
    const room = programs.find((p) => p.id === "strengthRoom")!;
    const squat = room.parts[1]!.items.find((i) => i.exercise === "builtin:backSquat")!;
    expect(squat.dose).toEqual({
      kind: "reps",
      reps: 12,
      perSide: false,
      sets: 3,
      load: "moderate",
    });
    // The warm-up is DCU's 1 × 20 at a low load.
    expect(room.parts[0]!.items[0]!.dose).toEqual({
      kind: "reps",
      reps: 20,
      perSide: false,
      sets: 1,
      load: "light",
    });
    expect(
      String(word(da as unknown as Messages, "exercises.programs.strengthRoom.description")),
    ).toContain("udmattelse");
  });
});

describe("the words around them", () => {
  it("name every part, group and piece of equipment in both languages", () => {
    const paths = [
      ...PART_KEYS.map((k) => `exercises.parts.${k}`),
      ...EXERCISE_GROUPS.map((g) => `exercises.groups.${g}`),
      ...[...EQUIPMENT, "none"].map((q) => `exercises.equipment.${q}`),
      ...LOADS.map((l) => `exercises.dose.loads.${l}`),
    ];
    for (const path of paths)
      for (const [locale, messages] of catalogues)
        expect(typeof word(messages, path), `${locale} ${path}`).toBe("string");
  });
});
