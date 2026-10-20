import { pushHistory } from "./pose-edit";
import type { Pose } from "./types";

/**
 * The pose editor's undo (src/components/exercises/editor): every edit
 * keeps the pose before it, a drag keeps one for the whole drag, and an
 * edit that changed nothing — a joint pushed against the edge of the box
 * — keeps none.
 *
 * Pure: a reducer.
 */

export type PoseHistory = { pose: Pose; past: Pose[] };

export type PoseHistoryAction =
  /** One edit: a button, a key, a slider. */
  | { type: "change"; pose: Pose }
  /** A drag begins: the pose before it is kept once. */
  | { type: "begin" }
  /** The drag moves: nothing kept. */
  | { type: "drag"; pose: Pose }
  /** The drag ends: if it moved nothing, the kept pose goes again. */
  | { type: "end" }
  | { type: "undo" };

export function poseHistory(state: PoseHistory, action: PoseHistoryAction): PoseHistory {
  switch (action.type) {
    case "change":
      if (action.pose === state.pose) return state;
      return { pose: action.pose, past: pushHistory(state.past, state.pose) };
    case "begin":
      return { ...state, past: pushHistory(state.past, state.pose) };
    case "drag":
      return action.pose === state.pose ? state : { ...state, pose: action.pose };
    case "end":
      return state.past.at(-1) === state.pose ? { ...state, past: state.past.slice(0, -1) } : state;
    case "undo": {
      const previous = state.past.at(-1);
      return previous ? { pose: previous, past: state.past.slice(0, -1) } : state;
    }
  }
}
