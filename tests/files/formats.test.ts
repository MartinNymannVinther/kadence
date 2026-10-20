import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { activityFromFit } from "@/modules/devices/from-fit";
import { baseName, decodeActivityFile, formatOfName, sniffFormat } from "@/modules/files";
import { summarizeActivity } from "@/modules/fit";
import { encodeRide, steadyHour } from "../fit/fixtures";
import { bytesOf, gpx, tcx, zip } from "./fixtures";

/**
 * Every format a rider's device or service gives, read into one shape:
 * FIT as before, TCX with its laps and watts, GPX with distance and speed
 * from the positions, and all of them gzipped or zipped.
 */

const rider = { ftp: 250, thresholdHr: 170 };

describe("telling the format from the bytes", () => {
  it("knows FIT, TCX, GPX, gzip and zip, whatever the name", () => {
    expect(sniffFormat(encodeRide(steadyHour().slice(0, 10)))).toBe("fit");
    expect(sniffFormat(bytesOf(tcx()))).toBe("tcx");
    expect(sniffFormat(bytesOf(gpx(5)))).toBe("gpx");
    expect(sniffFormat(gzipSync(bytesOf(gpx(5))))).toBe("gzip");
    expect(sniffFormat(zip([{ name: "a.gpx", bytes: bytesOf(gpx(5)) }]))).toBe("zip");
    expect(sniffFormat(bytesOf("hello"))).toBeNull();
  });

  it("names the format of a stored file, inside a .gz too", () => {
    expect(formatOfName("ride.GPX")).toBe("gpx");
    expect(formatOfName("ride.tcx.gz")).toBe("tcx");
    expect(formatOfName("export.zip")).toBe("zip");
    expect(baseName("Morgen.fit.gz")).toBe("Morgen");
  });
});

describe("GPX", () => {
  it("reads position, height, time, pulse and cadence, and works out distance and speed", () => {
    const { fit, format, title } = decodeActivityFile(bytesOf(gpx(600)));
    expect(format).toBe("gpx");
    expect(title).toBe("Østerbro rundt");
    expect(fit.records).toHaveLength(600);
    expect(fit.records[0]).toMatchObject({ hr: 140, cadence: 88, lat: 55.68, lon: 12.5683 });
    // 0.00009° of latitude a second is about 10 m/s.
    expect(fit.records[300]!.speed).toBeCloseTo(10, 0);
    const summary = summarizeActivity(fit);
    expect(summary.sport).toBe("bike");
    expect(summary.distanceM).toBeGreaterThan(5900);
    expect(summary.distanceM).toBeLessThan(6100);
    expect(summary.movingSeconds).toBeGreaterThan(590);
    expect(summary.avgHr).toBe(140);
    expect(summary.streams.lat[0]).toBeCloseTo(55.68, 3);
  });

  it("reads power where the exporter wrote it, and gives a load from it", () => {
    const values = activityFromFit(bytesOf(gpx(1800, { power: true })), rider);
    expect(values).toMatchObject({ format: "gpx", avgPower: 210, loadMethod: "power" });
  });

  it("takes a run for what it is", () => {
    expect(
      summarizeActivity(decodeActivityFile(bytesOf(gpx(60, { type: "running" }))).fit).sport,
    ).toBe("other");
  });

  it("takes Strava's numbers for a run and a hike, and a Danish or German word, for what they are", () => {
    const sportOf = (type: string) =>
      summarizeActivity(decodeActivityFile(bytesOf(gpx(60, { type }))).fit).sport;
    for (const type of ["9", "4", " 9 ", "Løb", "Gåtur", "Lauf", "Wanderung"])
      expect(sportOf(type), type).toBe("other");
    // Strava's other numbers are not documented: the archive's list says what those were.
    for (const type of ["1", "cycling", "Radfahrt"]) expect(sportOf(type), type).toBe("bike");
  });

  it("is what the list it came with says, where the file can only guess", () => {
    const walk = bytesOf(gpx(60, { type: "10" }));
    expect(activityFromFit(walk, rider).sport).toBe("bike");
    expect(activityFromFit(walk, rider, "other").sport).toBe("other");
    expect(activityFromFit(bytesOf(gpx(60, { type: "running" })), rider, "bike").sport).toBe(
      "bike",
    );
    // A FIT or TCX file says its own sport, whatever the list says.
    expect(activityFromFit(bytesOf(tcx()), rider, "other").sport).toBe("bike");
    expect(activityFromFit(bytesOf(tcx("Running")), rider, "bike").sport).toBe("other");
  });
});

describe("TCX", () => {
  it("reads the laps, watts, speed and pulse", () => {
    const values = activityFromFit(bytesOf(tcx()), rider);
    expect(values).toMatchObject({ format: "tcx", sport: "bike", avgPower: 210, maxPower: 240 });
    expect(values.laps).toHaveLength(2);
    expect(values.laps[0]).toMatchObject({ startS: 0, avgPower: 180, avgHr: 130, distanceM: 2700 });
    expect(values.laps[1]).toMatchObject({ startS: 300, avgPower: 240, avgHr: 150 });
    expect(values.distanceM).toBeGreaterThan(5300);
  });

  it("takes a run for what it is", () => {
    expect(activityFromFit(bytesOf(tcx("Running")), rider).sport).toBe("other");
  });
});

describe("archives", () => {
  it("reads a gzipped GPX, TCX and FIT", () => {
    expect(decodeActivityFile(gzipSync(bytesOf(gpx(30)))).format).toBe("gpx");
    expect(decodeActivityFile(gzipSync(bytesOf(tcx()))).format).toBe("tcx");
    expect(decodeActivityFile(gzipSync(encodeRide(steadyHour().slice(0, 30)))).format).toBe("fit");
  });

  it("takes the activity out of a zip, stored or deflated, skipping other files", () => {
    const fit = encodeRide(steadyHour().slice(0, 30));
    const exported = zip([
      { name: "readme.txt", bytes: bytesOf("hi") },
      { name: "12345_ACTIVITY.fit", bytes: fit, deflate: true },
    ]);
    expect(decodeActivityFile(exported).format).toBe("fit");
    expect(decodeActivityFile(zip([{ name: "a.gpx", bytes: bytesOf(gpx(30)) }])).format).toBe(
      "gpx",
    );
    expect(
      decodeActivityFile(zip([{ name: "a.tcx.gz", bytes: gzipSync(bytesOf(tcx())) }])).format,
    ).toBe("tcx");
  });
});
