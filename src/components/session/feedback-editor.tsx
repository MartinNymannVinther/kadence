"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { setFeedbackAction } from "@/modules/training/actions";
import type { DoneActivity } from "./done-summary";
import { FeelScale, RpeScale } from "./feedback-scales";

/** How hard, how it felt and the note — said again, after the fact. */
export function FeedbackEditor({
  activity,
  onClose,
}: {
  activity: DoneActivity;
  onClose: () => void;
}) {
  const t = useTranslations("session.done");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const noteId = useId();
  const [rpe, setRpe] = useState(activity.rpe);
  const [feel, setFeel] = useState(activity.feel);
  const [note, setNote] = useState(activity.note);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const saved = await run(
      () => setFeedbackAction({ activityId: activity.id, rpe, feel, note: note.trim() }),
      { success: common("saved") },
    );
    if (saved !== null) onClose();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <RpeScale value={rpe} onChange={setRpe} />
      <FeelScale value={feel} onChange={setFeel} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={noteId} className="text-sm font-medium">
          {t("note")}
        </label>
        <Textarea
          id={noteId}
          value={note}
          maxLength={4000}
          rows={2}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} className="max-sm:h-11">
          {common("save")}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="max-sm:h-11">
          {common("cancel")}
        </Button>
      </div>
    </form>
  );
}
