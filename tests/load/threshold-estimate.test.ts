import { describe, expect, it } from "vitest";
import { addDaysIso } from "@/core/dates";
import {
  estimateThresholds,
  ftpLooksRaised,
  heartRateCandidates,
  type CandidateRide,
  type EstimateInput,
} from "@/modules/load/threshold-estimate";
import type { EstimateRide } from "@/modules/load/threshold-shared";

/**
 * Thresholds proposed from the rides (docs/adr/0094), on synthetic
 * riders: clean critical-power data, only 20 minutes, only short efforts,
 * no power meter, a youth rider, too little data — and nothing is
 * proposed that the data does not hold.
 */

const TODAY = "2026-10-12";
const ADULT = 1995;
const YOUTH = 2010;
const NONE = { ftpWatts: null, thresholdHr: null, maxHr: null, restingHr: null };
const SECONDS = [5, 60, 180, 300, 600, 900, 1200, 1800, 3600];

/** A power curve on the two-parameter model, at `share` of the rider's best. */
function curve(cp: number, wPrime: number, share = 1, upTo = 3600): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of SECONDS.filter((s) => s <= upTo)) {
    const model = s >= 120 ? cp + wPrime / s : cp + wPrime / 120 + (120 - s) * 2;
    // Past 20 minutes the hyperbola flatters; an hour is a little under CP.
    out[String(s)] = Math.round((s >= 1800 ? cp * (s === 3600 ? 0.9 : 0.96) : model) * share);
  }
  return out;
}

let n = 0;
function ride(daysAgo: number, extra: Partial<EstimateRide> = {}): EstimateRide {
  n++;
  return {
    id: `r${n}`,
    onDate: addDaysIso(TODAY, -daysAgo),
    title: `Tur ${n}`,
    bestPowers: null,
    hasHeartRate: true,
    heartRate: null,
    ...extra,
  };
}

const input = (rides: EstimateRide[], over: Partial<EstimateInput> = {}): EstimateInput => ({
  rides,
  resting: [],
  birthYear: ADULT,
  today: TODAY,
  current: NONE,
  ...over,
});

/** Six weeks of a trained adult: one all-out ride and five a little under. */
function trainedRides(): EstimateRide[] {
  return [
    ride(5, { bestPowers: curve(280, 18_000), heartRate: { best20Min: 176, heldMax: 192 } }),
    ride(12, { bestPowers: curve(280, 18_000, 0.95), heartRate: { best20Min: 173, heldMax: 189 } }),
    ride(19, { bestPowers: curve(280, 18_000, 0.9), heartRate: { best20Min: 160, heldMax: 180 } }),
    ride(26, { bestPowers: curve(280, 18_000, 0.85) }),
    ride(33, { bestPowers: curve(280, 18_000, 0.8) }),
    ride(40, { bestPowers: curve(280, 18_000, 0.8) }),
  ];
}

describe("FTP from the rides", () => {
  it("comes from critical power when the bests make a good fit", () => {
    const rides = trainedRides();
    const { ftpWatts } = estimateThresholds(input(rides));
    expect(ftpWatts).toMatchObject({
      value: Math.round(280 * 0.97),
      method: "criticalPower",
      windowDays: 90,
      confidence: "high",
      missing: null,
    });
    expect(ftpWatts.sources.map((s) => s.activityId)).toEqual([rides[0]!.id]);
  });

  it("falls back on 95 % of the best 20 minutes when there is no fit", () => {
    const only = (w5: number, w20: number) => ({ "300": w5, "1200": w20 });
    const rides = [0, 7, 14, 21, 28].map((d, i) =>
      ride(d, {
        bestPowers: only(300 - i * 5, 250 - i * 5),
        heartRate: { best20Min: 172, heldMax: 186 },
      }),
    );
    const { ftpWatts } = estimateThresholds(input(rides));
    expect(ftpWatts).toMatchObject({ value: Math.round(250 * 0.95), method: "best20Power" });
    expect(ftpWatts.confidence).toBe("medium");
  });

  it("is never under the best hour the rider actually held", () => {
    const rides = [0, 7, 14].map((d) =>
      ride(d, {
        bestPowers: { "300": 300, "1200": 260, "3600": 255 },
        heartRate: { best20Min: 175, heldMax: 188 },
      }),
    );
    const { ftpWatts } = estimateThresholds(input(rides));
    expect(ftpWatts).toMatchObject({ value: 255, method: "best60Power" });
    expect(ftpWatts.notes).toContain("hourWasHigher");
  });

  it("is not proposed from short efforts only", () => {
    const short = [0, 3, 6, 9].map((d) =>
      ride(d, { bestPowers: { "5": 900, "60": 450, "300": 320, "1200": 200 } }),
    );
    expect(estimateThresholds(input(short)).ftpWatts).toMatchObject({
      value: null,
      missing: "noHardTwentyMinutes",
    });
    const under20 = [0, 3, 6].map((d) =>
      ride(d, { bestPowers: { "5": 900, "300": 320, "600": 290 } }),
    );
    expect(estimateThresholds(input(under20)).ftpWatts.missing).toBe("noHardTwentyMinutes");
  });

  it("is low when the ride's own pulse says the 20 minutes were easy", () => {
    const rides = trainedRides().map((r) => ({
      ...r,
      heartRate: { best20Min: 130, heldMax: 150 },
    }));
    const { ftpWatts } = estimateThresholds(input(rides, { current: { ...NONE, maxHr: 195 } }));
    expect(ftpWatts.confidence).toBe("low");
    expect(ftpWatts.notes).toContain("effortNotHard");
  });

  it("is at most medium when no pulse can confirm the effort", () => {
    const rides = trainedRides().map((r) => ({ ...r, hasHeartRate: false, heartRate: undefined }));
    const { ftpWatts } = estimateThresholds(input(rides));
    expect(ftpWatts).toMatchObject({ method: "criticalPower", confidence: "medium" });
    expect(ftpWatts.notes).toContain("effortUnconfirmed");
  });

  it("widens to the year when 90 days hold too little, one step less sure", () => {
    const rides = trainedRides().map((r, i) => ({ ...r, onDate: addDaysIso(TODAY, -(150 + i)) }));
    const { ftpWatts } = estimateThresholds(input(rides));
    expect(ftpWatts).toMatchObject({ windowDays: 365, confidence: "medium" });
    expect(ftpWatts.notes).toContain("wideWindow");
  });

  it("is low for a youth rider when it needs the whole year", () => {
    const rides = trainedRides().map((r, i) => ({ ...r, onDate: addDaysIso(TODAY, -(150 + i)) }));
    const { ftpWatts } = estimateThresholds(input(rides, { birthYear: YOUTH }));
    expect(ftpWatts).toMatchObject({ windowDays: 365, confidence: "low" });
    expect(ftpWatts.notes).toContain("youthGrows");
  });

  it("keeps a youth rider's last 90 days as they are", () => {
    const { ftpWatts } = estimateThresholds(input(trainedRides(), { birthYear: YOUTH }));
    expect(ftpWatts).toMatchObject({ windowDays: 90, confidence: "high" });
  });
});

describe("the pulse numbers from the rides", () => {
  it("proposes threshold pulse from the hardest 20 minutes and max pulse from the highest held", () => {
    const rides = trainedRides();
    const est = estimateThresholds(input(rides));
    expect(est.thresholdHr).toMatchObject({
      value: Math.round(176 * 0.97),
      method: "best20HeartRate",
      windowDays: 90,
      confidence: "high",
    });
    expect(est.maxHr).toMatchObject({ value: 192, method: "heldMaxHeartRate", windowDays: 365 });
    expect(est.maxHr.confidence).toBe("high"); // 192 and 189: two rides within three beats
    expect(est.maxHr.sources[0]!.activityId).toBe(rides[0]!.id);
  });

  it("works for a rider without a power meter", () => {
    const rides = [0, 4, 8, 12].map((d, i) =>
      ride(d, { heartRate: { best20Min: 170 - i * 4, heldMax: 191 - i } }),
    );
    const est = estimateThresholds(input(rides));
    expect(est.ftpWatts.missing).toBe("noPower");
    expect(est.thresholdHr.value).toBe(Math.round(170 * 0.97));
    expect(est.maxHr).toMatchObject({ value: 191, confidence: "high" });
  });

  it("proposes no threshold pulse from easy rides", () => {
    const rides = [0, 4, 8].map((d) => ride(d, { heartRate: { best20Min: 135, heldMax: 150 } }));
    const est = estimateThresholds(input(rides));
    expect(est.thresholdHr.missing).toBe("noHardHeartRate");
    expect(est.maxHr.missing).toBe("noAllOut");
  });

  it("never proposes a max pulse at or under the one saved", () => {
    const est = estimateThresholds(input(trainedRides(), { current: { ...NONE, maxHr: 195 } }));
    expect(est.maxHr.missing).toBe("notAboveCurrent");
  });

  it("takes the resting pulse only from what was measured", () => {
    const resting = [
      { measuredOn: addDaysIso(TODAY, -2), value: 48 },
      { measuredOn: addDaysIso(TODAY, -9), value: 52 },
      { measuredOn: addDaysIso(TODAY, -16), value: 50 },
    ];
    expect(estimateThresholds(input([], { resting })).restingHr).toMatchObject({
      value: 50,
      method: "measuredRestingHr",
      confidence: "high",
    });
    expect(estimateThresholds(input(trainedRides())).restingHr.missing).toBe("noMeasurement");
  });
});

describe("too little data", () => {
  it("proposes nothing from two rides", () => {
    const rides = trainedRides().slice(0, 2);
    const est = estimateThresholds(input(rides));
    expect(est.ftpWatts).toMatchObject({ value: null, missing: "fewPowerRides" });
    expect(est.thresholdHr).toMatchObject({ value: null, missing: "fewHeartRateRides" });
  });

  it("proposes nothing at all without rides", () => {
    const est = estimateThresholds(input([]));
    expect(Object.values(est).every((e) => e.value === null)).toBe(true);
  });

  it("ignores rides older than a year", () => {
    const rides = trainedRides().map((r) => ({ ...r, onDate: addDaysIso(TODAY, -400) }));
    expect(estimateThresholds(input(rides)).ftpWatts.missing).toBe("noPower");
  });
});

describe("which rides' pulse is read", () => {
  it("is a few per window, never the whole year", () => {
    const rides: CandidateRide[] = Array.from({ length: 250 }, (_, i) => ({
      id: `c${i}`,
      onDate: addDaysIso(TODAY, -Math.floor(i * 1.4)),
      movingSeconds: 3600 + i,
      bestPowers: { "1200": 200 + (i % 37) },
      avgHr: 130 + (i % 23),
      maxHr: 170 + (i % 29),
    }));
    const ids = heartRateCandidates(rides, TODAY);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(18);
  });

  it("skips rides without a pulse", () => {
    const rides: CandidateRide[] = [
      {
        id: "a",
        onDate: TODAY,
        movingSeconds: 3600,
        bestPowers: { "1200": 300 },
        avgHr: null,
        maxHr: null,
      },
    ];
    expect(heartRateCandidates(rides, TODAY)).toEqual([]);
  });
});

describe("a ride that beats the saved FTP", () => {
  it("is told when 95 % of its 20 minutes is more than 5 % above", () => {
    expect(ftpLooksRaised({ "1200": 300 }, 260)).toBe(true);
    expect(ftpLooksRaised({ "1200": 285 }, 260)).toBe(false);
    expect(ftpLooksRaised({ "1200": 300 }, null)).toBe(false);
    expect(ftpLooksRaised(null, 260)).toBe(false);
  });
});
