import type { Band, Block, BlockNow, Standing } from "@/modules/rulle";
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
  /** Whether the cheat code is on. */
  cheat: boolean;
  intensity: number;
  erg: boolean;
  /** The watts ridden, one average per TRACE_SECONDS of the plan. */
  trace: readonly (number | null)[];
};
