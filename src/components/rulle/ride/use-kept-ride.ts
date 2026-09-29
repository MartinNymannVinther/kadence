"use client";

import { useMemo, useSyncExternalStore } from "react";
import { keptRaw, onKeptChange, parseKeptRide, type KeptRide } from "./ride-store";

const nothing = () => null;

/**
 * The ride this device keeps for the rider, as it changes: none on the
 * server and until the page has mounted, then whatever the browser holds.
 */
export function useKeptRide(riderId: string | null): KeptRide | null {
  const raw = useSyncExternalStore(
    onKeptChange,
    () => (riderId ? keptRaw(riderId) : null),
    nothing,
  );
  return useMemo(() => parseKeptRide(raw), [raw]);
}
