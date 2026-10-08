import { describe, expect, it } from "vitest";
import {
  addItem,
  addPart,
  draftParts,
  MAX_ITEMS,
  moveItem,
  programInput,
  removeItem,
  removePart,
  setItemDose,
  setPartKey,
  unusedKeys,
  type DraftPart,
} from "@/modules/exercises/program-draft";
import { PART_KEYS } from "@/modules/exercises/types";

/**
 * The programme builder's draft: what a coach puts together saves as the
 * contract has it.
 */

const plank = "builtin:plank";
const squat = "builtin:squat";
const team = "team:3f2c1a9e-8d7b-4c6a-9e5f-1a2b3c4d5e6f";

describe("the programme's draft", () => {
  it("gets a new part under the first key not yet used, and none past six", () => {
    let parts: DraftPart[] = [];
    for (let i = 0; i < 8; i++) parts = addPart(parts);
    expect(parts.map((p) => p.key)).toEqual([...PART_KEYS]);
    expect(unusedKeys(parts)).toEqual([]);
    expect(addPart([{ key: "any", items: [] }])[1]!.key).toBe("morning");
  });

  it("never gives two parts the same key", () => {
    const parts: DraftPart[] = [
      { key: "morning", items: [] },
      { key: "evening", items: [] },
    ];
    expect(setPartKey(parts, 1, "morning")).toEqual(parts);
    expect(setPartKey(parts, 1, "after")[1]!.key).toBe("after");
    expect(removePart(parts, 0)).toEqual([{ key: "evening", items: [] }]);
  });

  it("adds, moves and takes out exercises within a part, twenty at most", () => {
    let parts: DraftPart[] = [{ key: "any", items: [] }];
    parts = addItem(addItem(addItem(parts, 0, plank), 0, squat), 0, team);
    expect(parts[0]!.items.map((i) => i.exercise)).toEqual([plank, squat, team]);
    parts = moveItem(parts, 0, 2, -1);
    expect(parts[0]!.items.map((i) => i.exercise)).toEqual([plank, team, squat]);
    expect(moveItem(parts, 0, 0, -1)).toEqual(parts);
    expect(removeItem(parts, 0, 1)[0]!.items.map((i) => i.exercise)).toEqual([plank, squat]);
    for (let i = 0; i < 30; i++) parts = addItem(parts, 0, plank);
    expect(parts[0]!.items).toHaveLength(MAX_ITEMS);
  });

  it("gives an item the programme's own dose, and takes it back to the exercise's", () => {
    const dose = { kind: "time" as const, seconds: 45, perSide: true, sets: 2 };
    let parts = addItem([{ key: "any", items: [] }], 0, plank);
    parts = setItemDose(parts, 0, 0, dose);
    expect(parts[0]!.items[0]).toEqual({ exercise: plank, dose });
    parts = setItemDose(parts, 0, 0, undefined);
    expect(parts[0]!.items[0]).toEqual({ exercise: plank });
  });

  it("saves only as the contract has it: a name and an exercise in every part", () => {
    const parts = addItem([{ key: "any", items: [] }], 0, plank);
    expect(programInput({ name: "Morgen", description: "", parts })).toMatchObject({
      name: "Morgen",
      parts: [{ key: "any", items: [{ exercise: plank }] }],
    });
    expect(programInput({ name: " ", description: "", parts })).toBeNull();
    expect(programInput({ name: "Morgen", description: "", parts: addPart(parts) })).toBeNull();
  });

  it("starts from a stored programme's parts as they were", () => {
    const stored = [
      {
        key: "before" as const,
        items: [
          { exercise: plank },
          { exercise: squat, dose: { kind: "reps" as const, reps: 20, perSide: false, sets: 1 } },
        ],
      },
    ];
    expect(draftParts(stored)).toEqual(stored);
  });
});
