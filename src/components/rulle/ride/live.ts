import type { Band, Block, BlockNow, Standing } from "@/modules/rulle";
import type { CheatState } from "./cheat";
import type { RaceLive } from "./race";
import type { SensorsNow } from "./sensors";
import type { Status } from "./engine";

/** What the ride screen draws, a few times a second (`RideEngine.live`). */
export type Live = SensorsNow & {
  status: Status;
  autoPaused: boolean;
  /** Seconds into the plan. */
  second: number;
  /** Seconds ridden, pauses and skips left out. */
  ridden: number;
  totalSeconds: number | null;
  block: BlockNow | null;
  next: Block | null;
  target: number | null;
  band: Band | null;
  standing: Standing;
  /** Where and how fast the rider is shown: what the cheat code or the warp show, not what is recorded. */
  speed: number;
  distance: number;
  /** The cheat code, and on WATT its watts and avatar; null while it is off. */
  cheat: CheatState;
  /** The challenger's race (ADR 0074): on, or just over; null with none. */
  race: RaceLive;
  intensity: number;
  erg: boolean;
  /** The watts ridden, one average per TRACE_SECONDS of the plan. */
  trace: readonly (number | null)[];
};
