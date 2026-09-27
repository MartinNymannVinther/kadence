"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { durationText } from "@/components/training/duration";
import { rpeText } from "@/components/training/rpe";
import { reopenSessionAction } from "@/modules/training/actions";
import { FeedbackEditor } from "./feedback-editor";

export type DoneActivity = {
  id: string;
  movingSeconds: number;
  distanceM: number | null;
  rpe: number | null;
  feel: number | null;
  note: string;
  load: number | null;
  source: string;
};

/**
 * What was done: time, distance, how hard and how it felt, and the note.
 * The rider or coach may change the feel afterwards — that is when a
 * rider knows — and undo a "done" entered by hand. A file's ride is not
 * undone here; it is the ride.
 */
export function DoneSummary({
  sessionId,
  activity,
  canWrite,
}: {
  sessionId: string;
  activity: DoneActivity;
  canWrite: boolean;
}) {
  const t = useTranslations("session.done");
  const duration = useTranslations("training.duration");
  const rpe = useTranslations("training.rpe");
  const feel = useTranslations("training.feel");
  const { run, pending } = useRun();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <FeedbackEditor activity={activity} onClose={() => setEditing(false)} />;
  }

  const facts: Array<[string, string]> = [
    [t("time"), durationText(activity.movingSeconds / 60, duration)],
  ];
  if (activity.distanceM)
    facts.push([t("distance"), t("km", { km: Math.round(activity.distanceM / 100) / 10 })]);
  facts.push([t("rpe"), activity.rpe ? rpeText(activity.rpe, (k) => rpe(k as "1")) : t("notSaid")]);
  facts.push([t("feel"), activity.feel ? feel(String(activity.feel) as "1") : t("notSaid")]);
  if (activity.load !== null) facts.push([t("load"), String(Math.round(activity.load))]);

  return (
    <div className="bg-success-tint/60 border-border flex flex-col gap-3 rounded-lg border p-4">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-2sm">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-meta">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {activity.note && (
        <p className="text-2sm leading-relaxed whitespace-pre-line">{activity.note}</p>
      )}
      {activity.source !== "manual" && <p className="text-meta text-xs">{t("fromFile")}</p>}
      {canWrite && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-sm:h-11"
            onClick={() => setEditing(true)}
          >
            {t("editFeedback")}
          </Button>
          {activity.source === "manual" && (
            <ConfirmButton
              title={t("undoTitle")}
              body={t("undoBody")}
              confirmLabel={t("undo")}
              variant="ghost"
              disabled={pending}
              onConfirm={() => run(() => reopenSessionAction({ sessionId }))}
            >
              <Undo2 data-icon="inline-start" />
              {t("undo")}
            </ConfirmButton>
          )}
        </div>
      )}
    </div>
  );
}
