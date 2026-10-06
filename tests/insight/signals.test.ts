import { describe, expect, it } from "vitest";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import {
  ATTENTION_ID,
  BADGES_SHOWN,
  attentionAnchor,
  flagWeekHref,
  riderSignals,
  teamSignals,
} from "@/components/insight/signals";
import { FLAG_KINDS, type Flag } from "@/modules/load";

/**
 * The team's week as the place for signals (ADR 0062), without React: a
 * rider's open flags become badges — one per kind, the most serious
 * first, three at most and the rest counted — that lead to the rider's
 * entry in the attention list, and every flag leads to the rider's
 * calendar for the week it is about.
 */

const flag = (kind: Flag["kind"], severity: Flag["severity"]): Flag => ({
  kind,
  severity,
  values: {},
});

const insight = (riderId: string, flags: Flag[]) => ({
  riderId,
  flags,
  week: { monday: "2026-11-02" },
});

describe("flag badges", () => {
  it("keep the guardrails' order and give one badge per kind", () => {
    const signals = riderSignals(
      insight("r1", [
        flag("pain", "alert"),
        flag("strength_spacing", "warn"),
        flag("strength_spacing", "warn"),
        flag("compliance", "info"),
      ]),
    );
    expect(signals?.badges).toEqual([
      { kind: "pain", severity: "alert" },
      { kind: "strength_spacing", severity: "warn" },
      { kind: "compliance", severity: "info" },
    ]);
    expect(signals?.more).toBe(0);
  });

  it("show three and count the rest", () => {
    expect(BADGES_SHOWN).toBe(3);
    const signals = riderSignals(
      insight("r1", [
        flag("wellbeing_help", "alert"),
        flag("pain", "alert"),
        flag("ramp", "warn"),
        flag("sleep_short", "warn"),
        flag("mid_zone", "info"),
      ]),
    );
    expect(signals?.badges.map((b) => b.kind)).toEqual(["wellbeing_help", "pain", "ramp"]);
    expect(signals?.more).toBe(2);
    expect(riderSignals(insight("r1", [flag("ramp", "warn"), flag("pain", "alert")]), 1)).toEqual(
      expect.objectContaining({ badges: [{ kind: "ramp", severity: "warn" }], more: 1 }),
    );
  });

  it("lead to the rider's entry in the list", () => {
    expect(attentionAnchor("r1")).toBe(`${ATTENTION_ID}-r1`);
    expect(ATTENTION_ID).toBe("opmaerksomhed");
    expect(riderSignals(insight("r1", [flag("pain", "warn")]))?.anchor).toBe("#opmaerksomhed-r1");
  });

  it("leave a rider with nothing open out", () => {
    expect(riderSignals(insight("calm", []))).toBeNull();
    const team = teamSignals([insight("calm", []), insight("r2", [flag("ramp", "warn")])]);
    expect(Object.keys(team)).toEqual(["r2"]);
    expect(team.r2?.badges).toEqual([{ kind: "ramp", severity: "warn" }]);
  });

  it("have a short word for every kind, in both languages", () => {
    for (const catalogue of [da, en]) {
      const words = catalogue.insight.badge as Record<string, string>;
      for (const kind of FLAG_KINDS) expect(words[kind], kind).toBeTruthy();
    }
  });
});

describe("a flag's week", () => {
  it("is the rider's own calendar for the week the flag is about", () => {
    expect(flagWeekHref(insight("r1", []))).toBe("/calendar?week=2026-11-02&rider=r1");
  });
});
