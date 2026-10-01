"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { SegmentedChoice } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import { BuildWithAi } from "@/components/assist/build-with-ai";
import { SportIcon } from "@/components/training/sport-icon";
import { NumberField } from "./number-field";
import { SPORTS, type SessionDraft, type Sport } from "./session-draft";
import { StructureBuilder } from "./structure-builder";

/**
 * The whole of a session or template as a form: a title, the sport, the
 * builder for that sport and a word to the rider. Used by the calendar's
 * "Tilføj pas" and by the library's own editor, so a session is written
 * the same way wherever it is written. A coach also gets "Byg med AI"
 * above the builder (ADR 0038).
 */
export function SessionFields({
  draft,
  onChange,
  showKm = false,
  assist = false,
  assistOpen = false,
}: {
  draft: SessionDraft;
  onChange: (draft: SessionDraft) => void;
  /** Planned distance, for a session in the calendar; templates have none. */
  showKm?: boolean;
  /** "Byg med AI": a coach's, as building is. */
  assist?: boolean;
  /** Open on arrival, for "Byg med AI" from the library's top. */
  assistOpen?: boolean;
}) {
  const t = useTranslations("workouts.fields");
  const sports = useTranslations("training.sport");
  const titleId = useId();
  const descriptionId = useId();
  const set = <K extends keyof SessionDraft>(key: K, value: SessionDraft[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={titleId} className="text-sm font-medium">
          {t("title")}
        </label>
        <Input
          id={titleId}
          value={draft.title}
          maxLength={120}
          required
          placeholder={t("titlePlaceholder")}
          className="max-sm:h-11"
          onChange={(e) => set("title", e.target.value)}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-sm font-medium">{t("sport")}</span>
        <SegmentedChoice<Sport>
          label={t("sport")}
          value={draft.sport}
          onChange={(sport) => set("sport", sport)}
          className="self-start [&>button]:max-sm:min-h-11"
          options={SPORTS.map((sport) => ({
            value: sport,
            label: (
              <span className="flex items-center gap-1.5">
                <SportIcon sport={sport} className="size-3.5" />
                {sports(sport)}
              </span>
            ),
          }))}
        />
      </div>

      {assist && <BuildWithAi draft={draft} onChange={onChange} defaultOpen={assistOpen} />}

      <StructureBuilder
        structure={draft.structures[draft.sport]}
        onChange={(structure) =>
          onChange({ ...draft, structures: { ...draft.structures, [draft.sport]: structure } })
        }
      />

      {showKm && draft.sport === "bike" && (
        <NumberField
          label={t("km")}
          value={draft.plannedKm}
          max={400}
          suffix="km"
          className="max-w-40"
          onChange={(km) => set("plannedKm", km)}
          onClear={() => set("plannedKm", null)}
        />
      )}

      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={descriptionId} className="text-sm font-medium">
          {t("description")}
        </label>
        <Textarea
          id={descriptionId}
          value={draft.description}
          maxLength={4000}
          rows={3}
          placeholder={t("descriptionPlaceholder")}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>
    </div>
  );
}
