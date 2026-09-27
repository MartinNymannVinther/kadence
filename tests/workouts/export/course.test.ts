import { describe, expect, it } from "vitest";
import { toErg, toMrc } from "@/modules/workouts/export";
import { mixed, threshold } from "./fixtures";

const data = (text: string) =>
  text
    .split("\r\n")
    .slice(
      text.split("\r\n").indexOf("[COURSE DATA]") + 1,
      text.split("\r\n").indexOf("[END COURSE DATA]"),
    );

describe("an ERG file", () => {
  const erg = toErg(threshold, 250, { fileName: "threshold.erg", description: "Tærskel 3×10" });

  it("has the course header with the FTP and watts", () => {
    expect(erg.split("\r\n").slice(0, 8)).toEqual([
      "[COURSE HEADER]",
      "VERSION = 2",
      "UNITS = ENGLISH",
      "DESCRIPTION = Taerskel 3x10",
      "FILE NAME = threshold.erg",
      "FTP = 250",
      "MINUTES WATTS",
      "[END COURSE HEADER]",
    ]);
    expect(erg.endsWith("[END COURSE DATA]\r\n")).toBe(true);
  });

  it("writes each step as two points, in watts from the FTP", () => {
    expect(data(erg)).toEqual([
      "0.00\t163",
      "10.00\t163",
      "10.00\t245",
      "20.00\t245",
      "20.00\t125",
      "25.00\t125",
      "25.00\t245",
      "35.00\t245",
      "35.00\t125",
      "40.00\t125",
      "40.00\t245",
      "50.00\t245",
      "50.00\t125",
      "55.00\t125",
      "55.00\t125",
      "65.00\t125",
    ]);
  });
});

describe("an MRC file", () => {
  it("writes percent of FTP and no FTP", () => {
    const mrc = toMrc(threshold, { fileName: "threshold.mrc", description: "Threshold" });
    expect(mrc).toContain("MINUTES PERCENT");
    expect(mrc).not.toContain("FTP =");
    expect(data(mrc).slice(0, 6)).toEqual([
      "0.00\t65",
      "10.00\t65",
      "10.00\t98",
      "20.00\t98",
      "20.00\t50",
      "25.00\t50",
    ]);
  });

  it("holds an RPE or open step at the middle of zone 2, and a pulse at its zone's power", () => {
    const mrc = toMrc(mixed, { fileName: "mixed.mrc", description: "Mixed" });
    expect(data(mrc)).toEqual([
      "0.00\t75",
      "20.00\t75",
      "20.00\t65",
      "35.00\t65",
      "35.00\t65",
      "36.00\t65",
      "36.00\t65",
      "41.00\t65",
    ]);
  });
});
