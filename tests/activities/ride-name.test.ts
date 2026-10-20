import { describe, expect, it } from "vitest";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import {
  indoorFromStreams,
  looksLikeFileName,
  needsIndoor,
  partOfDay,
  RIDE_WORDS,
  rideName,
  rideNameText,
  type RideNameInput,
} from "@/modules/activities/ride-name";

/**
 * Rides get telling names (docs/adr/0098): a file's name gives way to the
 * session the ride was ridden for, or to the part of the day and the
 * sport, Copenhagen time; a name a person or a device gave is kept.
 */

describe("looksLikeFileName", () => {
  it.each([
    "",
    "   ",
    "23456789012",
    "23456789012 (1)",
    "23456700001_ACTIVITY",
    "23456700001_activity",
    "activity_23456700001",
    "rytter@example.com_23456700001",
    "2026-09-20-11-16-25",
    "2026-09-20 11.16.25",
    "2026-09-20_11-16-25",
    "2026-09-20T11:16:25Z",
    "2026-09-20",
    "20260920_111625",
    "20260920-111625",
    "2026-09-20-111625-ELEMNT BOLT A1B2-12-0",
    "Ida_Berg_2026-09-20_11-16-25",
    "B9K91234",
    "tur.fit",
    "23456789012.fit.gz",
    "Morgentur.FIT",
    "eksport.zip",
    "ride.gpx",
    "ride.tcx",
    "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    "9a0c0305e82c33019a0c0305",
    "Wahoo",
    "Garmin",
    "polar",
  ])("%j is a file's name", (title) => {
    expect(looksLikeFileName(title)).toBe(true);
  });

  it.each([
    "Morning Ride",
    "Lunch Ride",
    "Afternoon Ride",
    "Eftermiddagstur",
    "Zwift - Watopia",
    "Zwift - Group Ride: Tour de Zwift Stage 3",
    "Kolding Cykling",
    "Indendørs cykling",
    "Cycling",
    "Fri tur",
    "Intervaller 4×8",
    "Løbetur",
    "Hold-træning 2026",
    "DM 2026 Vejle",
    "U17 landevej",
    "Tirsdagstræning 17:30",
    "TEST1234",
    "Morning_Ride",
    "Tour of Holland 2026 stage 2",
    "123",
  ])("%j is a name", (title) => {
    expect(looksLikeFileName(title)).toBe(false);
  });
});

describe("partOfDay, Copenhagen time", () => {
  it.each([
    // Summer time, UTC+2.
    ["2026-07-01T02:59:00Z", "night"],
    ["2026-07-01T03:00:00Z", "morning"],
    ["2026-07-01T07:59:00Z", "morning"],
    ["2026-07-01T08:00:00Z", "forenoon"],
    ["2026-07-01T09:59:00Z", "forenoon"],
    ["2026-07-01T10:00:00Z", "afternoon"],
    ["2026-07-01T14:59:00Z", "afternoon"],
    ["2026-07-01T15:00:00Z", "evening"],
    ["2026-07-01T19:59:00Z", "evening"],
    ["2026-07-01T20:00:00Z", "night"],
    ["2026-07-01T22:00:00Z", "night"],
    // Winter time, UTC+1.
    ["2026-01-15T03:59:00Z", "night"],
    ["2026-01-15T04:00:00Z", "morning"],
    ["2026-01-15T09:00:00Z", "forenoon"],
    ["2026-01-15T11:00:00Z", "afternoon"],
    ["2026-01-15T16:00:00Z", "evening"],
    ["2026-01-15T21:00:00Z", "night"],
    ["2026-01-15T23:30:00Z", "night"],
  ] as const)("%s is %s", (at, part) => {
    expect(partOfDay(at)).toBe(part);
  });

  it("reads a Date as well as a string", () => {
    expect(partOfDay(new Date("2026-09-20T09:16:25Z"))).toBe("forenoon");
  });
});

const ride = (over: Partial<RideNameInput> = {}): RideNameInput => ({
  title: "23456789012",
  sport: "bike",
  // 11:16 in Copenhagen, summer time.
  startedAt: "2026-09-20T09:16:25Z",
  source: "garmin",
  sessionTitle: null,
  indoor: false,
  ...over,
});

describe("rideName", () => {
  it("keeps a name a person or a device gave", () => {
    expect(rideName(ride({ title: "  Morning Ride " }))).toEqual({ title: "Morning Ride" });
    expect(rideName(ride({ title: "Zwift - Watopia", sessionTitle: "Intervaller" }))).toEqual({
      title: "Zwift - Watopia",
    });
  });

  it("gives a file's name way to the session the ride was ridden for", () => {
    expect(rideName(ride({ sessionTitle: "Løbetur" }))).toEqual({ title: "Løbetur" });
    expect(rideName(ride({ title: "", sessionTitle: "Intervaller 4×8" }))).toEqual({
      title: "Intervaller 4×8",
    });
  });

  it("names a bike ride by the part of the day", () => {
    expect(rideName(ride())).toEqual({ word: "forenoonRide" });
    expect(rideName(ride({ startedAt: "2026-09-20T05:00:00Z" }))).toEqual({ word: "morningRide" });
    expect(rideName(ride({ startedAt: "2026-09-20T12:00:00Z" }))).toEqual({
      word: "afternoonRide",
    });
    expect(rideName(ride({ startedAt: "2026-09-20T16:00:00Z" }))).toEqual({ word: "eveningRide" });
    expect(rideName(ride({ startedAt: "2026-09-20T21:00:00Z" }))).toEqual({ word: "nightRide" });
  });

  it("calls a bike ride without a position an indoor ride", () => {
    expect(rideName(ride({ indoor: true }))).toEqual({ word: "indoorRide" });
  });

  it("calls anything else a workout, since a run cannot be told apart", () => {
    expect(rideName(ride({ sport: "other" }))).toEqual({ word: "forenoonWorkout" });
    expect(rideName(ride({ sport: "other", indoor: true }))).toEqual({ word: "forenoonWorkout" });
  });

  it("calls strength strength, whenever it was", () => {
    expect(rideName(ride({ sport: "strength", title: "" }))).toEqual({ word: "strength" });
    expect(rideName(ride({ sport: "strength", title: "", sessionTitle: "Ben og core" }))).toEqual({
      title: "Ben og core",
    });
  });

  it("does not read the hour of an entry by hand, which is noon by convention", () => {
    const manual = { title: "", source: "manual", startedAt: "2026-09-20T10:00:00Z" };
    expect(rideName(ride(manual))).toEqual({ word: "bikeRide" });
    expect(rideName(ride({ ...manual, sport: "other" }))).toEqual({ word: "workout" });
    expect(rideName(ride({ ...manual, title: "Spinning" }))).toEqual({ title: "Spinning" });
  });
});

describe("needsIndoor", () => {
  it("asks the samples only when the name turns on them", () => {
    expect(needsIndoor(ride())).toBe(true);
    expect(needsIndoor(ride({ title: "Morning Ride" }))).toBe(false);
    expect(needsIndoor(ride({ sessionTitle: "Intervaller" }))).toBe(false);
    expect(needsIndoor(ride({ sport: "other" }))).toBe(false);
    expect(needsIndoor(ride({ source: "manual" }))).toBe(false);
  });
});

describe("indoorFromStreams", () => {
  it("is indoors when samples were kept and none has a position", () => {
    expect(indoorFromStreams({ t: [0, 5], lat: [null, null], lon: [null, null] })).toBe(true);
    expect(indoorFromStreams({ t: [0, 5], lat: [null, 55.70001], lon: [null, 9.5] })).toBe(false);
  });

  it("is not indoors without samples, or for samples that never carried positions", () => {
    expect(indoorFromStreams(null)).toBe(false);
    expect(indoorFromStreams({ t: [0, 5], power: [200, 210] })).toBe(false);
  });
});

describe("the words", () => {
  type Names = Record<string, string>;
  const names = {
    da: (da as { activities: { names: Names } }).activities.names,
    en: (en as { activities: { names: Names } }).activities.names,
  };

  it("every word is in both catalogues", () => {
    for (const word of RIDE_WORDS) {
      expect(names.da[word], word).toBeTruthy();
      expect(names.en[word], word).toBeTruthy();
    }
  });

  it("reads three downloaded rides as telling names", () => {
    const t = (word: string) => names.da[word]!;
    expect(rideNameText(rideName(ride({ title: "23456789012" })), t)).toBe("Formiddagstur");
    expect(
      rideNameText(
        rideName(ride({ title: "23456700001_ACTIVITY", startedAt: "2026-09-20T13:00:00Z" })),
        t,
      ),
    ).toBe("Eftermiddagstur");
    expect(rideNameText(rideName(ride({ title: "2026-09-20-11-16-25", indoor: true })), t)).toBe(
      "Indendørs tur",
    );
    expect(rideNameText(rideName(ride({ title: "Lunch Ride" })), t)).toBe("Lunch Ride");
  });
});
