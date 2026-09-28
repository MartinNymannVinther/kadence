import { describe, expect, it } from "vitest";
import { expandPlan, planVsRide } from "@/modules/load/plan-vs-ride";
import type { BikeStructure } from "@/modules/workouts/structure";

/** The plan laid where it was ridden, and every step judged against its target. */

const rider = { ftp: 250, thresholdHr: 180 };
const plan: BikeStructure = {
  kind: "bike",
  steps: [
    { kind: "step", intent: "warmup", seconds: 600, target: { kind: "zone", zone: 2 } },
    {
      kind: "repeat",
      times: 3,
      steps: [
        {
          kind: "step",
          intent: "work",
          seconds: 300,
          target: { kind: "ftp_pct", low: 95, high: 105 },
        },
        { kind: "step", intent: "recover", seconds: 180, target: { kind: "open" } },
      ],
    },
    { kind: "step", intent: "cooldown", seconds: 300, target: { kind: "zone", zone: 1 } },
  ],
};

/** A ride with the plan ridden from `offset` seconds in, at the given work watts, 5-second samples. */
function ride(offset: number, work: number, extraBefore = 0) {
  const total = offset + 600 + 3 * 480 + 300 + 900;
  const t = Array.from({ length: Math.ceil(total / 5) }, (_, i) => i * 5);
  const power = t.map((s) => {
    const p = s - offset;
    if (p < 0 || p >= 600 + 3 * 480 + 300) return 150 + extraBefore;
    if (p < 600) return 160;
    const w = p - 600;
    if (w < 3 * 480) return w % 480 < 300 ? work : 110;
    return 120;
  });
  const hr = power.map((w) => Math.round(90 + w * 0.3));
  return { t, power, hr };
}

describe("the plan against the ride", () => {
  it("unrolls repeats into steps with their start and repetition", () => {
    const steps = expandPlan(plan);
    expect(steps).toHaveLength(1 + 6 + 1);
    expect(steps[1]).toMatchObject({ repetition: 1, of: 3, from: 600, seconds: 300 });
    expect(steps[6]).toMatchObject({ repetition: 3, of: 3, from: 600 + 2 * 480 + 300 });
  });

  it("finds where in the ride the plan was ridden, and judges each step", () => {
    const result = planVsRide(plan, ride(900, 250), rider)!;
    expect(result.alignedBy).toBe("power");
    expect(Math.abs(result.offset - 900)).toBeLessThanOrEqual(5);
    const work = result.steps.filter((s) => s.intent === "work");
    expect(work.map((s) => s.verdict)).toEqual(["hit", "hit", "hit"]);
    expect(work[0]!.avgWatts).toBe(250);
    expect(work[0]!.watts).toEqual({ low: 238, high: 263 });
    expect(result.steps.find((s) => s.intent === "recover")!.verdict).toBe("none");
    expect(result).toMatchObject({ hit: 5, judged: 5 });
  });

  it("says under and over", () => {
    expect(planVsRide(plan, ride(0, 200), rider)!.steps[1]!.verdict).toBe("under");
    expect(planVsRide(plan, ride(0, 300), rider)!.steps[1]!.verdict).toBe("over");
  });

  it("falls back to pulse without watt, and to the start without either", () => {
    const r = ride(300, 250);
    const byHr = planVsRide(plan, { t: r.t, hr: r.hr }, rider)!;
    expect(byHr.alignedBy).toBe("hr");
    expect(byHr.steps[0]!.bpm).toBeTruthy();
    expect(byHr.steps[0]!.verdict).not.toBe("none");
    const blind = planVsRide(plan, { t: r.t }, rider)!;
    expect(blind).toMatchObject({ alignedBy: "start", offset: 0, judged: 0 });
  });

  it("gives nothing for a plan without steps, or a rider without thresholds", () => {
    expect(planVsRide({ kind: "bike", steps: [] }, ride(0, 250), rider)).toBeNull();
    const none = planVsRide(plan, ride(0, 250), { ftp: null, thresholdHr: null })!;
    expect(none.judged).toBe(0);
  });
});
