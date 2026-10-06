"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { checkinZone } from "@/modules/load/wellbeing";
import { saveCheckinAction } from "@/modules/wellbeing/actions";
import { CheckinResult } from "./checkin-result";
import { PainChoice } from "./pain-choice";
import { ScaleChoice } from "./scale-choice";

export type CheckinValues = {
  sleepHours: number | null;
  sleepQuality: number | null;
  energy: number | null;
  mood: number | null;
  soreness: number | null;
  stress: number | null;
  pain: number;
  painWhere: string;
  ill: number;
  note: string;
};

const EMPTY: CheckinValues = {
  sleepHours: null,
  sleepQuality: null,
  energy: null,
  mood: null,
  soreness: null,
  stress: null,
  pain: 0,
  painWhere: "",
  ill: 0,
  note: "",
};

const SCALES = ["sleepQuality", "energy", "mood", "soreness", "stress"] as const;

/**
 * "Hvordan har du det?" on the rider's today: sleep, five one-tap scales,
 * ATK's pain steps, ill or not, and a note if there is something to say.
 * Once saved it shows the day's zone and, for yellow and red, what happens
 * next — a conversation, never an alarm. The zone is worked out by the
 * same rule the coach's warnings use (src/modules/load/wellbeing.ts).
 */
export function CheckinCard({
  riderId,
  today,
  initial,
}: {
  riderId: string;
  today: string;
  initial: CheckinValues | null;
}) {
  const t = useTranslations("checkin");
  const { run, pending } = useRun();
  const [saved, setSaved] = useState<CheckinValues | null>(initial);
  const [editing, setEditing] = useState(initial === null);
  const [value, setValue] = useState<CheckinValues>(initial ?? EMPTY);
  const ids = { sleep: useId(), where: useId(), note: useId(), ill: useId() };
  const set = <K extends keyof CheckinValues>(key: K, v: CheckinValues[K]) =>
    setValue((current) => ({ ...current, [key]: v }));
  // One decimal, as the database keeps it; a first press starts from 8 hours.
  const stepSleep = (by: number) =>
    set(
      "sleepHours",
      Math.round(Math.min(16, Math.max(0, (value.sleepHours ?? 8 - by) + by)) * 10) / 10,
    );

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

      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.sleep} className="text-sm font-medium">
          {t("sleep")}
        </label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label={t("less")}
            onClick={() => stepSleep(-0.5)}
          >
            <Minus />
          </Button>
          <Input
            id={ids.sleep}
            type="number"
            inputMode="decimal"
            min={0}
            max={16}
            step={0.1}
            value={value.sleepHours ?? ""}
            placeholder="–"
            className="h-11 w-20 text-center text-base tabular-nums"
            onChange={(e) =>
              set("sleepHours", e.target.value === "" ? null : Number(e.target.value))
            }
          />
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label={t("more")}
            onClick={() => stepSleep(0.5)}
          >
            <Plus />
          </Button>
          <span className="text-meta text-2sm">{t("hours")}</span>
        </div>
      </div>

      {SCALES.map((scale) => (
        <ScaleChoice
          key={scale}
          label={t(`scales.${scale}.label`)}
          low={t(`scales.${scale}.low`)}
          high={t(`scales.${scale}.high`)}
          value={value[scale]}
          onChange={(n) => set(scale, n)}
        />
      ))}

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

      <label
        htmlFor={ids.ill}
        className="border-border has-checked:border-primary has-checked:bg-accent has-focus-visible:outline-ring flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 has-focus-visible:outline-2"
      >
        <input
          id={ids.ill}
          type="checkbox"
          checked={value.ill === 1}
          onChange={(e) => set("ill", e.target.checked ? 1 : 0)}
          className="accent-primary size-5"
        />
        <span className="flex flex-col">
          <span className="text-2sm font-medium">{t("ill")}</span>
          <span className="text-meta text-xs">{t("illHint")}</span>
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.note} className="text-sm font-medium">
          {t("note")}
        </label>
        <Textarea
          id={ids.note}
          value={value.note}
          maxLength={2000}
          rows={2}
          onChange={(e) => set("note", e.target.value)}
        />
        <p className="text-meta text-xs leading-relaxed">{t("noteHint")}</p>
      </div>

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
