"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * The screen in front of the bike: kept awake while the ride goes on
 * (Screen Wake Lock, taken again when the page comes back into view, as
 * the browser lets go of it whenever it is hidden), and as big as it can
 * be at a press. On a phone, full screen also asks to turn sideways; a
 * browser that will not is fine, the page works upright too.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const acquire = async () => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) void next.release();
        else lock = next;
      } catch {
        // Refused (battery saver, a hidden page): the screen may dim, the ride goes on.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && !stopped) void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}

const onFullscreenChange = (change: () => void) => {
  document.addEventListener("fullscreenchange", change);
  return () => document.removeEventListener("fullscreenchange", change);
};
const no = () => false;

export function useFullscreen(): { on: boolean; toggle: () => void; available: boolean } {
  const on = useSyncExternalStore(
    onFullscreenChange,
    () => document.fullscreenElement !== null,
    no,
  );
  const available = useSyncExternalStore(
    onFullscreenChange,
    () => document.fullscreenEnabled === true,
    no,
  );
  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    void document.documentElement
      .requestFullscreen()
      .then(() => {
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };
        return orientation.lock?.("landscape");
      })
      .catch(() => undefined);
  }, []);
  return { on, toggle, available };
}
