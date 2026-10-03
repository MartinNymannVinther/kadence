import { describe, expect, it } from "vitest";
import {
  formatTime,
  mostImproved,
  parseTime,
  personalBests,
  pointsFor,
  roundPlaces,
  standings,
  type EntryIn,
  type RoundIn,
} from "@/modules/club/standings";

const tt: RoundIn = {
  id: "tt",
  heldOn: "2027-05-01",
  title: "Klubbens enkeltstart",
  measure: "time",
};
const hill: RoundIn = { id: "hill", heldOn: "2027-06-01", title: "Bjergspurt", measure: "place" };

const entry = (over: Partial<EntryIn> & Pick<EntryIn, "id" | "roundId" | "name">): EntryIn => ({
  riderId: over.name.toLowerCase(),
  class: "U17",
  timeMs: null,
  place: null,
  status: "finished",
  ...over,
});

const entries: EntryIn[] = [
  entry({ id: "1", roundId: "tt", name: "Anna", timeMs: 1_200_000 }),
  entry({ id: "2", roundId: "tt", name: "Bo", timeMs: 1_150_000 }),
  entry({ id: "3", roundId: "tt", name: "Cai", timeMs: 1_200_000 }),
  entry({ id: "4", roundId: "tt", name: "Dan", status: "dnf" }),
  entry({ id: "5", roundId: "tt", name: "Eva", class: "U19", timeMs: 1_100_000 }),
  entry({ id: "6", roundId: "hill", name: "Anna", place: 1 }),
  entry({ id: "7", roundId: "hill", name: "Bo", place: 2 }),
];

describe("a round", () => {
  it("orders by time within the class, ties sharing a place, and places nobody who did not finish", () => {
    const places = roundPlaces(tt, entries);
    expect(places.get("2")).toBe(1);
    expect(places.get("1")).toBe(2);
    expect(places.get("3")).toBe(2);
    expect(places.has("4")).toBe(false);
    expect(places.get("5")).toBe(1);
  });

  it("gives 10, 8, 6 … and one point to every finisher past the table", () => {
    expect(pointsFor(1)).toBe(10);
    expect(pointsFor(8)).toBe(1);
    expect(pointsFor(15)).toBe(1);
    expect(pointsFor(2, [5, 3])).toBe(3);
  });
});

describe("the season", () => {
  it("adds the rounds up per class; more wins breaks a tie", () => {
    const table = standings([hill, tt], entries);
    expect(table.U17.map((s) => [s.name, s.points])).toEqual([
      ["Anna", 18],
      ["Bo", 18],
      ["Cai", 8],
      ["Dan", 0],
    ]);
    expect(table.U17[0]!.places).toEqual([2, 1]);
    expect(table.U19.map((s) => s.name)).toEqual(["Eva"]);
    expect(table.open).toEqual([]);
  });
});

describe("records and improvement on the club's own course", () => {
  const timed = [
    {
      id: "a1",
      key: "anna",
      name: "Anna",
      course: "Klubbens enkeltstart",
      heldOn: "2026-05-01",
      timeMs: 1_300_000,
    },
    {
      id: "a2",
      key: "anna",
      name: "Anna",
      course: "klubbens enkeltstart ",
      heldOn: "2027-05-01",
      timeMs: 1_200_000,
    },
    {
      id: "b1",
      key: "bo",
      name: "Bo",
      course: "Klubbens enkeltstart",
      heldOn: "2026-05-01",
      timeMs: 1_160_000,
    },
    {
      id: "b2",
      key: "bo",
      name: "Bo",
      course: "Klubbens enkeltstart",
      heldOn: "2027-05-01",
      timeMs: 1_150_000,
    },
    {
      id: "c1",
      key: "cai",
      name: "Cai",
      course: "Klubbens enkeltstart",
      heldOn: "2027-05-01",
      timeMs: 1_100_000,
    },
  ];

  it("a record is beating one's own earlier time; a first ride is not yet one", () => {
    expect([...personalBests(timed)].sort()).toEqual(["a2", "b2"]);
  });

  it("the year's biggest improvement is the largest percent faster than the year before", () => {
    const top = mostImproved(timed, 2027);
    expect(top?.name).toBe("Anna");
    expect(top?.percent).toBeCloseTo(7.69, 1);
    expect(mostImproved(timed, 2026)).toBeNull();
  });
});

describe("times", () => {
  it("reads and writes minutes and seconds", () => {
    expect(parseTime("20:00")).toBe(1_200_000);
    expect(parseTime("1:02:03")).toBe(3_723_000);
    expect(parseTime("19:59,5")).toBe(1_199_500);
    expect(parseTime("20")).toBeNull();
    expect(parseTime("12:75")).toBeNull();
    expect(formatTime(1_200_000)).toBe("20:00");
    expect(formatTime(3_723_000)).toBe("1:02:03");
    expect(formatTime(1_199_500)).toBe("19:59.5");
  });
});
