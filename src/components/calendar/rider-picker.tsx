"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { RiderOption } from "./types";

/**
 * Who a session is for. One rider is a plan; several are a group plan —
 * the same session in each calendar, changed together later.
 */
export function RiderPicker({
  riders,
  selected,
  onChange,
}: {
  riders: RiderOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useTranslations("calendar.add");
  const labelId = useId();
  const all = selected.length === riders.length;
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div role="group" aria-labelledby={labelId} className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span id={labelId} className="text-sm font-medium">
          {t("riders")}
        </span>
        {riders.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="max-sm:h-11"
            onClick={() => onChange(all ? [] : riders.map((r) => r.id))}
          >
            {all ? t("none") : t("all")}
          </Button>
        )}
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {riders.map((rider) => (
          <label
            key={rider.id}
            className="border-border has-checked:border-primary has-checked:bg-accent/60 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              className="accent-primary size-4"
              checked={selected.includes(rider.id)}
              onChange={() => toggle(rider.id)}
            />
            <span className="min-w-0 truncate">{rider.name}</span>
          </label>
        ))}
      </div>
      {selected.length > 1 && <p className="text-meta text-xs">{t("groupHint")}</p>}
    </div>
  );
}
