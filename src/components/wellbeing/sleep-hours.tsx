"use client";

import { useId } from "react";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * "Hvor mange timer sov du i nat?": the hours typed, or stepped half an
 * hour at a time with two thumb-sized buttons. One decimal, as the
 * database keeps it; a first press starts from 8 hours. One line, the
 * question beside its answer; on a phone the question is asked short
 * ("Søvn i nat"), so the line fits.
 */
export function SleepHours({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const t = useTranslations("checkin");
  const id = useId();
  const step = (by: number) =>
    onChange(Math.round(Math.min(16, Math.max(0, (value ?? 8 - by) + by)) * 10) / 10);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        <span className="sm:hidden">{t("sleepShort")}</span>
        <span className="max-sm:hidden">{t("sleep")}</span>
      </label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={t("less")}
          onClick={() => step(-0.5)}
        >
          <Minus />
        </Button>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={16}
          step={0.1}
          value={value ?? ""}
          placeholder="–"
          className="h-11 w-16 text-center text-base tabular-nums"
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={t("more")}
          onClick={() => step(0.5)}
        >
          <Plus />
        </Button>
        <span className="text-meta text-2sm">{t("hours")}</span>
      </div>
    </div>
  );
}
