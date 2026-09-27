import { describe, expect, it } from "vitest";
import { decodeFit } from "@/modules/fit";
import { exportWorkout, slugify } from "@/modules/workouts/export";
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
});
