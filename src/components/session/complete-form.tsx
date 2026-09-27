"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NumberField } from "@/components/workouts/number-field";
import { completeSessionAction } from "@/modules/training/actions";
import { FeelScale, RpeScale } from "./feedback-scales";

/**
 * "Udført": the session done, by hand. The minutes start at the plan, so
 * a rider who did what was planned presses one button after saying how
 * hard it was. Distance for the bike and a run; a note for the coach.
 */
export function CompleteForm({
  sessionId,
  plannedMinutes,
  sport,
  onDone,
}: {
  sessionId: string;
  plannedMinutes: number;
  sport: string;
  onDone?: () => void;
}) {
  const t = useTranslations("session.complete");
  const { run, pending } = useRun();
  const noteId = useId();
  const [minutes, setMinutes] = useState(plannedMinutes > 0 ? plannedMinutes : 60);
  const [km, setKm] = useState<number | null>(null);
  const [rpe, setRpe] = useState<number | null>(null);
  const [feel, setFeel] = useState<number | null>(null);
  const [note, setNote] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const done = await run(
      () =>
        completeSessionAction({ sessionId, minutes, distanceKm: km, rpe, feel, note: note.trim() }),
      { success: t("saved") },
    );
    if (done) onDone?.();
  }

  return (
    <form onSubmit={submit} className="flex min-w-0 flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <NumberField
          label={t("minutes")}
          value={minutes}
          min={1}
          max={1440}
          suffix="min"
          onChange={(m) => setMinutes(Math.max(1, m))}
        />
        {sport !== "strength" && (
          <NumberField
            label={t("km")}
            value={km}
            max={400}
            suffix="km"
            onChange={setKm}
            onClear={() => setKm(null)}
          />
        )}
      </div>
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
          placeholder={t("notePlaceholder")}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:self-start">
        <Check data-icon="inline-start" />
        {t("submit")}
      </Button>
    </form>
  );
}
