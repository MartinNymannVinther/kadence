"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkinZone } from "@/modules/load/wellbeing";
import type { KnownPainView } from "@/modules/wellbeing/known-pains";
import { lowBehindMore, type CheckinAnswers, type CheckinStart } from "@/modules/wellbeing/prefill";
import { saveCheckinAction } from "@/modules/wellbeing/actions";
import { CheckinMore, useMoreOpen } from "./checkin-more";
import { CheckinResult } from "./checkin-result";
import { KnownPainTicks } from "./known-pain-ticks";
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
 *
 * The pain question asks what is different (docs/adr/0097): under it the
 * rider's known pains, each "Ryg som det plejer", and a pain ticked so does
 * not colour the day. The result names why a day is yellow or red, and
 * says the coach sees it only in a club.
 *
 * Compact on a phone, so the three answers and "Gem" stand on one screen
 * (the check-in on Today approved with docs/mockups/navigation): the
 * sleep on one line, the pain steps two by two. "Gem" comes straight
 * after the three while "Mere" is closed, with "Mere" under it; while
 * "Mere" is open, "Gem" comes after the answers inside, so they are seen
 * before they are saved.
 */
export function CheckinCard({
  riderId,
  today,
  initial,
  start,
  knownPains,
  club,
}: {
  riderId: string;
  today: string;
  /** Today's check-in, when there is one. */
  initial: CheckinValues | null;
  /** Where a new one starts. */
  start: CheckinStart;
  /** The rider's known pains, offered under the pain question. */
  knownPains: KnownPainView[];
  /** A club, where a coach reads the check-in; not a personal workspace. */
  club: boolean;
}) {
  const t = useTranslations("checkin");
  const { run, pending } = useRun();
  const [saved, setSaved] = useState<CheckinValues | null>(initial);
  const [editing, setEditing] = useState(initial === null);
  const [value, setValue] = useState<CheckinValues>(initial ?? start.answers);
  const [look] = useState(() => lowBehindMore(initial ?? start.answers));
  const [moreOpen, toggleMore] = useMoreOpen(riderId, look);
  const ids = { where: useId() };
  const set = <K extends keyof CheckinValues>(key: K, v: CheckinValues[K]) =>
    setValue((current) => ({ ...current, [key]: v }));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    // A known pain removed since it was ticked is no longer offered, nor sent.
    const usualPains = value.usualPains.filter((p) => knownPains.some((k) => k.id === p.id));
    const input = {
      ...value,
      painWhere: value.pain > 0 ? value.painWhere.trim() : "",
      usualPains,
    };
    const { usualPains: ticked, ...answers } = input;
    const knownPainIds = ticked.map((p) => p.id);
    const done = await run(
      () => saveCheckinAction({ riderId, onDate: today, ...answers, knownPainIds }),
      { success: t("saved") },
    );
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
        club={club}
        onEdit={() => {
          setValue(saved);
          setEditing(true);
        }}
      />
    );
  }

  const actions = (
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
  );

  return (
    <form
      onSubmit={save}
      className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-surface sm:p-5"
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
      <KnownPainTicks
        pains={knownPains}
        value={value.usualPains}
        pain={value.pain}
        onChange={(v) => set("usualPains", v)}
      />

      {/* "Gem" stands before a closed "Mere" and after an open one's
          answers. "Mere" itself never moves in the page's order, so it
          keeps focus when it is pressed. */}
      {!moreOpen && actions}
      <CheckinMore
        open={moreOpen}
        onToggle={toggleMore}
        value={value}
        onChange={set}
        from={saved ? "today" : start.from}
        look={look}
      />
      {moreOpen && actions}
    </form>
  );
}
