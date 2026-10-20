import { describe, expect, it } from "vitest";
import {
  AUTO_PAUSE_SECONDS,
  ERG_EASE,
  ErgEase,
  Idle,
  IntensityUsed,
} from "@/components/rulle/ride/hold";

describe("ERG eased when the cadence collapses (docs/adr/0106)", () => {
  it("lets go to a share of the watts after three slow seconds, and holds the block's watts until then", () => {
    const ease = new ErgEase();
    expect(ease.second(40, true)).toBe(false);
    expect(ease.second(40, true)).toBe(false);
    expect(ease.hold(300)).toBe(300);
    expect(ease.second(40, true)).toBe(true);
    expect(ease.eased).toBe(true);
    expect(ease.hold(300)).toBe(Math.round(300 * ERG_EASE.share));
    expect(ease.hold(null)).toBeNull();
  });

  it("holds the watts again once the cadence has been back up for two seconds", () => {
    const ease = new ErgEase();
    for (let i = 0; i < 3; i++) ease.second(30, true);
    expect(ease.eased).toBe(true);
    // 55 is above the collapse but not yet back: the ease stays.
    expect(ease.second(55, true)).toBe(false);
    expect(ease.second(60, true)).toBe(false);
    expect(ease.second(60, true)).toBe(true);
    expect(ease.eased).toBe(false);
  });

  it("leaves a deliberate low-cadence block at 55 rpm alone", () => {
    const ease = new ErgEase();
    for (let i = 0; i < 60; i++) expect(ease.second(55, true)).toBe(false);
    expect(ease.eased).toBe(false);
  });

  it("does nothing without a held target or a measured cadence, and forgets the slow seconds", () => {
    const ease = new ErgEase();
    ease.second(30, true);
    ease.second(30, true);
    expect(ease.second(30, false)).toBe(false);
    expect(ease.second(30, true)).toBe(false);
    expect(ease.second(null, true)).toBe(false);
    expect(ease.eased).toBe(false);
  });

  it("is reset, and says whether it was eased", () => {
    const ease = new ErgEase();
    for (let i = 0; i < 3; i++) ease.second(30, true);
    expect(ease.reset()).toBe(true);
    expect(ease.reset()).toBe(false);
  });
});

describe("legs that stop", () => {
  const seen = { power: true, cadence: true };

  it("pause the ride after three idle seconds, counted from the first", () => {
    const idle = new Idle();
    const still = { power: 0, cadence: 0 };
    expect(idle.stopped(0, still, seen)).toBe(false);
    expect(idle.stopped(1000, still, seen)).toBe(false);
    expect(idle.stopped(AUTO_PAUSE_SECONDS * 1000, still, seen)).toBe(true);
  });

  it("are not idle while anything measures a turn or a watt, and never without a sensor", () => {
    const idle = new Idle();
    expect(idle.stopped(0, { power: 0, cadence: 0 }, seen)).toBe(false);
    expect(idle.stopped(1000, { power: 0, cadence: 5 }, seen)).toBe(false);
    expect(idle.stopped(5000, { power: 0, cadence: 0 }, seen)).toBe(false);
    expect(idle.stopped(9000, { power: 0, cadence: 0 }, { power: false, cadence: false })).toBe(
      false,
    );
  });

  it("go on at thirty watts or a slowly turning crank", () => {
    const idle = new Idle();
    expect(idle.moving({ power: 29, cadence: 19 })).toBe(false);
    expect(idle.moving({ power: 30, cadence: null })).toBe(true);
    expect(idle.moving({ power: null, cadence: 20 })).toBe(true);
  });
});

describe("how hard the session was turned to", () => {
  it("keeps the least and the most, from the whole session", () => {
    const used = new IntensityUsed();
    expect([used.low, used.high]).toEqual([1, 1]);
    used.note(0.9);
    used.note(1.1);
    used.note(0.95);
    expect([used.low, used.high]).toEqual([0.9, 1.1]);
  });
});
