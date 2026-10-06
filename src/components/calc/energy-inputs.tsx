"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { SegmentedChoice } from "@/components/ui/segmented";
import type { Sex } from "@/modules/calc/energy";
import { MAX_MINUTES, MIN_MINUTES } from "@/modules/calc/fuel-check";
import type { Day, Intensity, Next, Session } from "@/modules/calc/fuel-day";
import { CLASS_AGES, RIDER_CLASSES } from "@/modules/calc/reference-rider";
import { cn } from "@/lib/utils";
import { GearSlider } from "./gear-slider";

const span = (from: number, to: number, step: number) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

/** Half an hour to six hours in quarters, and the temperatures a Danish season can bring. */
const MINUTES = span(MIN_MINUTES, MAX_MINUTES, 15);
const CELSIUS = span(-5, 40, 1);
const NEXT: readonly Next[] = ["rest", "hard", "soon"];

const choice =
  "border-border bg-card flex cursor-pointer flex-col gap-0.5 rounded-xl border px-2 py-2 text-center shadow-[var(--surface-shadow)] transition-colors duration-[120ms] ease-out hover:bg-secondary has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring";

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-label text-xs font-medium">{children}</span>;
}

/** "10:00" for 600 minutes, the form a time field speaks whatever the locale. */
const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

function parseTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/**
 * What the day is: a race or training (and how hard), when it starts,
 * the rider's class
 * and sex — in place of a weight, which riders and parents should not
 * have to think of as a number — how long and how warm, whether the
 * stomach is used to much carbohydrate, and what comes next.
 */
export function EnergyInputs({
  day,
  set,
}: {
  day: Day;
  set: <K extends keyof Day>(key: K, value: Day[K]) => void;
}) {
  const t = useTranslations("calculators.energy.setup");
  const classGroup = useId();
  const startId = useId();
  const nextGroup = useId();
  const duration = (m: number) => {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    if (h === 0) return t("durationMinutes", { m: rest });
    return rest === 0 ? t("durationHours", { h }) : t("durationMixed", { h, m: rest });
  };

  return (
    <section
      aria-labelledby="energy-setup"
      className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5 print:hidden"
    >
      <h2 id="energy-setup" className="text-lg font-semibold">
        {t("title")}
      </h2>
      <div className="flex flex-wrap items-end gap-3">
        <SegmentedChoice<Session>
          label={t("session")}
          value={day.session}
          onChange={(s) => set("session", s)}
          options={[
            { value: "race", label: t("race") },
            { value: "training", label: t("training") },
          ]}
        />
        {day.session === "training" && (
          <SegmentedChoice<Intensity>
            label={t("intensity.label")}
            value={day.intensity}
            onChange={(i) => set("intensity", i)}
            options={(["easy", "tempo", "intervals"] as const).map((i) => ({
              value: i,
              label: t(`intensity.${i}`),
            }))}
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={startId}>
          <Label>{t("start")}</Label>
        </label>
        <Input
          id={startId}
          type="time"
          step={900}
          value={day.startMin === null ? "" : hhmm(day.startMin)}
          onChange={(e) => set("startMin", parseTime(e.target.value))}
          className="w-[8.5rem]"
        />
        <p className="text-meta text-xs leading-relaxed">{t("startHint")}</p>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5">
          <Label>{t("class")}</Label>
        </legend>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {RIDER_CLASSES.map((c) => {
            const ages = CLASS_AGES[c];
            return (
              <label key={c} className={choice}>
                <input
                  type="radio"
                  name={classGroup}
                  value={c}
                  checked={day.riderClass === c}
                  onChange={() => set("riderClass", c)}
                  className="sr-only"
                />
                <span className="text-lg leading-none font-semibold">{c}</span>
                <span className="text-2xs opacity-85">
                  {t("ages", { from: ages[0]!, to: ages.at(-1)! })}
                </span>
              </label>
            );
          })}
        </div>
        <p className="text-meta text-xs leading-relaxed">{t("classHint")}</p>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label>{t("sex.label")}</Label>
        <SegmentedChoice<Sex>
          label={t("sex.label")}
          value={day.sex}
          onChange={(s) => set("sex", s)}
          options={(["female", "male"] as const).map((s) => ({ value: s, label: t(`sex.${s}`) }))}
          className="w-fit"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <GearSlider
          label={t("duration")}
          values={MINUTES}
          value={day.minutes}
          onChange={(m) => set("minutes", m)}
          shown={duration}
          spoken={(m) => t("durationSpoken", { m })}
          less={t("shorter")}
          more={t("longer")}
        />
        <GearSlider
          label={t("temperature")}
          values={CELSIUS}
          value={day.celsius}
          onChange={(c) => set("celsius", c)}
          shown={(c) => t("celsiusShown", { c })}
          spoken={(c) => t("celsiusSpoken", { c })}
          less={t("colder")}
          more={t("warmer")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t("gut.label")}</Label>
        <SegmentedChoice<"no" | "yes">
          label={t("gut.label")}
          value={day.gutTrained ? "yes" : "no"}
          onChange={(v) => set("gutTrained", v === "yes")}
          options={[
            { value: "no", label: t("gut.no") },
            { value: "yes", label: t("gut.yes") },
          ]}
          className="w-fit"
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5">
          <Label>{t("next.label")}</Label>
        </legend>
        <div className="grid gap-1.5 sm:grid-cols-3 sm:gap-2">
          {NEXT.map((n) => (
            <label key={n} className={cn(choice, "items-start text-left")}>
              <input
                type="radio"
                name={nextGroup}
                value={n}
                checked={day.next === n}
                onChange={() => set("next", n)}
                className="sr-only"
              />
              <span className="text-2sm font-semibold">{t(`next.${n}.title`)}</span>
              <span className="text-2xs leading-snug opacity-85">{t(`next.${n}.body`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
