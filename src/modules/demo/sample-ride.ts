import { rideFit } from "./rides";
import { ROUTES } from "./routes";

/**
 * The demo's one long ride: 72 km round Vejle Ådal with five hills, the
 * head unit's lap every 10 km, a coffee stop, and a sprint for a town
 * sign — the ride the activity page is shown on. A preset of `rides.ts`.
 */
export function sampleRideFit(startMs: number): Uint8Array {
  return rideFit(
    {
      route: ROUTES[0]!,
      kind: "race",
      minutes: 130,
      ftp: 235,
      thresholdHr: 176,
      factor: 1,
      seed: 11,
      stopSeconds: 18 * 60,
    },
    startMs,
  );
}
