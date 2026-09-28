import { describe, expect, it } from "vitest";
import { opensByItself, resolvedCount, resolvedGroups } from "@/components/insight/resolved-groups";
import type { CheckinRow, RiderRow } from "@/core/db/schema";
import { riderInsight, type InsightResolution } from "@/modules/insight/rider";

/**
 * The trace under the attention list, without React or a database: a
 * rider whose flags are all afklaret goes into it with their name and
 * their wellbeing chip, and the trace opens by itself when a rider in it
 * is in the red zone (ADR 0026).
 */

const TODAY = "2026-12-10"; // a Thursday
const rider = {
  id: "r",
  name: "Lea",
  birthYear: 2010,
  categoryOverride: null,
  shareWellbeing: false,
} as unknown as RiderRow;

const checkin = (onDate: string, over: Partial<CheckinRow> = {}) =>
  ({
    riderId: "r",
    onDate,
    pain: 0,
    ill: 0,
    energy: 4,
    mood: 4,
    sleepHours: 8.5,
    ...over,
  }) as CheckinRow;

/** Every open flag, resolved the way the service would: kind, severity, and the values seen. */
function resolveAll(checks: CheckinRow[]) {
  const first = riderInsight(rider, [], [], checks, TODAY, true);
  const resolutions: InsightResolution[] = first.flags.map((f) => ({
    id: f.kind,
    kind: f.kind,
    severity: f.severity,
    seen: [f.values],
  }));
  const second = riderInsight(rider, [], [], checks, TODAY, true, [], resolutions);
  return { first, second };
}

describe("the trace of resolved flags", () => {
  it("groups a rider's resolved flags under their name and chip", () => {
    const { first, second } = resolveAll([checkin(TODAY, { pain: 3 })]);
    expect(first.wellbeing?.action).toBe("help");
    expect(first.flags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "pain", severity: "alert" }),
        expect.objectContaining({ kind: "wellbeing_help", severity: "alert" }),
      ]),
    );
    expect(second.flags).toEqual([]);
    expect(second.resolved).toHaveLength(first.flags.length);

    const groups = resolvedGroups([second], () => "U19 1. år");
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ riderId: "r", riderName: "Lea", klass: "U19 1. år" });
    expect(groups[0]!.wellbeing?.action).toBe("help");
    expect(groups[0]!.items).toHaveLength(first.flags.length);
    expect(groups[0]!.items.map((i) => i.resolutionId)).toEqual(first.flags.map((f) => f.kind));
    expect(resolvedCount(groups)).toBe(first.flags.length);
    expect(opensByItself(groups)).toBe(true);
  });

  it("on the rider's own page the name and chip are the card's", () => {
    const { second } = resolveAll([checkin(TODAY, { pain: 3 })]);
    const groups = resolvedGroups([second], () => "x", { named: false });
    expect(groups).toHaveLength(1);
    expect(groups[0]!.riderName).toBeNull();
    expect(groups[0]!.wellbeing).toBeNull();
    expect(groups[0]!.items.length).toBeGreaterThan(0);
    expect(opensByItself(groups)).toBe(false);
  });

  it("a rider with nothing resolved is not in the trace, and a talk is not an alarm", () => {
    const { first } = resolveAll([checkin(TODAY, { pain: 3 })]);
    expect(resolvedGroups([first], () => "x")).toEqual([]);
    expect(resolvedCount([])).toBe(0);

    const talk = resolveAll([checkin(TODAY, { pain: 2 })]);
    expect(talk.first.wellbeing?.action).toBe("talk");
    expect(talk.first.flags.map((f) => f.kind)).toContain("wellbeing_talk");
    const groups = resolvedGroups([talk.second], () => "x");
    expect(groups[0]!.wellbeing?.action).toBe("talk");
    expect(opensByItself(groups)).toBe(false);
  });
});
