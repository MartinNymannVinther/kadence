"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clockText } from "@/components/training/duration";
import type { Thresholds } from "@/modules/load";
import type { Course, SessionTimeline } from "@/modules/rulle";
import { IntervalBar } from "./interval-bar";
import { RideControls } from "./ride-controls";
import { BlockTile, BodyTile, WattTile } from "./ride-tiles";
import { RouteProfile } from "./route-profile";
import type { Beeps } from "./ride/beeps";
import { INTENSITY } from "./ride/engine";
import type { Ride } from "./ride/use-ride";
import { useFullscreen, useWakeLock } from "./ride/use-screen";
import { Sky } from "./scene/sky";
import type { Moment } from "./scene/world";
import type { Devices } from "./use-devices";

const COUNTDOWN = 3;

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
 * pedal stroke; a question before the end; the screen kept awake.
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
}) {
  const t = useTranslations("rulle.ride");
  const endWords = useTranslations("rulle.end");
  const sceneWords = useTranslations("rulle.scene");
  const words = useMemo(
    () => ({
      name: name
        ? sceneWords("chalkName", { name: name.toLocaleUpperCase("da").slice(0, 16) })
        : sceneWords("chalkAnyone"),
      top: sceneWords("chalkTop"),
      cafe: sceneWords("cafe"),
      stand: sceneWords("stand"),
    }),
    [name, sceneWords],
  );
  const [ending, setEnding] = useState(false);
  const [muted, setMuted] = useState(beeps.muted);
  const [count, setCount] = useState(counting ? COUNTDOWN : 0);
  const fullscreen = useFullscreen();
  const live = ride.live;
  const go = useRef(onGo);
  const topRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // How much of the screen the strip and the panel cover: the landscape frames the rest.
  const [cover, setCover] = useState({ top: 0, bottom: 0 });
  const shown = live !== null;
  useWakeLock(true);

  useEffect(() => {
    go.current = onGo;
  });

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
  }, [shown]);

  useEffect(() => {
    if (!counting) return;
    let left = COUNTDOWN;
    beeps.play("count");
    const timer = setInterval(() => {
      left -= 1;
      setCount(left);
      if (left > 0) beeps.play("count");
      else {
        clearInterval(timer);
        go.current();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [counting, beeps]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!live || ending || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const key = event.key.toLowerCase();
      // Space pauses wherever focus is, so it never presses a focused button instead.
      if (key === " ") {
        event.preventDefault();
        if (live.status === "paused") ride.resume();
        else ride.pause();
      } else if (key === "arrowright") ride.skip();
      else if (key === "arrowup") ride.setIntensity(live.intensity + INTENSITY.step);
      else if (key === "arrowdown") ride.setIntensity(live.intensity - INTENSITY.step);
      else if (key === "e") ride.setErg(!live.erg);
      else if (key === "f") fullscreen.toggle();
      else if (key === "m") toggleSound();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function toggleSound() {
    beeps.setMuted(!beeps.muted);
    setMuted(beeps.muted);
  }

  const total = live?.totalSeconds ?? null;
  const connection = devices.trainer?.state ?? null;

  return (
    <div className="bg-background relative h-svh w-full overflow-hidden">
      <div className="absolute inset-0">
        <RideScene
          course={course}
          moment={moment}
          top={cover.top}
          bottom={cover.bottom}
          words={words}
          onSeen={ride.note}
          onSound={(kind) => beeps.play(kind)}
        />
      </div>
      <div className="relative z-10 flex h-full flex-col">
        {live && (
          <div ref={topRef}>
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
            <div className="grid grid-cols-2 gap-3 p-3 sm:px-4 lg:grid-cols-3 lg:gap-4 lg:px-6">
              <WattTile live={live} rider={rider} />
              <BlockTile live={live} />
              <div className="col-span-2 lg:col-span-1">
                <BodyTile live={live} />
              </div>
            </div>
          </div>
        )}
        {/* The road, between the numbers above and the bar below. */}
        <div className="flex-1" />
        {live && (
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

      <Dialog open={ending} onOpenChange={setEnding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{endWords("title")}</DialogTitle>
            <DialogDescription>
              {trial ? endWords("trialBody") : endWords("body")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setEnding(false);
                ride.finish();
              }}
            >
              {endWords("confirm")}
            </Button>
            <Button variant="outline" onClick={() => setEnding(false)}>
              {endWords("cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
