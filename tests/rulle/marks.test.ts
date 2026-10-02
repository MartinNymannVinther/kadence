import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCourse, MARK_LIMITS, markKind, readRouteGpx } from "@/modules/rulle";

describe("an organiser's marks", () => {
  it("are read for what they say, in Danish, English or French", () => {
    expect(markKind("Obstacle in the middle of the road")).toBe("obstacle");
    expect(markKind("Helle midt på vejen")).toBe("obstacle");
    expect(markKind("brosten")).toBe("cobbles");
    expect(markKind("Secteur pavé")).toBe("cobbles");
    expect(markKind("Feedzone")).toBe("feed");
    expect(markKind("Zone de ravitaillement")).toBe("feed");
    expect(markKind("Litterzone")).toBe("litter");
    expect(markKind("Dropzone på Findalsvej")).toBe("litter");
    expect(markKind("Bakkespurt Pederstrup")).toBe("hill");
    expect(markKind("Bjergspurt")).toBe("hill");
    expect(markKind("Hill sprint")).toBe("hill");
    expect(markKind("Grand Prix de la Montagne")).toBe("hill");
    expect(markKind("Målstregen")).toBe("finish");
    expect(markKind("Arrivée")).toBe("finish");
    expect(markKind("Podie")).toBe("podium");
    expect(markKind("Teamparkering")).toBe("parking");
    expect(markKind("Speedbumps")).toBe("bumps");
    expect(markKind("Drej skarpt til højre ind på Grønningen")).toBe("bend");
    expect(markKind("snævert sving")).toBe("bend");
    expect(markKind("Mormors hus")).toBeNull();
  });

  it("are taken from a file's waypoints, capped, and laid where they are on the lap", () => {
    const point = (i: number) =>
      `<trkpt lat="${55.7 + i * 0.0005}" lon="9.5"><ele>10</ele></trkpt>`;
    const far = `<wpt lat="55.8" lon="9.9"><name>Feedzone</name></wpt>`;
    const near = `<wpt lat="55.7102" lon="9.5003"><name>Brosten</name><cmt>${"x".repeat(900)}</cmt></wpt>`;
    const many = Array.from(
      { length: MARK_LIMITS.maxMarks + 50 },
      () => `<wpt lat="55.701" lon="9.5"><name>x</name></wpt>`,
    ).join("");
    const xml = `<gpx>${near}${far}${many}<trk><trkseg>${Array.from({ length: 60 }, (_, i) => point(i)).join("")}</trkseg></trk></gpx>`;
    const file = readRouteGpx(xml);
    expect(file.marks!.length).toBe(MARK_LIMITS.maxMarks);
    expect(file.marks![0]!.text.length).toBeLessThanOrEqual(MARK_LIMITS.maxText);
    const course = buildCourse(file);
    // The far one is not the course's, the rest say nothing it knows but the cobbles.
    expect(course.marks).toHaveLength(1);
    expect(course.marks[0]!.kind).toBe("cobbles");
    expect(course.marks[0]!.along).toBeGreaterThan(1050);
    expect(course.marks[0]!.along).toBeLessThan(1200);
    expect(course.marks[0]!.off).toBeLessThan(40);
  });

  it("are Future Racing's own on its lap: islands, cobbles, feed zone, the line", () => {
    const course = buildCourse(
      readRouteGpx(readFileSync("public/rulle/routes/future-racing-2026-kobenhavn.gpx", "utf8")),
    );
    const count = (kind: string) => course.marks.filter((m) => m.kind === kind).length;
    expect(count("obstacle")).toBe(12);
    // Two sharp turns and two tight bends.
    expect(count("bend")).toBe(4);
    for (const kind of ["cobbles", "feed", "litter", "bumps", "podium", "parking"])
      expect(count(kind), kind).toBe(1);
    const at = (kind: string) => course.marks.find((m) => m.kind === kind)!.along;
    // Adelgade's cobbles 1.7 km in; the feed zone after the litter zone, as riders meet them.
    expect(at("cobbles")).toBeGreaterThan(1600);
    expect(at("cobbles")).toBeLessThan(1800);
    expect(at("feed")).toBeGreaterThan(at("litter"));
    // The lap starts at the finish line.
    const line = course.marks.filter((m) => m.kind === "finish").map((m) => m.along);
    expect(line.some((d) => d < 60 || d > course.length - 60)).toBe(true);
  });

  it("are the queen stage's hill sprint on Pederstrup and its two drop zones (ADR 0046)", () => {
    const course = buildCourse(
      readRouteGpx(readFileSync("public/rulle/routes/tour-de-himmelfart-2026-odder.gpx", "utf8")),
    );
    expect(course.marks.map((m) => [m.kind, Math.round(m.along / 100) / 10])).toEqual([
      // The organiser's route sheet: the hill sprint at 6.4 km, and the map's drop zones.
      ["hill", 6.4],
      ["litter", 10.7],
      ["litter", 15],
    ]);
  });
});
