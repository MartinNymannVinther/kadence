"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { clockText } from "@/components/training/duration";
import type { Thresholds } from "@/modules/load";
import type { City, Course, Land, Rival, SessionTimeline } from "@/modules/rulle";
import { CheatOverlay } from "./cheat-overlay";
import { EndDialog } from "./end-dialog";
import { IntervalBar } from "./interval-bar";
import { RideControls } from "./ride-controls";
import { RouteMap } from "./route-map";
import { RaceBanner } from "./race-banner";
import { RideNumbers } from "./ride-numbers";
import { RouteProfile } from "./route-profile";
import type { Beeps } from "./ride/beeps";
import { INTENSITY } from "./ride/engine";
import { useCheat } from "./ride/use-cheat";
import { useCountdown } from "./ride/use-countdown";
import { useMapShown, useSpeedShown } from "./ride/use-map-shown";
import { useRideKeys } from "./ride/use-ride-keys";
import { DevWarp } from "./dev-warp";
import { RoadCard } from "./road-card";
import { StartCurtain } from "./start-curtain";
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
 * reads, and so the part that is large. Before the first pedal stroke the
 * route and one of the two riders turning for ten seconds, then a
 * countdown (`StartCurtain`); a question before the end; the screen kept awake. On
 * request nothing but the rider and the land (ADR 0045): every number
 * gone, the little map only if it is shown; a tap or I brings them back,
 * and so does a trainer that drops out. And the cheat code (`useCheat`),
 * that hands the bike's speed and line on the road to the rider.
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
  loading,
  onLoaded,
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
  /** Rulle gets ready, ten seconds before the countdown (ADR 0076); then `onLoaded`. */
  loading: boolean;
  onLoaded: () => void;
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
  // Which of the two riders turns at the start while Rulle gets ready: either, by chance.
  const [showcase] = useState<Rival>(() => (Math.random() < 0.5 ? "challenger" : "sprinter"));
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

  // The sound under the ride, while its screen is up (ADR 0045).
  useEffect(() => {
    beeps.listen();
    return () => beeps.hush();
  }, [beeps]);

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

  const cheatState = live?.cheat ?? null;
  const cheating = cheatState !== null;
  const cheat = useCheat(live !== null && !ending, cheatState?.mode ?? null, ride, beeps);
  useRideKeys(live !== null && !ending, {
    " ": () => (live?.status === "paused" ? ride.resume() : ride.pause()),
    // While the cheat is on, the arrows steer the bike and leave the session alone.
    ...(cheating
      ? {}
      : {
          arrowright: ride.skip,
          arrowup: () => live && ride.setIntensity(live.intensity + INTENSITY.step),
          arrowdown: () => live && ride.setIntensity(live.intensity - INTENSITY.step),
        }),
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
          moment={loading ? (now) => ({ ...moment(now), showcase }) : moment}
          top={bare ? 0 : cover.top}
          bottom={bare ? 0 : cover.bottom}
          words={words}
          finish={finish}
          land={land}
          city={city}
          onSeen={ride.note}
          onSound={(kind) => beeps.play(kind)}
          onHear={(heard) => beeps.hear(heard)}
          onRiderTap={cheat.tap}
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
            <RideNumbers
              live={live}
              rider={rider}
              onCheatOff={() => cheat.toggle()}
              onCheatMode={cheat.toggle}
              onCheatTune={ride.tuneCheat}
              onCheatPush={ride.pushCheat}
            />
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
            <div className="bg-card/85 border-border pointer-events-none absolute right-3 bottom-3 w-[min(30vmin,15rem)] rounded-xl border p-1.5 shadow-surface sm:right-4 lg:right-6">
              <RouteMap course={course} distance={live.distance} finish={finish} />
            </div>
          )}
          {/* Only under `next dev`: the way along the route run faster, or backwards. */}
          {live && cheatState && !bare && (
            <CheatOverlay banner={cheat.banner} state={cheatState} onSteer={ride.steerCheat} />
          )}
          {/* An offer waits for an answer, so it shows even with the numbers away. */}
          {live?.race && (!bare || live.race.phase === "offer") && (
            <RaceBanner race={live.race} beeps={beeps} onAnswer={ride.answerRace} />
          )}
          {process.env.NODE_ENV === "development" && live && (
            <DevWarp onWarp={ride.setWarp} onChallenge={ride.summon} hidden={bare} />
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

      <StartCurtain loading={loading} count={count} route={course.name} onLoaded={onLoaded} />

      <EndDialog open={ending} trial={trial} onOpenChange={setEnding} onEnd={ride.finish} />
    </div>
  );
}
