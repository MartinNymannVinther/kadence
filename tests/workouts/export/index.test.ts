import { describe, expect, it } from "vitest";
import { decodeFit } from "@/modules/fit";
import { datedFileBase, dayLabel, exportWorkout, slugify } from "@/modules/workouts/export";
import { threshold } from "./fixtures";

const name = "Tærskel 3×10 min / Z4!";

describe("exporting a workout", () => {
  it("names the file with an ASCII slug and the format's extension", () => {
    expect(exportWorkout("zwo", threshold, {}, name).fileName).toBe("taerskel-3x10-min-z4.zwo");
    expect(slugify("  ---  ")).toBe("workout");
    expect(slugify("Crème brûlée på Øresund")).toBe("creme-brulee-paa-oeresund");
    expect(slugify("x".repeat(100))).toHaveLength(60);
  });

  it("writes each format with its type", () => {
    const zwo = exportWorkout("zwo", threshold, {}, name);
    expect(zwo.mime).toBe("application/xml; charset=utf-8");
    expect(typeof zwo.body).toBe("string");

    const erg = exportWorkout("erg", threshold, { ftp: 250 }, name);
    expect(erg).toMatchObject({ format: "erg", fileName: "taerskel-3x10-min-z4.erg" });
    expect(erg.mime).toBe("text/plain; charset=utf-8");
    expect(erg.body).toContain("FTP = 250");
    expect(erg.body).toContain("FILE NAME = taerskel-3x10-min-z4.erg");

    const mrc = exportWorkout("mrc", threshold, { ftp: 250 }, name);
    expect(mrc.body).toContain("MINUTES PERCENT");

    const fit = exportWorkout("fit", threshold, {}, name, { createdAt: new Date(0) });
    expect(fit.mime).toBe("application/vnd.ant.fit");
    expect(fit.body).toBeInstanceOf(Uint8Array);
    expect(decodeFit(fit.body as Uint8Array).workoutSteps).toHaveLength(5);
  });

  it("writes MRC when ERG is asked for without an FTP", () => {
    for (const ftp of [null, undefined, 0, Number.NaN]) {
      const file = exportWorkout("erg", threshold, { ftp }, name);
      expect(file.format).toBe("mrc");
      expect(file.fileName).toBe("taerskel-3x10-min-z4.mrc");
      expect(file.body).toContain("MINUTES PERCENT");
    }
  });

  it("names a session's files by its day and its place in the day, the device's name by the day first", () => {
    expect(dayLabel("2026-09-29")).toBe("29.09");
    expect(dayLabel("2026-09-29", 2)).toBe("29.09-2");
    expect(datedFileBase("2026-09-29", 1, name)).toBe("2026-09-29-taerskel-3x10-min-z4");
    expect(datedFileBase("2026-09-29", 3, "")).toBe("2026-09-29-3-workout");

    const day = { onDate: "2026-09-29", createdAt: new Date(0) };
    const first = exportWorkout("fit", threshold, {}, "Tærskel", { ...day, serial: 7 });
    expect(first.fileName).toBe("2026-09-29-taerskel.fit");
    const fit = decodeFit(first.body as Uint8Array);
    expect(fit.workout?.name).toBe("29.09 Tærskel");
    expect(fit.serialNumber).toBe(7);

    const second = exportWorkout("fit", threshold, {}, "Tærskel", { ...day, dayIndex: 2 });
    expect(second.fileName).toBe("2026-09-29-2-taerskel.fit");
    expect(decodeFit(second.body as Uint8Array).workout?.name).toBe("29.09-2 Tærskel");
    // A trainer file is named by its day too; what it says inside is the title.
    const zwo = exportWorkout("zwo", threshold, {}, "Tærskel", day);
    expect(zwo.fileName).toBe("2026-09-29-taerskel.zwo");
    expect(zwo.body).toContain("<name>Tærskel</name>");
  });
});
