"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkinZone } from "@/modules/load/wellbeing";
import { lowBehindMore, type CheckinAnswers, type CheckinStart } from "@/modules/wellbeing/prefill";
import { saveCheckinAction } from "@/modules/wellbeing/actions";
import { CheckinMore } from "./checkin-more";
import { CheckinResult } from "./checkin-result";
import { PainChoice } from "./pain-choice";
import { ScaleChoice } from "./scale-choice";
import { SleepHours } from "./sleep-hours";

export type CheckinValues = CheckinAnswers;

/**
 * "Hvordan har du det?" on the rider's today, in three questions first
 * (backlog P2-11; ADR 0021, amended 2026-10-07): hours of sleep, energy
 * and ATK's pain steps, then "Gem". The rest — how well they slept, mood,
 * legs, calm, ill or not, a note — waits behind "Mere", started from the
 * last check-in (src/modules/wellbeing/prefill.ts), so the saved row is
 * whole and the zone is worked out from every answer, by the same rule the
 * coach's warnings use (src/modules/load/wellbeing.ts). Once saved it
 * shows the day's zone and, for yellow and red, what happens next — a
 * conversation, never an alarm.
 */
export function CheckinCard({
  riderId,
  today,
  initial,
  start,
}: {
  riderId: string;
  today: string;
  /** Today's check-in, when there is one. */
  initial: CheckinValues | null;
  /** Where a new one starts. */
  start: CheckinStart;
}) {
  const t = useTranslations("checkin");
  const { run, pending } = useRun();
  const [saved, setSaved] = useState<CheckinValues | null>(initial);
  const [editing, setEditing] = useState(initial === null);
  const [value, setValue] = useState<CheckinValues>(initial ?? start.answers);
  const [look] = useState(() => lowBehindMore(initial ?? start.answers));
  const ids = { where: useId() };
  const set = <K extends keyof CheckinValues>(key: K, v: CheckinValues[K]) =>
    setValue((current) => ({ ...current, [key]: v }));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const input = { ...value, painWhere: value.pain > 0 ? value.painWhere.trim() : "" };
    const done = await run(() => saveCheckinAction({ riderId, onDate: today, ...input }), {
      success: t("saved"),
    });
    if (done !== null) {
      setSaved(input);
      setEditing(false);
    }
  }

  if (saved && !editing) {
    return (
      <CheckinResult
        zone={checkinZone(saved).zone}
        values={saved}
        onEdit={() => {
          setValue(saved);
          setEditing(true);
        }}
      />
    );
  }

  return (
    <form
      onSubmit={save}
      className="border-border bg-card flex flex-col gap-5 rounded-xl border p-4 shadow-surface sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">{t("title")}</h3>
        <p className="text-meta text-2sm leading-relaxed">{t("body")}</p>
      </div>

      <SleepHours value={value.sleepHours} onChange={(n) => set("sleepHours", n)} />

      <ScaleChoice
        label={t("scales.energy.label")}
        low={t("scales.energy.low")}
        high={t("scales.energy.high")}
        value={value.energy}
        onChange={(n) => set("energy", n)}
      />

      <PainChoice value={value.pain} onChange={(n) => set("pain", n)} />
      {value.pain > 0 && (
        <div className="-mt-2 flex flex-col gap-1.5">
          <label htmlFor={ids.where} className="text-label text-xs font-medium">
            {t("painWhere")}
          </label>
          <Input
            id={ids.where}
            value={value.painWhere}
            maxLength={200}
            placeholder={t("painWherePlaceholder")}
            className="max-sm:h-11"
            onChange={(e) => set("painWhere", e.target.value)}
          />
        </div>
      )}

      <CheckinMore
        riderId={riderId}
        value={value}
        onChange={set}
        from={saved ? "today" : start.from}
        look={look}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {t("save")}
        </Button>
        {saved && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => setEditing(false)}
          >
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
