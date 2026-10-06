"use client";

import { useId } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_PLACE, clockOf, type TimePlace } from "@/modules/training/time-place";

/** The two fields as a form holds them: "" for no time. */
export type TimePlaceDraft = { startTime: string; meetingPlace: string };

export function timePlaceDraft(from?: Partial<TimePlace> | null): TimePlaceDraft {
  return { startTime: clockOf(from?.startTime) ?? "", meetingPlace: from?.meetingPlace ?? "" };
}

/** What the server is sent: no time as null, the place without spaces at the ends. */
export function timePlaceValue(draft: TimePlaceDraft): TimePlace {
  return { startTime: clockOf(draft.startTime), meetingPlace: draft.meetingPlace.trim() };
}

/**
 * When and where a session starts (ADR 0058): a clock time in Copenhagen
 * and a meeting place, both optional — for the session a group rides
 * together. Every form that writes a session carries these two.
 */
export function TimePlaceFields({
  value,
  onChange,
}: {
  value: TimePlaceDraft;
  onChange: (value: TimePlaceDraft) => void;
}) {
  const t = useTranslations("calendar.timePlace");
  const ids = { time: useId(), place: useId(), hint: useId() };

  return (
    <fieldset className="flex min-w-0 flex-col gap-2" aria-describedby={ids.hint}>
      <legend className="text-sm font-medium">{t("legend")}</legend>
      <p id={ids.hint} className="text-meta -mt-1 text-xs">
        {t("hint")}
      </p>
      <div className="grid min-w-0 gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={ids.time} className="text-label text-xs font-medium">
            {t("time")}
          </label>
          <div className="flex items-center gap-1">
            <Input
              id={ids.time}
              type="time"
              value={value.startTime}
              className="max-sm:h-11"
              onChange={(e) => onChange({ ...value, startTime: e.target.value })}
            />
            {value.startTime && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-11 shrink-0 sm:size-8"
                aria-label={t("clearTime")}
                title={t("clearTime")}
                onClick={() => onChange({ ...value, startTime: "" })}
              >
                <X />
              </Button>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={ids.place} className="text-label text-xs font-medium">
            {t("place")}
          </label>
          <Input
            id={ids.place}
            value={value.meetingPlace}
            maxLength={MAX_PLACE}
            placeholder={t("placePlaceholder")}
            className="max-sm:h-11"
            onChange={(e) => onChange({ ...value, meetingPlace: e.target.value })}
          />
        </div>
      </div>
    </fieldset>
  );
}
