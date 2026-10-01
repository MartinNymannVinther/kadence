"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { clockText } from "@/components/training/duration";
import type { Thresholds } from "@/modules/load";
import type { City, Course, Land, SessionTimeline } from "@/modules/rulle";
import { EndDialog } from "./end-dialog";
import { IntervalBar } from "./interval-bar";
import { RideControls } from "./ride-controls";
import { RouteMap } from "./route-map";
import { BlockTile, BodyTile, WattTile } from "./ride-tiles";
import { RouteProfile } from "./route-profile";
import type { Beeps } from "./ride/beeps";
import { INTENSITY } from "./ride/engine";
import { useCountdown } from "./ride/use-countdown";
import { useMapShown, useSpeedShown } from "./ride/use-map-shown";
import { useRideKeys } from "./ride/use-ride-keys";
import { DevWarp } from "./dev-warp";
import { RoadCard } from "./road-card";
import type { Ride } from "./ride/use-ride";
import { useFullscreen, useWakeLock } from "./ride/use-screen";
import { Sky } from "./scene/sky";
import type { Moment } from "./scene/world";
import type { Devices } from "./use-devices";
import { useSceneWords } from "./use-scene-words";

// three.js is loaded here and nowhere else in Kadence: only a ride needs it.
const RideScene = dynamic(() => import("./scene/ride-scene"), {
  ssr: false,
  loading: () => <Sky />,
});

/**
 * The ride, on a screen two metres from the saddle (ADR 0033): the
 * landscape behind everything, the strip of controls on top, and across
 * the bottom the three numbers and the session's bar — the part a rider
 * reads, and so the part that is large. A countdown before the first
 * pedal stroke; a question before the end; the screen kept awake. On
 * request nothing but the rider and the land (ADR 0045): every number
 * gone, the little map only if it is shown; a tap or I brings them back,
 * and so does a trainer that drops out.
 */
export function RideScreen({
  title,
  trial,
  timeline,
  course,
  rider,
  ride,
  devices,
  beeps,
  counting,
  onGo,
  moment,
  name,
  finish,
  land,
  city,
}: {
  title: string;
  trial: boolean;
  timeline: SessionTimeline | null;
  course: Course;
  rider: Thresholds | null;
  ride: Ride;
  devices: Devices;
  beeps: Beeps;
  /** The countdown runs, and then `onGo` starts the ride. */
  counting: boolean;
  onGo: () => void;
  /** Where the rider is on the course, for the landscape. */
  moment: (now: number) => Moment;
  /** The rider's first name, for the chalk on the climb; null for anyone. */
  name: string | null;
  /** A race's course: its finish, with the arch, where the lap ends. */
  finish: boolean;
  /** The real land round a route that comes with Kadence (ADR 0035). */
  land: Land | null;
  /** A city's course: streets, pavements and blocks, and race day (ADR 0036). */
  city: City | null;
}) {
  const t = useTranslations("rulle.ride");
  const words = useSceneWords(name, city);
  const [ending, setEnding] = useState(false);
  const [muted, setMuted] = useState(beeps.muted);
  // Nothing but the rider and the land: never remembered, a ride starts with its numbers.
  const [bare, setBare] = useState(false);
  const count = useCountdown(counting, beeps, onGo);
  const fullscreen = useFullscreen();
  const [mapShown, toggleMap] = useMapShown();
  const [speedShown, toggleSpeed] = useSpeedShown();
  const live = ride.live;
  const topRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // How much of the screen the strip and the panel cover: the landscape frames the rest.
  const [cover, setCover] = useState({ top: 0, bottom: 0 });
  const shown = live !== null;
  const connection = devices.trainer?.state ?? null;
  useWakeLock(true);

  // A trainer that drops out brings the numbers back: nobody rides on without ERG unawares.
  const dropped = connection === "reconnecting" || connection === "lost";
  if (bare && dropped) setBare(false);

  useEffect(() => {
    const measure = () =>
      setCover({
        top: topRef.current?.offsetHeight ?? 0,
        bottom: panelRef.current?.offsetHeight ?? 0,
      });
    const observer = new ResizeObserver(measure);
    for (const element of [topRef.current, panelRef.current])
      if (element) observer.observe(element);
    return () => observer.disconnect();
  }, [shown, bare]);

  useRideKeys(live !== null && !ending, {
    " ": () => (live?.status === "paused" ? ride.resume() : ride.pause()),
    arrowright: ride.skip,
    arrowup: () => live && ride.setIntensity(live.intensity + INTENSITY.step),
    arrowdown: () => live && ride.setIntensity(live.intensity - INTENSITY.step),
    e: () => live && ride.setErg(!live.erg),
    f: fullscreen.toggle,
    m: toggleSound,
    k: toggleMap,
    h: toggleSpeed,
    i: () => setBare((now) => !now && !dropped),
  });

  function toggleSound() {
    beeps.setMuted(!beeps.muted);
    setMuted(beeps.muted);
  }

  const total = live?.totalSeconds ?? null;

  return (
    <div className="bg-background relative h-svh w-full overflow-hidden">
      <div className="absolute inset-0">
        <RideScene
          course={course}
          moment={moment}
          top={bare ? 0 : cover.top}
          bottom={bare ? 0 : cover.bottom}
          words={words}
          finish={finish}
          land={land}
          city={city}
          onSeen={ride.note}
          onSound={(kind) => beeps.play(kind)}
        />
      </div>
      <div className="relative z-10 flex h-full flex-col">
        {live && !bare && (
          <div ref={topRef}>
            <RideControls
              title={title}
              live={live}
              blockCount={timeline?.blocks.length ?? 0}
              canErg={Boolean(devices.trainer?.info.erg)}
              connection={connection === "connected" ? null : connection}
              muted={muted}
              mapShown={mapShown}
              speedShown={speedShown}
              fullscreen={fullscreen}
              onReconnect={() => void devices.connectTrainer()}
              onPause={ride.pause}
              onResume={ride.resume}
              onSkip={ride.skip}
              onIntensity={ride.setIntensity}
              onErg={ride.setErg}
              onMute={toggleSound}
              onMap={toggleMap}
              onSpeed={toggleSpeed}
              onBare={() => setBare(true)}
              onFullscreen={fullscreen.toggle}
              onEnd={() => setEnding(true)}
            />
            <div className="grid grid-cols-2 gap-3 p-3 sm:px-4 lg:grid-cols-3 lg:gap-4 lg:px-6">
              <WattTile live={live} rider={rider} />
              <BlockTile live={live} />
              <div className="col-span-2 lg:col-span-1">
                <BodyTile live={live} />
              </div>
            </div>
          </div>
        )}
        {/* The road, between the numbers above and the bar below: its percent and speed in one corner, the little map in the other. */}
        <div className="relative flex-1">
          {/* With nothing but the rider and the land, a tap anywhere brings the numbers back. */}
          {live && bare && (
            <button
              type="button"
              aria-label={t("bareBack")}
              className="absolute inset-0 cursor-default"
              onClick={() => setBare(false)}
            />
          )}
          {live && !bare && (
            <RoadCard
              course={course}
              distance={live.distance}
              speed={live.speed}
              speedShown={speedShown}
            />
          )}
          {live && mapShown && (
            <div className="bg-card/85 border-border pointer-events-none absolute right-3 bottom-3 w-[min(30vmin,15rem)] rounded-xl border p-1.5 shadow-[var(--surface-shadow)] sm:right-4 lg:right-6">
              <RouteMap course={course} distance={live.distance} finish={finish} />
            </div>
          )}
          {/* Only under `next dev`: the way along the route run faster, or backwards. */}
          {process.env.NODE_ENV === "development" && live && (
            <DevWarp onWarp={ride.setWarp} hidden={bare} />
          )}
        </div>
        {live && !bare && (
          <div
            ref={panelRef}
            className="bg-card/90 border-border flex flex-col gap-2 border-t px-3 pt-3 pb-2 sm:px-4 lg:px-6 lg:pt-4"
          >
            {timeline ? (
              <IntervalBar
                timeline={timeline}
                second={live.second}
                trace={live.trace}
                ftp={rider?.ftp ?? null}
                className="h-[22vh] min-h-24"
              />
            ) : (
              <RouteProfile
                course={course}
                along={live.distance % course.length}
                lap={Math.floor(live.distance / course.length)}
                className="h-[16vh] min-h-20"
              />
            )}
            <div className="text-ride-label flex justify-between gap-4 font-medium tabular-nums">
              <span>{t("elapsed", { time: clockText(Math.floor(live.ridden)) })}</span>
              {total !== null && (
                <span>
                  {t("left", { time: clockText(Math.max(0, Math.ceil(total - live.second))) })}
                </span>
              )}
            </div>
          </div>
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
