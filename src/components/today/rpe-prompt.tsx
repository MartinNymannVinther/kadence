"use client";

import { useId, useState } from "react";
import { Gauge } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { useStored } from "@/components/common/use-stored";
import { durationText } from "@/components/training/duration";
import { RPE_VALUES, rpeText } from "@/components/training/rpe";
import { Button } from "@/components/ui/button";
import { setFeedbackAction } from "@/modules/training/actions";

export type RideToRate = {
  id: string;
  title: string;
  sport: string;
  /** "I dag", "I går", or the day in words. */
  when: string;
  movingSeconds: number;
  feel: number | null;
  note: string;
};

const LATER = "kadence.rpe.later";
const TILE =
  "border-border bg-card has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground has-focus-visible:outline-ring flex min-h-11 cursor-pointer items-center justify-center rounded-md border text-sm font-semibold tabular-nums has-focus-visible:outline-2";

function putOff(raw: string | null | undefined): string[] {
  try {
    const list: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/**
 * "Hvor hårdt føltes turen?" on Today, right after a ride came in without
 * an answer (docs/adr/0063): the 1–10 scale in one row and a save. It is
 * the same save as the ride's own page (`setFeedbackAction`), and keeps
 * what the rider already said about how it felt and the note. "Ikke nu"
 * puts this ride away on this device; the ride's page still asks.
 */
export function RpePrompt({ ride }: { ride: RideToRate }) {
  const t = useTranslations("today.rpe");
  const words = useTranslations("training.rpe");
  const duration = useTranslations("training.duration");
  const { run, pending } = useRun();
  const name = useId();
  const [rpe, setRpe] = useState<number | null>(null);
  const [later, setLater] = useStored(LATER);

  // Unknown until the browser has said what was put off; the server shows nothing.
  if (later === undefined || putOff(later).includes(ride.id)) return null;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (rpe === null) return;
    await run(
      () => setFeedbackAction({ activityId: ride.id, rpe, feel: ride.feel, note: ride.note }),
      { success: t("saved") },
    );
  }

  const title = ride.title
    ? t("named", { sport: ride.sport === "bike" ? "bike" : "other", title: ride.title })
    : t("unnamed", { sport: ride.sport === "bike" ? "bike" : "other" });

  return (
    <section
      aria-labelledby={`${name}-title`}
      className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-surface"
    >
      <div className="flex items-start gap-3">
        <Gauge aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={`${name}-title`} className="text-base leading-snug font-semibold">
            {title}
          </h2>
          <p className="text-meta text-2sm first-letter:uppercase">
            {ride.when} · {durationText(ride.movingSeconds / 60, duration)}
          </p>
        </div>
      </div>
      <form onSubmit={save} className="flex flex-col gap-3">
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="sr-only">{t("scale")}</legend>
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {RPE_VALUES.map((n) => (
              <label key={n} className={TILE}>
                <input
                  type="radio"
                  name={name}
                  value={n}
                  checked={rpe === n}
                  onChange={() => setRpe(n)}
                  className="sr-only"
                />
                {n}
              </label>
            ))}
          </div>
          <p aria-live="polite" className="text-meta text-xs leading-relaxed">
            {rpe === null ? t("hint") : rpeText(rpe, (k) => words(k as "1"))}
          </p>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending || rpe === null} className="max-sm:h-11">
            {t("save")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="max-sm:h-11"
            onClick={() => setLater(JSON.stringify([...putOff(later), ride.id].slice(-50)))}
          >
            {t("later")}
          </Button>
        </div>
      </form>
    </section>
  );
}
