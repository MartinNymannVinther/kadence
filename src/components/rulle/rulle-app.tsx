"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buildTimeline, type Recording, type Seen } from "@/modules/rulle";
import type { RulleSession, RulleStart } from "@/modules/rulle/service";
import { DoneScreen } from "./done-screen";
import { dcuPicks, pickOf, plannedPick, teamPicks } from "./ready/choices";
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
 * The server has chosen the session and the thresholds, and brought the
 * team's library; everything else — the choice of session and route
 * (ADR 0035), Bluetooth, the clock, the recording — lives here, in the
 * browser, and reaches Kadence only as the finished ride's FIT file.
 */
export function RulleApp({
  start,
  today,
  name,
}: {
  start: RulleStart;
  today: string;
  /** The rider's first name, for the chalk on the climb. */
  name: string | null;
}) {
  const t = useTranslations("rulle");
  const locale = useLocale();
  const choices = useMemo(() => {
    const planned = [start.chosen, ...start.today].filter((s): s is RulleSession => s !== null);
    const today = planned
      .filter((s, i) => planned.findIndex((x) => x.id === s.id) === i)
      .map(plannedPick);
    return { today, team: teamPicks(start.library), dcu: dcuPicks(locale) };
  }, [start, locale]);
  const [chosenId, setChosenId] = useState<string | null>(start.chosen?.id ?? null);
  const picked = pickOf(chosenId, [...choices.today, ...choices.team, ...choices.dcu]);
  const session = picked?.session ?? null;
  const riderOf = session?.riderId ?? start.riderId;
  const thresholds = riderOf ? (start.thresholds[riderOf] ?? null) : null;
  const timeline = useMemo(
    () => (picked ? buildTimeline(picked.structure, thresholds ?? {}) : null),
    [picked, thresholds],
  );
  const trial = session ? session.riderId !== start.riderId : start.riderId === null;
  const keepFor = trial ? null : start.riderId;

  const [sensors] = useState(() => new Sensors());
  const [beeps] = useState(() => new Beeps());
  const devices = useDevices(sensors);
  const course = useCourse();
  const courseReady = course.state.status === "ready" ? course.state.course : null;
  const land = course.state.status === "ready" ? course.state.land : null;
  // A city's streets and its race day for a city's route: not for a rider's own file.
  const city =
    course.route.city && course.state.status === "ready" && !course.state.own
      ? course.route.city
      : null;
  // A race's course has its finish, where the lap ends: not a route of the rider's own.
  const finish =
    Boolean(course.route.finish) && course.state.status === "ready" && !course.state.own;
  const [phase, setPhase] = useState<Phase>("ready");
  const [finished, setFinished] = useState<{
    recording: Recording;
    meta: RideMeta;
    trial: boolean;
    seen: Seen | null;
    onTarget: boolean | null;
  } | null>(null);
  // A ride this device kept from before is offered back before a new one can overwrite it.
  const kept = useKeptRide(start.riderId);

  const meta: RideMeta = useMemo(
    () => ({
      sessionId: trial ? null : (session?.id ?? null),
      title: picked?.title ?? (courseReady?.name || t("session.freeTitle")),
      localOffsetSeconds: localOffsetSeconds(),
    }),
    [trial, session, picked, courseReady, t],
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
      const seen = ride.seen();
      const onTarget = engine.allOnTarget();
      if (keepFor) keepRide(keepFor, { meta, recording, state: "finished", seen, onTarget });
      setFinished({ recording, meta, trial, seen, onTarget });
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
        seen={finished.seen}
        onTarget={finished.onTarget}
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
        name={trial ? null : name}
        finish={finish}
        land={land}
        city={city}
      />
    );

  return (
    <ReadyScreen
      picked={picked}
      choices={choices}
      timeline={timeline}
      today={today}
      trial={trial}
      noFtp={Boolean(picked) && !thresholds?.ftp}
      missing={start.missing}
      devices={devices}
      course={course}
      kept={kept}
      onChoose={setChosenId}
      onStart={() => {
        beeps.unlock();
        setPhase("counting");
      }}
      onSaveKept={() => {
        if (!kept) return;
        // Kept until Kadence has it: the done screen forgets it once it is saved.
        setFinished({
          recording: kept.recording,
          meta: kept.meta,
          trial: false,
          seen: kept.seen ?? null,
          onTarget: kept.onTarget ?? null,
        });
        setPhase("done");
      }}
      onDiscardKept={() => {
        if (start.riderId) forgetRide(start.riderId);
      }}
    />
  );
}
