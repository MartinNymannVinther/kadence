"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { MAX_TRANSPORT, type TimePlace } from "@/modules/training/time-place";
import {
  TimePlaceFields,
  timePlaceDraft,
  timePlaceValue,
  type TimePlaceDraft,
} from "./time-place-fields";

/** The three fields as the event dialog holds them: "" for no time. */
export type EventWhereDraft = TimePlaceDraft & { transportNote: string };

export function eventWhereDraft(
  from?: (Partial<TimePlace> & { transportNote?: string }) | null,
): EventWhereDraft {
  return { ...timePlaceDraft(from), transportNote: from?.transportNote ?? "" };
}

/** What the server is sent: no time as null, the texts without spaces at the ends. */
export function eventWhereValue(draft: EventWhereDraft): TimePlace & { transportNote: string } {
  return { ...timePlaceValue(draft), transportNote: draft.transportNote.trim() };
}

/**
 * When and where a race or a camp starts, and who drives
 * (docs/backlog.md P2-03): the session's "Tid og sted" with a hint of
 * its own, and one short line about the driving. All three may stay
 * empty; a parent planning the weekend reads them on the parents' page
 * and in "Del ugen".
 */
export function EventWhereFields({
  value,
  onChange,
}: {
  value: EventWhereDraft;
  onChange: (value: EventWhereDraft) => void;
}) {
  const t = useTranslations("calendar.event");
  const id = useId();

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <TimePlaceFields
        value={value}
        onChange={(next) => onChange({ ...value, ...next })}
        hint={t("whereHint")}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={id} className="text-label text-xs font-medium">
          {t("transport")}
        </label>
        <Input
          id={id}
          value={value.transportNote}
          maxLength={MAX_TRANSPORT}
          placeholder={t("transportPlaceholder")}
          className="max-sm:h-11"
          onChange={(e) => onChange({ ...value, transportNote: e.target.value })}
        />
      </div>
    </div>
  );
}
