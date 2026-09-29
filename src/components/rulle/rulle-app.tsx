"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { buildTimeline, type BundledRoute, type Recording } from "@/modules/rulle";
import type { RulleSession, RulleStart } from "@/modules/rulle/service";
import { DoneScreen } from "./done-screen";
import { ReadyScreen } from "./ready/ready-screen";
import { Beeps } from "./ride/beeps";
import { forgetRide, keepRide, localOffsetSeconds, type RideMeta } from "./ride/ride-store";
import { Sensors } from "./ride/sensors";
import { useKeptRide } from "./ride/use-kept-ride";
import { useRide } from "./ride/use-ride";
import { RideScreen } from "./ride-screen";
import { useCourse } from "./use-course";
import { useDevices } from "./use-devices";

type Phase = "ready" | "counting" | "riding" | "done";

/**
 * Rulle, from the first screen to the last (ADR 0033): the session and
 * its devices before the ride, the ride itself, and what became of it.
 * The server has chosen the session and the thresholds; everything else —
 * Bluetooth, the route, the clock, the recording — lives here, in the
 * browser, and reaches Kadence only as the finished ride's FIT file.
 */
export function RulleApp({
  start,
  route,
  today,
}: {
  start: RulleStart;
  route: BundledRoute;
  today: string;
}) {
  const t = useTranslations("rulle");
  const sessions = useMemo(() => {
    const all = [start.chosen, ...start.today].filter((s): s is RulleSession => s !== null);
    return all.filter((s, i) => all.findIndex((x) => x.id === s.id) === i);
  }, [start]);
  const [chosenId, setChosenId] = useState<string | null>(start.chosen?.id ?? null);
  const session = sessions.find((s) => s.id === chosenId) ?? null;
  const riderOf = session?.riderId ?? start.riderId;
  const thresholds = riderOf ? (start.thresholds[riderOf] ?? null) : null;
  const timeline = useMemo(
    () => (session ? buildTimeline(session.structure, thresholds ?? {}) : null),
    [session, thresholds],
  );
  const trial = session ? session.riderId !== start.riderId : start.riderId === null;
  const keepFor = trial ? null : start.riderId;

  const [sensors] = useState(() => new Sensors());
  const [beeps] = useState(() => new Beeps());
  const devices = useDevices(sensors);
  const course = useCourse(route);
  const courseReady = course.state.status === "ready" ? course.state.course : null;
  const [phase, setPhase] = useState<Phase>("ready");
  const [finished, setFinished] = useState<{
    recording: Recording;
    meta: RideMeta;
    trial: boolean;
  } | null>(null);
  // A ride this device kept from before is offered back before a new one can overwrite it.
  const kept = useKeptRide(start.riderId);

  const meta: RideMeta = useMemo(
    () => ({
      sessionId: trial ? null : (session?.id ?? null),
      title: session?.title ?? (courseReady?.name || t("session.freeTitle")),
      localOffsetSeconds: localOffsetSeconds(),
    }),
    [trial, session, courseReady, t],
  );

  const ride = useRide({
    timeline,
    course: courseReady,
    sensors,
    trainer: devices.trainer?.link ?? null,
    beeps,
    meta,
    keepFor,
    onFinished: (engine) => {
      const recording = engine.recording;
      if (!recording) return;
      void devices.trainer?.link.release().catch(() => undefined);
      if (keepFor) keepRide(keepFor, { meta, recording, state: "finished" });
      setFinished({ recording, meta, trial });
      setPhase("done");
    },
  });

  if (phase === "done" && finished)
    return (
      <DoneScreen
        recording={finished.recording}
        meta={finished.meta}
        trial={finished.trial}
        keepFor={finished.trial ? null : start.riderId}
      />
    );

  if ((phase === "counting" || phase === "riding") && courseReady)
    return (
      <RideScreen
        title={meta.title}
        trial={trial}
        timeline={timeline}
        course={courseReady}
        rider={thresholds}
        ride={ride}
        devices={devices}
        beeps={beeps}
        counting={phase === "counting"}
        onGo={() => {
          ride.start();
          setPhase("riding");
        }}
        moment={ride.moment}
      />
    );

  return (
    <ReadyScreen
      session={session}
      sessions={sessions}
      timeline={timeline}
      today={today}
      trial={trial}
      noFtp={Boolean(session) && !thresholds?.ftp}
      missing={start.missing}
      devices={devices}
      course={course}
      route={route}
      kept={kept}
      onChoose={setChosenId}
      onStart={() => {
        beeps.unlock();
        setPhase("counting");
      }}
      onSaveKept={() => {
        if (!kept) return;
        // Kept until Kadence has it: the done screen forgets it once it is saved.
        setFinished({ recording: kept.recording, meta: kept.meta, trial: false });
        setPhase("done");
      }}
      onDiscardKept={() => {
        if (start.riderId) forgetRide(start.riderId);
      }}
    />
  );
}
