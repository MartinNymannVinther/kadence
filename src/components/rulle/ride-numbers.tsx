"use client";

import type { Thresholds } from "@/modules/load";
import { CheatPanel } from "./cheat-panel";
import type { CheatMode, Push } from "./ride/cheat";
import type { WattTune } from "./ride/watt-dial";
import type { Live } from "./ride/live";
import { BlockTile, BodyTile, WattTile } from "./ride-tiles";

/**
 * The numbers under the controls: the watts against the target, the time
 * left of the block and the body's numbers — or, while a cheat code is
 * on, the cheat's own in their place (`CheatPanel`), so the screen shows
 * one set of numbers at a time.
 */
export function RideNumbers({
  live,
  rider,
  onCheatOff,
  onCheatMode,
  onCheatTune,
  onCheatPush,
}: {
  live: Live;
  rider: Thresholds | null;
  onCheatOff: () => void;
  onCheatMode: (mode: CheatMode) => void;
  onCheatTune: (change: WattTune) => void;
  onCheatPush: (push: Push) => void;
}) {
  if (live.cheat)
    return (
      <div className="p-3 sm:px-4 lg:px-6">
        <CheatPanel
          state={live.cheat}
          kmh={live.speed * 3.6}
          onOff={onCheatOff}
          onMode={onCheatMode}
          onTune={onCheatTune}
          onPush={onCheatPush}
        />
      </div>
    );
  return (
    <div className="grid grid-cols-2 gap-3 p-3 sm:px-4 lg:grid-cols-3 lg:gap-4 lg:px-6">
      <WattTile live={live} rider={rider} />
      <BlockTile live={live} />
      <div className="col-span-2 lg:col-span-1">
        <BodyTile live={live} />
      </div>
    </div>
  );
}
