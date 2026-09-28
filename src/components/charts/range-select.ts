import { MIN_DRAG_PX } from "./zoom";

/**
 * The gesture that selects a stretch of a chart, as a pure reducer: a
 * press that becomes a band once it has moved sideways far enough — or,
 * short of that, a tap, and two taps make a stretch too, for a finger
 * that cannot drag without scrolling the page. Every rule about which
 * pointer counts lives here and nowhere else, so it is tested alone; the
 * hook around it only reads the DOM and calls back.
 */

export type PointerKind = "mouse" | "pen" | "touch";
export type Press = { id: number; type: PointerKind; x0: number };
export type SelectState = {
  press: Press | null;
  /** px, unordered; only once the press has moved MIN_DRAG_PX. */
  band: readonly [number, number] | null;
  /** px of a start set by a tap, waiting for its end. */
  edge: number | null;
};
export type SelectEvent =
  | { kind: "down"; id: number; type: PointerKind; isPrimary: boolean; button: number; x: number }
  | { kind: "move"; id: number; x: number }
  | { kind: "up"; id: number; x: number }
  /** pointercancel or lostpointercapture: the browser took the gesture. */
  | { kind: "cancel"; id: number }
  /** Enter on the read point. */
  | { kind: "tap"; x: number }
  /** Escape, leaving the mode, a new width or a new window. */
  | { kind: "clear" };
export type SelectResult = { state: SelectState; select?: readonly [number, number] };

export const INITIAL_SELECT: SelectState = { press: null, band: null, edge: null };

/** The click that completed a selection may still arrive as a double-click's second. */
export const SELECT_GRACE_MS = 500;

/**
 * Whether a double-click asks for the whole ride. Never a finger's: a
 * double tap on a phone is two readings, and the phone has "Vis hele
 * turen" and Esc. Never in the mode, whose taps are its own — a fast
 * second tap on one spot would otherwise zoom and reset at once. And
 * never within `SELECT_GRACE_MS` of a selection, which the same click may
 * have completed.
 */
export function doubleClickResets(
  pointer: PointerKind | null,
  armed: boolean,
  sinceSelectMs: number,
): boolean {
  return pointer !== "touch" && !armed && sinceSelectMs > SELECT_GRACE_MS;
}

/** One tap: sets the start, keeps it on the same spot, or completes the stretch. */
export function tapStep(
  edge: number | null,
  x: number,
): { edge: number | null; select?: readonly [number, number] } {
  if (edge === null) return { edge: x };
  if (Math.abs(x - edge) < MIN_DRAG_PX) return { edge };
  return { edge: null, select: [edge, x] };
}

/** A finger takes part only while `armed`; a mouse or a pen always does, with its main button. */
export function reduceSelect(state: SelectState, event: SelectEvent, armed: boolean): SelectResult {
  switch (event.kind) {
    case "down": {
      if (!event.isPrimary || state.press) return { state };
      if (event.type === "touch" ? !armed : event.button !== 0) return { state };
      const press = { id: event.id, type: event.type, x0: event.x };
      return { state: { ...state, press, band: null } };
    }
    case "move": {
      const press = state.press;
      if (!press || press.id !== event.id) return { state };
      const band =
        Math.abs(event.x - press.x0) >= MIN_DRAG_PX ? ([press.x0, event.x] as const) : null;
      return { state: { ...state, band } };
    }
    case "up": {
      const press = state.press;
      if (!press || press.id !== event.id) return { state };
      const released = { press: null, band: null };
      if (Math.abs(event.x - press.x0) >= MIN_DRAG_PX)
        return { state: { ...released, edge: null }, select: [press.x0, event.x] };
      if (!armed) return { state: { ...released, edge: state.edge } };
      const step = tapStep(state.edge, event.x);
      return { state: { ...released, edge: step.edge }, select: step.select };
    }
    case "cancel": {
      // A vertical scroll the browser took must not lose a start already set.
      if (state.press?.id !== event.id) return { state };
      return { state: { ...state, press: null, band: null } };
    }
    case "tap": {
      const step = tapStep(state.edge, event.x);
      return { state: { ...state, edge: step.edge }, select: step.select };
    }
    case "clear":
      return { state: INITIAL_SELECT };
  }
}
