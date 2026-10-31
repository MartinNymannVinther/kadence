import { describe, expect, it } from "vitest";
import { anyFromGarmin, garminAttribution } from "@/modules/devices/attribution";

describe("Garmin's attribution", () => {
  it("names the device after Garmin", () => {
    expect(garminAttribution({ source: "garmin", deviceName: "Edge 1030 Plus" })).toBe(
      "Garmin Edge 1030 Plus",
    );
  });

  it("says Garmin alone when the device is not known", () => {
    expect(garminAttribution({ source: "garmin" })).toBe("Garmin");
    expect(garminAttribution({ source: "garmin", deviceName: "  " })).toBe("Garmin");
  });

  it("does not say Garmin twice", () => {
    expect(garminAttribution({ source: "garmin", deviceName: "Garmin Edge 840" })).toBe(
      "Garmin Edge 840",
    );
  });

  it("keeps control characters and length out of the line", () => {
    const line = garminAttribution({
      source: "garmin",
      deviceName: `Edge\u0007 ${"x".repeat(200)}`,
    });
    expect(line).not.toContain("\u0007");
    expect(line!.length).toBeLessThanOrEqual(87);
  });

  it("is only for rides that came through Garmin's API", () => {
    for (const source of ["fit", "wahoo", "polar", "manual"])
      expect(garminAttribution({ source, deviceName: "Edge 840" })).toBeNull();
  });

  it("tells whether any ride in a set came from Garmin", () => {
    expect(anyFromGarmin([{ source: "fit" }, { source: "garmin" }])).toBe(true);
    expect(anyFromGarmin([{ source: "fit" }, { source: "manual" }])).toBe(false);
    expect(anyFromGarmin([])).toBe(false);
  });
});
