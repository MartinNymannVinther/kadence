"use client";

import { ArrowLeft, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { SessionTimeline } from "@/modules/rulle";
import type { KeptRide } from "../ride/ride-store";
import type { useCourse } from "../use-course";
import type { Devices } from "../use-devices";
import type { Picked } from "./choices";
import { DeviceCard } from "./device-card";
import { KeptBanner } from "./kept-banner";
import { RouteCard } from "./route-card";
import { SessionCard } from "./session-card";

/**
 * Before the ride, on the page rather than the big screen: the session,
 * the trainer and the route, each in its card, and one Start. The route is
 * ready by itself and the session was chosen by the coach, so for most
 * rides the only thing to do here is to connect the trainer; a rider with
 * nothing planned chooses a session and a route (ADR 0035).
 */
export function ReadyScreen({
  picked,
  choices,
  timeline,
  today,
  trial,
  noFtp,
  missing,
  devices,
  course,
  kept,
  onChoose,
  onStart,
  onSaveKept,
  onDiscardKept,
}: {
  picked: Picked | null;
  choices: { today: Picked[]; team: Picked[]; dcu: Picked[] };
  timeline: SessionTimeline | null;
  today: string;
  trial: boolean;
  noFtp: boolean;
  missing: boolean;
  devices: Devices;
  course: ReturnType<typeof useCourse>;
  kept: KeptRide | null;
  onChoose: (id: string | null) => void;
  onStart: () => void;
  onSaveKept: () => void;
  onDiscardKept: () => void;
}) {
  const t = useTranslations("rulle");
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pt-6 sm:px-7 lg:pt-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-meta text-reading">{t("tagline")}</p>
        </div>
        <Link
          href="/today"
          className="focus-ring text-primary flex min-h-11 items-center gap-1.5 text-sm font-medium hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {t("back")}
        </Link>
      </header>

      {kept && <KeptBanner kept={kept} onSave={onSaveKept} onDiscard={onDiscardKept} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SessionCard
          picked={picked}
          today={choices.today}
          team={choices.team}
          dcu={choices.dcu}
          timeline={timeline}
          todayDate={today}
          trial={trial}
          noFtp={noFtp}
          missing={missing}
          onChoose={onChoose}
        />
        <div className="flex flex-col gap-6">
          <DeviceCard devices={devices} />
          <RouteCard
            state={course.state}
            route={course.route}
            routes={course.routes}
            onChoose={course.chooseRoute}
            onFile={(file) => void course.loadFile(file)}
          />
        </div>
      </div>

      <div className="bg-background/95 border-border sticky bottom-0 -mx-5 border-t px-5 py-4 sm:-mx-7 sm:px-7">
        <Button
          size="lg"
          className="h-14 w-full text-base sm:w-auto sm:px-12"
          disabled={course.state.status !== "ready" || kept !== null}
          onClick={onStart}
        >
          <Play data-icon="inline-start" />
          {t("start")}
        </Button>
      </div>
    </div>
  );
}
