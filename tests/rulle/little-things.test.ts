import { describe, expect, it } from "vitest";
import {
  HIMMELBJERGET_M,
  littleThings,
  nothingSeen,
  pauseLengths,
  seenSchema,
  stopKind,
  type Recording,
} from "@/modules/rulle";

/** A ride of `seconds`, with pauses from and to the given seconds. */
function ride(seconds: number, pauses: [number, number | null][] = []): Recording {
  const t = Array.from({ length: seconds }, (_, i) => i);
  const none = t.map(() => null);
  return {
    startedAt: 1_760_000_000_000,
    t,
    power: t.map(() => 200),
    cadence: t.map(() => 90),
    hr: none,
    speed: none,
    distance: none,
    altitude: none,
    laps: [],
    pauses: pauses.map(([from, to]) => ({ from, to })),
    endedAt: seconds,
  };
}

describe("today's little things", () => {
  it("names the climbing in Himmelbjerge", () => {
    const things = littleThings({ rec: ride(60), ascentM: 222, seen: null, allOnTarget: null });
    expect(things).toEqual([{ key: "himmelbjerg", metres: 222, times: 1.5 }]);
    expect(HIMMELBJERGET_M).toBe(147);
  });

  it("says nothing about a little climbing, nor about what nobody saw", () => {
    expect(littleThings({ rec: ride(60), ascentM: 10, seen: null, allOnTarget: null })).toEqual([]);
    expect(
      littleThings({ rec: ride(60), ascentM: null, seen: nothingSeen(), allOnTarget: false }),
    ).toEqual([]);
  });

  it("counts what passed and what was passed, in a fixed order", () => {
    const seen = { ...nothingSeen(), cows: 17, cargoOvertaken: 1, car: 2 };
    expect(littleThings({ rec: ride(60), ascentM: null, seen, allOnTarget: null })).toEqual([
      { key: "cargoOvertaken", count: 1 },
      { key: "car", count: 2 },
      { key: "cows", count: 17 },
    ]);
  });

  it("counts the cobbles and the marshals' motorbikes of a city's race day, and reads a ride kept from before", () => {
    const seen = { ...nothingSeen(), finish: 2, cobbles: 4, moto: 1, cows: 1 };
    expect(
      littleThings({ rec: ride(60), ascentM: null, seen, allOnTarget: null }).map((t) => t.key),
    ).toEqual(["finish", "cobbles", "moto", "cows"]);
    // Kept before race day counted cobbles and motorbikes: none, not a ride that cannot be read.
    const { cobbles: _, moto: __, ...before } = nothingSeen();
    expect(seenSchema.parse(before)).toMatchObject({ cobbles: 0, moto: 0 });
  });

  it("counts the hill sprints' lines crossed, after the finish, and none on a ride kept from before", () => {
    const seen = { ...nothingSeen(), finish: 1, hill: 3, cows: 2 };
    expect(
      littleThings({ rec: ride(60), ascentM: null, seen, allOnTarget: null }).map((t) => t.key),
    ).toEqual(["finish", "hill", "cows"]);
    const { hill: _, ...before } = nothingSeen();
    expect(seenSchema.parse(before).hill).toBe(0);
  });

  it("makes the pauses stops and cups: a short one is only a drink from the bottle", () => {
    const rec = ride(3600, [
      [100, 110],
      [500, 560],
      [1000, 1400],
      [2000, 2090],
      [3000, null],
    ]);
    expect(pauseLengths(rec)).toEqual([10, 60, 400, 90, 600]);
    const things = littleThings({ rec, ascentM: null, seen: null, allOnTarget: null });
    const cups = [0, 1, 2, 1, 2];
    const at = (kind: "cafe" | "stand") =>
      cups
        .map((drinks, index) => ({ drinks, kind: stopKind(index) }))
        .filter((p) => p.drinks > 0 && p.kind === kind);
    const cafe = at("cafe");
    const stand = at("stand");
    const expected = [
      ...(cafe.length > 0
        ? [{ key: "cafe", stops: cafe.length, cups: cafe.reduce((s, p) => s + p.drinks, 0) }]
        : []),
      ...(stand.length > 0
        ? [{ key: "stand", stops: stand.length, bottles: stand.reduce((s, p) => s + p.drinks, 0) }]
        : []),
    ];
    expect(things).toEqual(expected);
    // The first pause is ten seconds, a drink from the bottle: no stop of its own.
    expect(cafe.length + stand.length).toBe(4);
  });

  it("ends with every block on target, when it was so", () => {
    const things = littleThings({ rec: ride(60), ascentM: 150, seen: null, allOnTarget: true });
    expect(things.at(-1)).toEqual({ key: "onTarget" });
    expect(
      littleThings({ rec: ride(60), ascentM: 150, seen: null, allOnTarget: false }).some(
        (t) => t.key === "onTarget",
      ),
    ).toBe(false);
  });
});
