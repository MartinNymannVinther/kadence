"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { clockText } from "@/components/training/duration";
import type { Thresholds } from "@/modules/load";
import type { SessionTimeline } from "@/modules/rulle";
import { EndDialog } from "./end-dialog";
import { IntervalBar } from "./interval-bar";
import { RideControls } from "./ride-controls";
import { BlockTile, BodyTile, WattTile } from "./ride-tiles";
import type { Beeps } from "./ride/beeps";
import { INTENSITY } from "./ride/engine";
import { useCountdown } from "./ride/use-countdown";
import type { Ride } from "./ride/use-ride";
import { useRideKeys } from "./ride/use-ride-keys";
import { useFullscreen, useWakeLock } from "./ride/use-screen";
import type { Devices } from "./use-devices";

/**
 * The session alone (docs/adr/0056): Rulle while the installation has its
 * world off. The strip of controls on top; under it the three numbers,
 * read from the saddle; and the session's bar across the middle of the
 * screen, as large as the screen allows, with the time ridden and the
 * time left under it. The trainer holds each block's watts, the beeps
 * count a block down, and the ride is recorded and saved as with the
 * world. No landscape is drawn, so three.js is never loaded; no sound
 * under the ride, no map, no speed in a corner, no cheat code.
 */
export function SessionScreen({
  title,
  trial,
  timeline,
  rider,
  ride,
  devices,
  beeps,
  counting,
  onGo,
}: {
  title: string;
  trial: boolean;
  timeline: SessionTimeline | null;
  rider: Thresholds | null;
  ride: Ride;
  devices: Devices;
  beeps: Beeps;
  /** The countdown runs, and then `onGo` starts the ride. */
  counting: boolean;
  onGo: () => void;
}) {
  const t = useTranslations("rulle.ride");
  const [ending, setEnding] = useState(false);
  const [muted, setMuted] = useState(beeps.muted);
  const count = useCountdown(counting, beeps, onGo);
  const fullscreen = useFullscreen();
  const live = ride.live;
  const connection = devices.trainer?.state ?? null;
  const total = live?.totalSeconds ?? null;
  useWakeLock(true);

  useRideKeys(live !== null && !ending, {
    " ": () => (live?.status === "paused" ? ride.resume() : ride.pause()),
    arrowright: ride.skip,
    arrowup: () => live && ride.setIntensity(live.intensity + INTENSITY.step),
    arrowdown: () => live && ride.setIntensity(live.intensity - INTENSITY.step),
    e: () => live && ride.setErg(!live.erg),
    f: fullscreen.toggle,
    m: toggleSound,
  });

  function toggleSound() {
    beeps.setMuted(!beeps.muted);
    setMuted(beeps.muted);
  }

  return (
    <div className="bg-background relative flex h-svh w-full flex-col overflow-hidden">
      {live && (
        <RideControls
          title={title}
          live={live}
          blockCount={timeline?.blocks.length ?? 0}
          canErg={Boolean(devices.trainer?.info.erg)}
          connection={connection === "connected" ? null : connection}
          muted={muted}
          fullscreen={fullscreen}
          onReconnect={() => void devices.connectTrainer()}
          onPause={ride.pause}
          onResume={ride.resume}
          onSkip={ride.skip}
          onIntensity={ride.setIntensity}
          onErg={ride.setErg}
          onMute={toggleSound}
          onFullscreen={fullscreen.toggle}
          onEnd={() => setEnding(true)}
        />
      )}

      <div className="mx-auto flex min-h-0 w-full max-w-[110rem] flex-1 flex-col justify-center gap-4 p-3 sm:p-5 lg:gap-6 lg:p-8">
        {live && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5">
            <WattTile live={live} rider={rider} />
            <BlockTile live={live} />
            <div className="col-span-2 lg:col-span-1">
              <BodyTile live={live} />
            </div>
          </div>
        )}
        {(timeline || live) && (
          <section className="border-border bg-card flex flex-col gap-3 rounded-2xl border px-4 pt-4 pb-3 shadow-[var(--surface-shadow)] sm:px-6 lg:px-8 lg:pt-6">
            {timeline && (
              <IntervalBar
                timeline={timeline}
                second={live?.second ?? 0}
                trace={live?.trace}
                ftp={rider?.ftp ?? null}
                className="h-[34vh] min-h-32"
              />
            )}
            {live && (
              <div className="text-ride-label flex justify-between gap-4 font-medium tabular-nums">
                <span>{t("elapsed", { time: clockText(Math.floor(live.ridden)) })}</span>
                {total !== null && (
                  <span>
                    {t("left", { time: clockText(Math.max(0, Math.ceil(total - live.second))) })}
                  </span>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {count > 0 && (
        <div
          role="status"
          className="absolute inset-0 z-20 grid place-items-center bg-[var(--scrim)]"
        >
          <div className="bg-card flex flex-col items-center gap-2 rounded-2xl px-16 py-10 shadow-[var(--dialog-shadow)]">
            <p className="text-ride-label font-medium">{t("countdown")}</p>
            <p className="text-ride-hero leading-none font-semibold tabular-nums">{count}</p>
          </div>
        </div>
      )}

      <EndDialog open={ending} trial={trial} onOpenChange={setEnding} onEnd={ride.finish} />
    </div>
  );
}
