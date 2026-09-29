import { describe, expect, it } from "vitest";
import {
  cleanTitle,
  kindOf,
  parseCsv,
  readActivitiesCsv,
  stravaPrefix,
  stravaRides,
} from "@/modules/files/strava-archive";

/**
 * A Strava archive's layout (docs/adr/0030): told by its `activities.csv`
 * at the top, its rides newest first with the names the rider gave them,
 * a run told from a ride where the list says so — and a list that cannot
 * be read costs the names, never the rides.
 */

// A few of the columns Strava writes, in its order, with a name that repeats.
const CSV = [
  "Activity ID,Activity Date,Activity Name,Activity Type,Activity Description,Elapsed Time,Distance,Elapsed Time,Filename",
  '1001,"Sep 1, 2026, 7:00:00 AM",Morgentur,Ride,,3600,30.2,3600,activities/1001.fit.gz',
  '1003,"Sep 3, 2026, 7:00:00 AM","Intervaller, 4 × 8",Ride,"Hårdt, men godt",3600,28.0,3600,activities/1003.fit.gz',
  '1002,"Sep 2, 2026, 7:00:00 AM",Løb med hunden,Run,,1800,5.1,1800,activities/1002.gpx',
  '1004,"Sep 4, 2026, 7:00:00 AM",Zwift,Virtual Ride,"To linjer',
  'i beskrivelsen",2700,25.0,2700,activities/1004.fit.gz',
  '1005,"Sep 5, 2026, 7:00:00 AM",Manuel tur,Ride,,3600,30.0,3600,',
].join("\r\n");

const PATHS = [
  "activities.csv",
  "activities/1001.fit.gz",
  "activities/1003.fit.gz",
  "activities/1002.gpx",
  "activities/1004.fit.gz",
  "activities/1010.tcx.gz",
  "activities/._1003.fit.gz",
  "activities/sub/1099.fit",
  "media/photo.jpg",
  "routes/1.gpx",
  "profile.csv",
];

describe("a Strava archive", () => {
  it("is told by its list of activities at the top, or one folder down", () => {
    expect(stravaPrefix(PATHS)).toBe("");
    expect(stravaPrefix(["export_123/Activities.csv", "export_123/activities/1.fit"])).toBe(
      "export_123/",
    );
    expect(stravaPrefix(["a/b/activities.csv"])).toBeNull();
    expect(stravaPrefix(["Garmin/Activities/1.fit"])).toBeNull();
  });

  it("holds its rides in activities/, newest first, with the names from the list", () => {
    const rides = stravaRides(PATHS, "", readActivitiesCsv(CSV));
    expect(rides.map((r) => [r.fileName, r.title, r.kind])).toEqual([
      ["1010.tcx.gz", "", "unknown"],
      ["1004.fit.gz", "Zwift", "bike"],
      ["1003.fit.gz", "Intervaller, 4 × 8", "bike"],
      ["1002.gpx", "Løb med hunden", "other"],
      ["1001.fit.gz", "Morgentur", "bike"],
    ]);
    expect(rides[1]!.path).toBe("activities/1004.fit.gz");
  });

  it("keeps its rides when the list is missing or cannot be read", () => {
    for (const csv of [new Map(), readActivitiesCsv(""), readActivitiesCsv("no,columns\n1,2")])
      expect(stravaRides(PATHS, "", csv).map((r) => [r.fileName, r.title, r.kind])).toEqual([
        ["1010.tcx.gz", "", "unknown"],
        ["1004.fit.gz", "", "unknown"],
        ["1003.fit.gz", "", "unknown"],
        ["1002.gpx", "", "unknown"],
        ["1001.fit.gz", "", "unknown"],
      ]);
  });

  it("is read under the folder it was unpacked into", () => {
    const paths = PATHS.map((p) => `export_7/${p}`);
    const rides = stravaRides(paths, "export_7/", readActivitiesCsv(CSV));
    expect(rides.map((r) => r.path)[0]).toBe("export_7/activities/1010.tcx.gz");
    expect(rides.find((r) => r.fileName === "1001.fit.gz")!.title).toBe("Morgentur");
  });
});

describe("the list of activities", () => {
  it("is read as CSV: quotes, commas, doubled quotes and line breaks inside a field", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\n"two\nlines",\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
      ["two\nlines", ""],
    ]);
    expect(parseCsv("a\nb\nc\nd", 2)).toEqual([["a"], ["b"]]);
  });

  it("finds its columns by name, whatever else it holds", () => {
    const index = readActivitiesCsv(CSV);
    expect(index.get("activities/1003.fit.gz")).toEqual({
      title: "Intervaller, 4 × 8",
      type: "Ride",
    });
    expect(index.get("activities/1004.fit.gz")!.type).toBe("Virtual Ride");
    // A manual activity has no file and no row here.
    expect([...index.keys()]).toHaveLength(4);
    expect(
      readActivitiesCsv("Filename,Type\nactivities/9.fit,Ride").get("activities/9.fit"),
    ).toEqual({
      title: "",
      type: "Ride",
    });
  });

  it("keeps a name as a person would read it: one line, no control characters, 120 at most", () => {
    expect(cleanTitle("  Tur\u0000 med\tklubben\n ")).toBe("Tur med klubben");
    expect(cleanTitle("x".repeat(300))).toHaveLength(120);
  });

  it("tells a ride from a run where it can, and leaves the rest to the file", () => {
    for (const type of [
      "Ride",
      "Virtual Ride",
      "E-Bike Ride",
      "Gravel Ride",
      "Handcycle",
      "Velomobile",
    ])
      expect(kindOf(type), type).toBe("bike");
    for (const type of [
      "Run",
      "Walk",
      "Hike",
      "Weight Training",
      "Workout",
      "Nordic Ski",
      "Rowing",
      "Swim",
    ])
      expect(kindOf(type), type).toBe("other");
    // A list in another language says nothing the import cannot read from the file itself.
    for (const type of ["", "  ", "Cykeltur", "Radfahrt"])
      expect(kindOf(type), type).toBe("unknown");
  });
});
