"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useStored } from "@/components/common/use-stored";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MORE_SCALES, type CheckinAnswers } from "@/modules/wellbeing/prefill";
import { ScaleChoice } from "./scale-choice";

/**
 * Whether "Mere" is open. Open or closed, it stays that way for this rider
 * on this device. It opens by itself when an answer inside starts low or
 * says ill (`look`), so nothing that colours the zone is saved unseen.
 * Held by the card, which puts "Gem" after the answers inside while they
 * are shown and before the closed "Mere" otherwise.
 */
export function useMoreOpen(riderId: string, look: boolean): [boolean, () => void] {
  const [stored, setStored] = useStored(`kadence.checkin.more.${riderId}`);
  const [shown, setShown] = useState(look);
  const open = shown || stored === "open";
  const toggle = () => {
    setShown(false);
    setStored(open ? "closed" : "open");
  };
  return [open, toggle];
}

/**
 * "Mere" in the check-in (backlog P2-11; ADR 0021, amended 2026-10-07):
 * how well the rider slept, mood, legs, calm, ill or not, and a note —
 * behind the three questions asked first. Every answer inside counts in
 * the zone, open or not.
 */
export function CheckinMore({
  open,
  onToggle,
  value,
  onChange,
  from,
  look,
}: {
  /** From `useMoreOpen`. */
  open: boolean;
  onToggle: () => void;
  value: CheckinAnswers;
  onChange: <K extends keyof CheckinAnswers>(key: K, next: CheckinAnswers[K]) => void;
  /** What the answers inside start from: today's own, the last check-in's, or the middle. */
  from: "today" | "last" | "neutral";
  /** An answer inside starts low or says ill. */
  look: boolean;
}) {
  const t = useTranslations("checkin");
  const panel = useId();
  const ids = { ill: useId(), note: useId() };
  const about =
    from === "today"
      ? t("moreQuestions.today")
      : from === "last"
        ? t("moreQuestions.last")
        : t("moreQuestions.neutral");

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={onToggle}
        className="focus-ring border-border bg-card hover:bg-secondary/60 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-[120ms]"
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold">{t("moreQuestions.title")}</span>
          <span className="text-meta text-2sm leading-snug">{about}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn("text-meta size-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      <div id={panel} hidden={!open} className="flex flex-col gap-4">
        {look && from === "last" && (
          <p className="text-2sm leading-relaxed font-medium">{t("moreQuestions.look")}</p>
        )}
        {MORE_SCALES.map((scale) => (
          <ScaleChoice
            key={scale}
            label={t(`scales.${scale}.label`)}
            low={t(`scales.${scale}.low`)}
            high={t(`scales.${scale}.high`)}
            value={value[scale]}
            onChange={(n) => onChange(scale, n)}
          />
        ))}

        <label
          htmlFor={ids.ill}
          className="border-border has-checked:border-primary has-checked:bg-accent has-focus-visible:outline-ring flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 has-focus-visible:outline-2"
        >
          <input
            id={ids.ill}
            type="checkbox"
            checked={value.ill === 1}
            onChange={(e) => onChange("ill", e.target.checked ? 1 : 0)}
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
            onChange={(e) => onChange("note", e.target.value)}
          />
          <p className="text-meta text-xs leading-relaxed">{t("noteHint")}</p>
        </div>
      </div>
    </div>
  );
}
