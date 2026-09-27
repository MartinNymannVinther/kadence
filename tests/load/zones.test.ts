import { describe, expect, it } from "vitest";
import { targetRange, timeInZones, zoneForHr, zoneForPower } from "@/modules/load/zones";

describe("the zone a wattage falls in", () => {
  // FTP 200 W makes every watt half a percent.
  it.each([
    [0, 1],
    [110, 1], // 55 %
    [111, 2], // 55.5 % rounds to 56 %
    [150, 2], // 75 %
    [152, 3], // 76 %
    [180, 3], // 90 %
    [182, 4], // 91 %
    [210, 4], // 105 %
    [212, 5], // 106 %
    [240, 5], // 120 %
    [242, 6], // 121 %
    [300, 6], // 150 %
    [302, 7], // 151 %
    [1200, 7], // far above the top band is still zone 7
  ])("%i W at FTP 200 is zone %i", (watts, zone) => {
    expect(zoneForPower(watts, 200)).toBe(zone);
  });

  it("is unknown without an FTP", () => {
    expect(zoneForPower(200, null)).toBeNull();
    expect(zoneForPower(200, 0)).toBeNull();
  });
});

describe("the zone a pulse falls in", () => {
  // A threshold of 200 bpm makes every beat half a percent.
  it.each([
    [160, 1], // 80 %
    [162, 2], // 81 %
    [178, 2], // 89 %
    [180, 3], // 90 %
    [186, 3], // 93 %
    [188, 4], // 94 %
    [198, 4], // 99 %
    [200, 5], // 100 %
    [204, 5], // 102 %
    [206, 6], // 103 %
    [212, 6], // 106 %
    [214, 7], // 107 %
  ])("%i bpm at threshold 200 is zone %i", (bpm, zone) => {
    expect(zoneForHr(bpm, 200)).toBe(zone);
  });

  it("is unknown without a threshold", () => {
    expect(zoneForHr(150, undefined)).toBeNull();
  });
});

describe("what a target means for a rider", () => {
  const rider = { ftp: 250, thresholdHr: 180 };

  it("reads a zone as watts and beats", () => {
    expect(targetRange({ kind: "zone", zone: 3 }, rider)).toEqual({
      watts: { low: 190, high: 225 },
      bpm: { low: 162, high: 167 },
    });
  });

  it("reads a zone as watts only when only FTP is known", () => {
    expect(targetRange({ kind: "zone", zone: 4 }, { ftp: 300 })).toEqual({
      watts: { low: 273, high: 315 },
    });
  });

  it("reads a share of FTP as watts", () => {
    expect(targetRange({ kind: "ftp_pct", low: 91, high: 100 }, rider)).toEqual({
      watts: { low: 228, high: 250 },
    });
  });

  it("reads a share of threshold heart rate as beats", () => {
    expect(targetRange({ kind: "hr_pct", low: 90, high: 95 }, rider)).toEqual({
      bpm: { low: 162, high: 171 },
    });
  });

  it("keeps an RPE as itself", () => {
    expect(targetRange({ kind: "rpe", value: 7 }, {})).toEqual({ rpe: 7 });
  });

  it("has nothing to show for an open step or a missing threshold", () => {
    expect(targetRange({ kind: "open" }, rider)).toBeNull();
    expect(targetRange({ kind: "zone", zone: 2 }, {})).toBeNull();
    expect(targetRange({ kind: "ftp_pct", low: 90, high: 95 }, { thresholdHr: 180 })).toBeNull();
    expect(targetRange({ kind: "hr_pct", low: 90, high: 95 }, { ftp: 250 })).toBeNull();
  });
});

describe("time in zones", () => {
  it("counts a second of power in its zone, coasting in zone 1 and a gap nowhere", () => {
    const samples = [100, 100, null, 0, 300, 250];
    expect(timeInZones(samples, 200, "power")).toEqual([3, 0, 0, 0, 0, 2, 0]);
  });

  it("counts heart rate against threshold heart rate", () => {
    const samples = [120, 170, 185, 195, 201, 210, 220];
    expect(timeInZones(samples, 200, "hr")).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });

  it("is all zero without a threshold", () => {
    expect(timeInZones([200, 250], null, "power")).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});
