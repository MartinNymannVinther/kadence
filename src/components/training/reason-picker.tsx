"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CHANGE_REASONS, type ChangeReason } from "@/modules/training/change-reasons";

export type Why = { reason: ChangeReason | null; note: string };

export const NO_WHY: Why = { reason: null, note: "" };

/**
 * Why a session was moved or skipped (docs/adr/0117): one tap on a reason,
 * a second tap takes it back, and a few words if the person wants. Both
 * may stay empty; the change is made all the same.
 */
export function ReasonPicker({ value, onChange }: { value: Why; onChange: (why: Why) => void }) {
  const t = useTranslations("changes");
  const noteId = useId();
  const groupId = useId();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <p id={groupId} className="text-sm font-medium">
          {t("why")}
        </p>
        <div role="group" aria-labelledby={groupId} className="flex flex-wrap gap-2">
          {CHANGE_REASONS.map((reason) => {
            const chosen = value.reason === reason;
            return (
              <button
                key={reason}
                type="button"
                aria-pressed={chosen}
                onClick={() => onChange({ ...value, reason: chosen ? null : reason })}
                className={cn(
                  "focus-ring border-border min-h-9 rounded-full border px-3 text-2sm max-sm:min-h-11",
                  chosen
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-accent",
                )}
              >
                {t(`reason.${reason}`)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={noteId} className="text-sm font-medium">
          {t("note")}
        </label>
        <Textarea
          id={noteId}
          rows={2}
          maxLength={500}
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
        />
        <p className="text-meta text-xs">{t("noteWho")}</p>
      </div>
    </div>
  );
}
