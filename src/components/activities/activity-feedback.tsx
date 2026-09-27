"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FeedbackEditor } from "@/components/session/feedback-editor";
import type { DoneActivity } from "@/components/session/done-summary";
import { rpeText } from "@/components/training/rpe";

/**
 * How hard it was and how it felt, said about a ride after the fact: the
 * rider knows best once the file is in. RPE is what gives a session
 * without power or pulse its load (ADR 0016).
 */
export function ActivityFeedback({
  activity,
  canWrite,
}: {
  activity: DoneActivity;
  canWrite: boolean;
}) {
  const t = useTranslations("session.done");
  const rpe = useTranslations("training.rpe");
  const feel = useTranslations("training.feel");
  const [editing, setEditing] = useState(false);
  if (editing) return <FeedbackEditor activity={activity} onClose={() => setEditing(false)} />;
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-2sm">
        <dt className="text-meta">{t("rpe")}</dt>
        <dd className="font-medium">
          {activity.rpe ? rpeText(activity.rpe, (k) => rpe(k as "1")) : t("notSaid")}
        </dd>
        <dt className="text-meta">{t("feel")}</dt>
        <dd className="font-medium">
          {activity.feel ? feel(String(activity.feel) as "1") : t("notSaid")}
        </dd>
      </dl>
      {activity.note && (
        <p className="text-2sm leading-relaxed whitespace-pre-line">{activity.note}</p>
      )}
      {canWrite && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start max-sm:h-11"
          onClick={() => setEditing(true)}
        >
          <Pencil data-icon="inline-start" />
          {t("editFeedback")}
        </Button>
      )}
    </div>
  );
}
