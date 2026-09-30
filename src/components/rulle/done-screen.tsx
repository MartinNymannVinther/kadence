"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { CompleteForm } from "@/components/session/complete-form";
import { FeedbackEditor } from "@/components/session/feedback-editor";
import { clockText } from "@/components/training/duration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { littleThings, totals, type Recording, type Seen } from "@/modules/rulle";
import { slugify } from "@/modules/workouts/export";
import { LittleThings } from "./little-things";
import { forgetRide, type RideMeta } from "./ride/ride-store";
import { ended, rideFile, saveRide, type SaveResult } from "./ride/save-ride";

type Status = "saving" | "saved" | "offline" | "failed" | "none";

/** How often a ride that could not be sent is tried again while the page is open. */
const RETRY_MS = 30_000;

/**
 * After the ride: what it came to, and where it went. A ride with
 * something measured is saved at once as a FIT file through Kadence's
 * ordinary import (ADR 0033) and lands on its session; without a
 * connection it waits in the browser and goes when the connection is
 * back. Then the rider says how hard it was — the one thing no sensor
 * knows. A ride with nothing measured is no file: the session is ticked
 * off by hand instead, with the minutes already filled in. A coach's
 * trial is saved nowhere; the file can always be taken along. Below the
 * numbers, the ride's little things (ADR 0034).
 */
export function DoneScreen({
  recording,
  meta,
  trial,
  keepFor,
  seen,
  onTarget,
}: {
  recording: Recording;
  meta: RideMeta;
  trial: boolean;
  keepFor: string | null;
  /** What the landscape showed on the way; null where it showed nothing. */
  seen: Seen | null;
  onTarget: boolean | null;
}) {
  const t = useTranslations("rulle.done");
  const final = useMemo(() => ended(recording), [recording]);
  const sum = useMemo(() => totals(final), [final]);
  const little = useMemo(
    () => littleThings({ rec: final, ascentM: sum.ascentM, seen, allOnTarget: onTarget }),
    [final, sum, seen, onTarget],
  );
  const saves = !trial && sum.measured && keepFor !== null;
  const [status, setStatus] = useState<Status>(saves ? "saving" : "none");
  const [result, setResult] = useState<SaveResult | null>(null);
  const [feedback, setFeedback] = useState<"open" | "given">("open");
  const [completed, setCompleted] = useState(false);
  const started = useRef(false);

  const settle = useCallback(
    (answer: SaveResult) => {
      setResult(answer);
      if (answer.ok) {
        if (keepFor) forgetRide(keepFor);
        setStatus("saved");
      } else setStatus(answer.offline ? "offline" : "failed");
    },
    [keepFor],
  );

  const save = useCallback(() => {
    setStatus("saving");
    void saveRide(final, meta).then(settle);
  }, [final, meta, settle]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // The status starts out saving; the answer sets it.
    if (saves) void saveRide(final, meta).then(settle);
    // Nothing measured is nothing to keep: the session is ticked off by hand, or not at all.
    else if (keepFor) forgetRide(keepFor);
  }, [saves, final, meta, settle, keepFor]);

  useEffect(() => {
    if (status !== "offline") return;
    const retry = () => save();
    window.addEventListener("online", retry);
    const timer = setInterval(retry, RETRY_MS);
    return () => {
      window.removeEventListener("online", retry);
      clearInterval(timer);
    };
  }, [status, save]);

  const download = () => {
    const bytes = rideFile(final, meta);
    const url = URL.createObjectURL(
      new Blob([bytes.slice().buffer], { type: "application/vnd.ant.fit" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(meta.title, "rulle")}.fit`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const facts: [string, string][] = [
    [t("time"), clockText(sum.timerSeconds)],
    ...(sum.avgPower !== null
      ? ([[t("avgPower"), `${sum.avgPower} W`]] as [string, string][])
      : []),
    ...(sum.workKj !== null
      ? ([[t("work"), t("kj", { kj: Math.round(sum.workKj) })]] as [string, string][])
      : []),
    ...(sum.avgHr !== null ? ([[t("avgHr"), String(sum.avgHr)]] as [string, string][]) : []),
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-8 sm:px-7">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label} className="bg-card border-border rounded-xl border p-4">
            <dt className="text-meta text-xs">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <LittleThings things={little} />

      <Card>
        <CardContent className="flex flex-col gap-3">
          {status === "saving" && <p role="status">{t("saving")}</p>}
          {status === "saved" && result?.ok && (
            <div role="status" className="flex flex-col gap-2">
              <p className="font-medium">{result.duplicate ? t("already") : t("saved")}</p>
              <p className="text-2sm text-meta">
                {result.sessionTitle ? t("landed", { title: result.sessionTitle }) : t("unmatched")}
              </p>
              <Link
                href={`/activities/${result.activityId}`}
                className="focus-ring text-primary self-start text-sm font-medium hover:underline"
              >
                {t("open")}
              </Link>
            </div>
          )}
          {(status === "offline" || status === "failed") && (
            <div role="alert" className="flex flex-col gap-2">
              <p className="text-2sm leading-relaxed">
                {status === "offline" ? t("offline") : failure(result, t)}
              </p>
              <Button variant="outline" className="self-start max-sm:h-11" onClick={save}>
                {t("retry")}
              </Button>
            </div>
          )}
          {trial && <p>{t("trial")}</p>}
          {!trial && !sum.measured && meta.sessionId && !completed && (
            <>
              <p className="text-2sm leading-relaxed">{t("unmeasured")}</p>
              <CompleteForm
                sessionId={meta.sessionId}
                plannedMinutes={Math.max(1, Math.round(sum.timerSeconds / 60))}
                sport="bike"
                onDone={() => setCompleted(true)}
              />
            </>
          )}
          {!trial && !sum.measured && (!meta.sessionId || completed) && (
            <p>{completed ? t("thanks") : t("unmeasuredFree")}</p>
          )}
        </CardContent>
      </Card>

      {status === "saved" && result?.ok && (
        <Card>
          <CardHeader>
            <CardTitle>{t("feedback")}</CardTitle>
          </CardHeader>
          <CardContent>
            {feedback === "open" ? (
              <FeedbackEditor
                activity={{
                  id: result.activityId,
                  movingSeconds: sum.timerSeconds,
                  distanceM: sum.distanceM,
                  rpe: null,
                  feel: null,
                  note: "",
                  load: null,
                  source: "fit",
                }}
                onClose={() => setFeedback("given")}
              />
            ) : (
              <p>{t("thanks")}</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {sum.measured && (
          <Button variant="outline" className="max-sm:h-11" onClick={download}>
            <Download data-icon="inline-start" />
            {t("download")}
          </Button>
        )}
        <Link
          href="/today"
          className="focus-ring text-primary flex min-h-11 items-center px-1 text-sm font-medium hover:underline"
        >
          {t("today")}
        </Link>
      </div>
    </div>
  );
}

function failure(result: SaveResult | null, t: (key: string) => string): string {
  const code = result && !result.ok ? result.error : "generic";
  const known = ["invalid", "duplicate", "rateLimited", "not_rider", "notFound", "too_large"];
  return known.includes(code) ? t(`error.${code}`) : t("failed");
}
