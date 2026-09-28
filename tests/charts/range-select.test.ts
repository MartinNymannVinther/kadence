import { describe, expect, it } from "vitest";
import {
  doubleClickResets,
  INITIAL_SELECT,
  reduceSelect,
  SELECT_GRACE_MS,
  tapStep,
  type SelectEvent,
  type SelectState,
} from "@/components/charts/range-select";
import { MIN_DRAG_PX } from "@/components/charts/zoom";

/** The gesture that selects a stretch of the curves, one event at a time. */

type Down = Extract<SelectEvent, { kind: "down" }>;
const down = (x: number, extra: Partial<Down> = {}): SelectEvent => ({
  kind: "down",
  id: 1,
  type: "mouse",
  isPrimary: true,
  button: 0,
  x,
  ...extra,
});
const touch = (x: number, extra: Partial<Down> = {}) => down(x, { type: "touch", ...extra });
const move = (x: number, id = 1): SelectEvent => ({ kind: "move", id, x });
const up = (x: number, id = 1): SelectEvent => ({ kind: "up", id, x });

function run(events: SelectEvent[], armed = false, state: SelectState = INITIAL_SELECT) {
  let select: readonly [number, number] | undefined;
  for (const event of events) {
    const result = reduceSelect(state, event, armed);
    state = result.state;
    if (result.select) select = result.select;
  }
  return { state, select };
}

describe("reduceSelect with a mouse", () => {
  it("treats a move short of the threshold as a click and one at it as a band", () => {
    const short = run([down(100), move(100 + MIN_DRAG_PX - 1)]);
    expect(short.state.band).toBeNull();
    const click = run([down(100), move(100 + MIN_DRAG_PX - 1), up(100 + MIN_DRAG_PX - 1)]);
    expect(click.select).toBeUndefined();
    expect(click.state).toEqual(INITIAL_SELECT);
    const band = run([down(100), move(100 + MIN_DRAG_PX)]);
    expect(band.state.band).toEqual([100, 100 + MIN_DRAG_PX]);
  });

  it("selects the unordered pair on release, right to left too", () => {
    // The band stays in drag order here; SelectionBand and the readout put the edges in order.
    const { state, select } = run([down(200), move(150), up(120)]);
    expect(select).toEqual([200, 120]);
    expect(state.press).toBeNull();
    expect(state.band).toBeNull();
  });

  it("ignores another button, a second pointer, and a press during a press", () => {
    expect(run([down(100, { button: 2 })]).state.press).toBeNull();
    expect(run([down(100, { isPrimary: false })]).state.press).toBeNull();
    expect(run([down(100), down(300, { id: 2 })]).state.press?.x0).toBe(100);
    const other = run([down(100), move(300, 2), up(300, 2)]);
    expect(other.state.press?.x0).toBe(100);
    expect(other.state.band).toBeNull();
    expect(other.select).toBeUndefined();
  });

  it("does nothing on a short release outside the mode", () => {
    const { state, select } = run([down(100), up(103)]);
    expect(select).toBeUndefined();
    expect(state.edge).toBeNull();
  });
});

describe("reduceSelect with a finger", () => {
  it("takes part only while armed", () => {
    expect(run([touch(100)], false).state.press).toBeNull();
    expect(run([touch(100)], true).state.press?.type).toBe("touch");
  });

  it("sets the start with one tap, keeps it on the same spot, and completes with the second", () => {
    const first = run([touch(100), up(103)], true);
    expect(first.state.edge).toBe(103);
    expect(first.select).toBeUndefined();
    const same = run([touch(105), up(108)], true, first.state);
    expect(same.state.edge).toBe(103);
    expect(same.select).toBeUndefined();
    const before = run([touch(40), up(40)], true, first.state);
    expect(before.select).toEqual([103, 40]);
    expect(before.state.edge).toBeNull();
    const after = run([touch(300), up(300)], true, first.state);
    expect(after.select).toEqual([103, 300]);
  });

  it("drags a band while armed, and a drag forgets a set start", () => {
    const start = run([touch(100), up(100)], true).state;
    const { state, select } = run([touch(200), move(260), up(260)], true, start);
    expect(select).toEqual([200, 260]);
    expect(state.edge).toBeNull();
  });

  it("keeps a set start through a cancel and drops everything on clear", () => {
    const start = run([touch(100), up(100)], true).state;
    const cancelled = run([touch(200), move(230), { kind: "cancel", id: 1 }], true, start);
    expect(cancelled.select).toBeUndefined();
    expect(cancelled.state).toEqual({ press: null, band: null, edge: 100 });
    expect(run([{ kind: "cancel", id: 9 }], true, cancelled.state).state).toEqual(cancelled.state);
    expect(run([{ kind: "clear" }], true, cancelled.state).state).toEqual(INITIAL_SELECT);
  });
});

describe("a tap from the keyboard", () => {
  it("steps whether or not the mode is on", () => {
    const first = run([{ kind: "tap", x: 50 }]);
    expect(first.state.edge).toBe(50);
    expect(run([{ kind: "tap", x: 300 }], false, first.state).select).toEqual([50, 300]);
    expect(run([{ kind: "tap", x: 300 }], true, first.state).select).toEqual([50, 300]);
  });

  it("tapStep sets, keeps and completes", () => {
    expect(tapStep(null, 10)).toEqual({ edge: 10 });
    expect(tapStep(10, 10 + MIN_DRAG_PX - 1)).toEqual({ edge: 10 });
    expect(tapStep(10, 100)).toEqual({ edge: null, select: [10, 100] });
    expect(tapStep(100, 10)).toEqual({ edge: null, select: [100, 10] });
  });
});

describe("a double-click", () => {
  const long = SELECT_GRACE_MS + 1;

  it("shows the whole ride from a mouse or a pen outside the mode", () => {
    expect(doubleClickResets("mouse", false, long)).toBe(true);
    expect(doubleClickResets("pen", false, long)).toBe(true);
    expect(doubleClickResets(null, false, long)).toBe(true);
  });

  it("never from a finger: a double tap on a phone is two readings", () => {
    expect(doubleClickResets("touch", false, long)).toBe(false);
    expect(doubleClickResets("touch", true, long)).toBe(false);
  });

  it("never in the mode, and never right after the selection its second click completed", () => {
    expect(doubleClickResets("mouse", true, long)).toBe(false);
    expect(doubleClickResets("mouse", false, SELECT_GRACE_MS)).toBe(false);
    expect(doubleClickResets("mouse", false, 0)).toBe(false);
  });
});
