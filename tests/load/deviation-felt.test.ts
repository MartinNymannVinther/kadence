import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import {
  deviationWords,
  type DeviationT,
  type DurationT,
} from "@/components/training/deviation-text";
import {
  colourOfPct,
  compliance,
  deviation,
  feltFarOff,
  type DeviationPlanned,
  type LoadMethod,
} from "@/modules/load";
import da from "../../messages/da.json";

/**
 * How it felt counts only when it is far off (Martin, 13 October 2026; the
 * amendment to docs/adr/0095): a load from RPE alone decides the colour
 * only under 50 % or over 200 % of the plan's, and the words say how the
 * session felt exactly then. This grid walks loads on both sides of both
 * bounds, on the bike and in the gym, and checks that the colour, the
 * heading, the measured fact and the feeling sentence all agree.
 */

const TODAY = "2026-10-13";
const PAST = "2026-10-10";

const t = createTranslator({ locale: "da", messages: da, namespace: "training.deviation" });
const duration = createTranslator({ locale: "da", messages: da, namespace: "training.duration" });
const lines = (d: ReturnType<typeof deviation>, sport: string) =>
  deviationWords(d, sport, t as unknown as DeviationT, duration as unknown as DurationT, "da")
    ?.lines ?? [];

const plannedMinutes = [0, 30, 60, 90];
const plannedLoads = [null, 0, 40, 80];
const doneMinutes = [0, 10, 30, 45, 59, 60, 75, 100, 150];
// 20 and 80 are 50 % and 200 % of 40; 40 and 160 the same of 80.
const doneLoads = [0, 10, 19, 20, 21, 39, 40, 41, 60, 79, 80, 81, 120, 159, 160, 161, 200];
const sports = ["bike", "strength"] as const;
const methods: LoadMethod[] = ["rpe", "power"];

type Case = [DeviationPlanned, { minutes: number; load: number; method: LoadMethod; rpe: number }];
const cases: Case[] = [];
for (const sport of sports)
  for (const minutes of plannedMinutes)
    for (const load of plannedLoads)
      for (const dm of doneMinutes)
        for (const dl of doneLoads)
          for (const method of methods)
            // Strength has neither watts nor pulse: it is RPE by nature.
            if (sport === "bike" || method === "rpe")
              cases.push([
                { sport, minutes, load },
                { minutes: dm, load: dl, method, rpe: 5 },
              ]);

describe("the feeling, near and far", () => {
  it(`agrees with the colour in all ${cases.length} cases`, () => {
    for (const [planned, done] of cases) {
      const label = JSON.stringify({ planned, done });
      const d = deviation(planned, done, PAST, TODAY);
      expect(d.colour, label).toBe(compliance(planned, done, PAST, TODAY));
      const off = d.colour === "yellow" || d.colour === "red";
      expect(d.heading !== null, label).toBe(off);

      const hasLoad = (planned.load ?? 0) > 0;
      const hasMinutes = planned.minutes > 0;
      if (hasLoad) {
        const pct = Math.round((done.load / planned.load!) * 100);
        // Power always by load; RPE by load only far off, or with no minutes to read instead.
        const byLoad = done.method !== "rpe" || feltFarOff(pct) || !hasMinutes;
        expect(d.measuredBy, label).toBe(byLoad ? "load" : "minutes");
      } else expect(d.measuredBy, label).toBe(hasMinutes ? "minutes" : null);

      if (d.measuredBy) {
        const measured = d.facts.find(
          (f) => f.kind === (d.measuredBy === "load" ? "load" : "time"),
        );
        expect(measured, label).toBeDefined();
        expect(colourOfPct((measured as { changePct: number }).changePct + 100), label).toBe(
          d.colour,
        );
      }

      // How it felt is said exactly when the colour read it.
      if (done.method === "rpe") {
        if (d.measuredBy !== "load") expect(d.story?.ride.effort, label).toBeNull();
        const felt = lines(d, planned.sport!).some((l) => l.includes("føltes"));
        expect(felt, label).toBe(
          d.heading !== null && d.measuredBy === "load" && d.story?.ride.effort !== null,
        );
      }
    }
  });

  it("covers RPE both near and far, low and high", () => {
    const rpe = cases
      .filter(([p, d]) => d.method === "rpe" && (p.load ?? 0) > 0 && p.minutes > 0)
      .map(([p, d]) => Math.round((d.load / p.load!) * 100));
    expect(rpe.some((pct) => pct < 50)).toBe(true);
    expect(rpe.some((pct) => pct === 50)).toBe(true);
    expect(rpe.some((pct) => pct === 200)).toBe(true);
    expect(rpe.some((pct) => pct > 200)).toBe(true);
  });
});
