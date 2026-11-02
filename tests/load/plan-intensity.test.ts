import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import {
  deviationWords,
  type DeviationT,
  type DurationT,
} from "@/components/training/deviation-text";
import {
  deviation,
  planCarriesIntensity,
  planIntensity,
  planIntensityOf,
  plannedLoad,
  type Deviation,
} from "@/modules/load";
import type { BikeStructure, Step, Target } from "@/modules/workouts/structure";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * A plan that says only how long is judged by time, and a pulse off the
 * bike is not weighed against a plan's intensity (the amendment of 14
 * October to docs/adr/0095). Martin ran an easy 31 minutes on "Løbetur 30
 * min" and was told "Mere gas end planlagt … omkring 2 gange så hårdt";
 * the plan said nothing of how hard, and his pulse was compared with the
 * bike's threshold.
 */

const TODAY = "2026-10-14";
const PAST = "2026-10-13";

const step = (target: Target, intent: Step["intent"] = "steady"): Step => ({
  kind: "step",
  intent,
  seconds: 600,
  target,
});
const bike = (...targets: Target[]): BikeStructure => ({
  kind: "bike",
  steps: targets.map((t) => step(t)),
});
const OPEN: Target = { kind: "open" };

function words(d: Deviation, sport: string, locale: "da" | "en" = "da") {
  const messages = locale === "da" ? da : en;
  const t = createTranslator({ locale, messages, namespace: "training.deviation" });
  const duration = createTranslator({ locale, messages, namespace: "training.duration" });
  return deviationWords(
    d,
    sport,
    t as unknown as DeviationT,
    duration as unknown as DurationT,
    locale,
    null,
    { who: "you", thresholdsHref: "/settings/me?forslag=1#thresholds" },
  );
}

describe("whether a plan says how hard", () => {
  it("says nothing with no structure, no steps, or open steps only", () => {
    expect(planCarriesIntensity(null)).toBe(false);
    expect(planCarriesIntensity(undefined)).toBe(false);
    expect(planCarriesIntensity({ kind: "bike", steps: [] })).toBe(false);
    expect(planCarriesIntensity(bike(OPEN, OPEN))).toBe(false);
    expect(
      planCarriesIntensity({
        kind: "bike",
        steps: [{ kind: "repeat", times: 3, steps: [step(OPEN, "work"), step(OPEN, "recover")] }],
      }),
    ).toBe(false);
    expect(planCarriesIntensity({ kind: "other", text: "Løbetur", minutes: 30 })).toBe(false);
  });

  it("says how hard with a zone, a share of FTP, a share of threshold pulse or an RPE", () => {
    expect(planIntensity(bike(OPEN, { kind: "zone", zone: 2 }))).toBe("set");
    expect(planIntensity(bike({ kind: "ftp_pct", low: 88, high: 94 }))).toBe("set");
    expect(planIntensity(bike({ kind: "rpe", value: 7 }))).toBe("set");
    expect(planIntensity(bike({ kind: "hr_pct", low: 70, high: 80 }))).toBe("pulse");
    expect(
      planIntensity(bike({ kind: "zone", zone: 4 }, { kind: "hr_pct", low: 70, high: 80 })),
    ).toBe("pulse");
    expect(
      planIntensity({
        kind: "bike",
        steps: [{ kind: "repeat", times: 4, steps: [step({ kind: "zone", zone: 5 }, "work")] }],
      }),
    ).toBe("set");
    for (const target of [
      { kind: "zone", zone: 2 },
      { kind: "ftp_pct", low: 55, high: 75 },
      { kind: "hr_pct", low: 70, high: 80 },
      { kind: "rpe", value: 4 },
    ] as Target[])
      expect(planCarriesIntensity(bike(target))).toBe(true);
  });

  it("counts a strength session with an exercise as saying how hard, an empty one as time only", () => {
    expect(
      planIntensity({ kind: "strength", warmup: "", exercises: [], progression: [], minutes: 45 }),
    ).toBe("none");
    expect(
      planIntensity({
        kind: "strength",
        warmup: "",
        exercises: [{ name: "Squat", group: "legs", sets: 3, reps: "12", load: "", note: "" }],
        progression: [],
        minutes: 45,
      }),
    ).toBe("set");
  });

  it("reads a stored row, and is undefined when the caller has no structure", () => {
    expect(planIntensityOf({ sport: "other", structure: { text: "", minutes: 30 } })).toBe("none");
    expect(planIntensityOf({ sport: "bike", structure: { steps: [] } })).toBe("none");
    expect(planIntensityOf({ sport: "bike", structure: null })).toBe("none");
    expect(planIntensityOf({ sport: "bike", structure: bike({ kind: "zone", zone: 2 }) })).toBe(
      "set",
    );
    expect(planIntensityOf({ sport: "bike" })).toBeUndefined();
  });
});

describe("Martin's run, 14 October", () => {
  const structure = { kind: "other" as const, text: "", minutes: 30 };
  const planned = {
    sport: "other" as const,
    minutes: 30,
    load: plannedLoad(structure),
    structure,
    intensity: planIntensity(structure),
  };
  const run = { minutes: 31, load: 42, method: "hr" as const, sport: "other" as const };

  it("was 30 planned minutes with a load estimated from them, and twice that by pulse", () => {
    expect(planned.load).toBe(21);
    expect(planned.intensity).toBe("none");
  });

  it("is green, read by time, with nothing to explain", () => {
    const d = deviation(planned, run, PAST, TODAY);
    expect(d.colour).toBe("green");
    expect(d.measuredBy).toBe("minutes");
    expect(d.heading).toBeNull();
    expect(words(d, "other")).toBeNull();
    expect(d.story?.ride.effort).toBeNull();
    expect(d.story?.ride.intensityPct).toBeNull();
    expect(d.story?.whole).toBeNull();
    expect(d.story?.thresholdHint).toBeNull();
  });

  it("was red, 'Mere gas', before the amendment", () => {
    const before = deviation({ ...planned, intensity: undefined }, run, PAST, TODAY);
    expect(before.colour).toBe("red");
    expect(before.heading).toBe("harder");
  });

  it("tells a run far off its minutes by time alone", () => {
    const d = deviation(planned, { ...run, minutes: 12, load: 20 }, PAST, TODAY);
    expect(d.colour).toBe("red");
    expect(d.heading).toBe("shorter");
    const w = words(d, "other");
    expect(w?.heading).toBe("Kortere end planlagt");
    expect(w?.lines).toEqual(["Planen var et træningspas på 30 min.", "Du trænede 12 min."]);
    expect(w?.hint).toBeNull();
    const text = [w?.heading, ...(w?.lines ?? [])].join(" ");
    for (const never of ["gas", "tærskelpuls", "gange", "hårdere", "roligere"])
      expect(text).not.toContain(never);
    expect(words(d, "other", "en")?.lines).toEqual([
      expect.any(String),
      expect.not.stringMatching(/threshold|harder|times/),
    ]);
  });

  it("gives a run at the pulse cap no threshold hint: the thresholds are the bike's", () => {
    const d = deviation(planned, { ...run, minutes: 60, load: 110 }, PAST, TODAY);
    expect(d.colour).toBe("red");
    expect(d.story?.thresholdHint).toBeNull();
  });
});

describe("a plan without intensity on the bike", () => {
  const structure = bike(OPEN, OPEN, OPEN);
  const planned = {
    sport: "bike" as const,
    minutes: 30,
    load: plannedLoad(structure),
    structure,
    intensity: planIntensity(structure),
  };

  it("is judged by time, and its words say no more than time", () => {
    const d = deviation(
      planned,
      { minutes: 50, load: 80, method: "power", sport: "bike" },
      PAST,
      TODAY,
    );
    expect(d.colour).toBe("red");
    expect(d.heading).toBe("longer");
    expect(d.facts.map((f) => f.kind)).toEqual(["time", "noPlanDetail"]);
    const w = words(d, "bike");
    expect(w?.lines.join(" ")).not.toMatch(/FTP|hårdere|gange/);
  });

  it("still gives a bike ride the FTP hint: the ride itself says the FTP is low", () => {
    const d = deviation(
      planned,
      { minutes: 50, load: 105, method: "power", sport: "bike" },
      PAST,
      TODAY,
    );
    expect(d.story?.thresholdHint).toBe("ftp");
  });
});
