"use client";

import { useTranslations } from "next-intl";
import { RiderPicker } from "@/components/calendar/rider-picker";
import { cn } from "@/lib/utils";
import { isClassBasis } from "@/modules/dcu";
import { isSeniorBasis, profileOf } from "@/modules/paradigms";
import type { PlanRider } from "./types";

/**
 * Who the week is for: the whole team, a class with one tap — every U17
 * this season, say — or the adults on a training profile (ADR 0092), or
 * riders picked one by one.
 */
export function RiderChoice({
  riders,
  selected,
  onChange,
}: {
  riders: PlanRider[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useTranslations("weekPlan.riders");
  const season = useTranslations("season");
  // DCU's classes first, then the adults' profiles, each a chip of its own.
  const classOf = (r: PlanRider) =>
    isClassBasis(r.basis) ? r.basis.split("-")[0]! : isSeniorBasis(r.basis) ? r.basis : null;
  const found = new Set(riders.map(classOf).filter((c): c is string => c !== null));
  const classes = [
    ...[...found].filter((c) => !isSeniorBasis(c)).sort(),
    ...[...found].filter(isSeniorBasis).sort(),
  ];
  const nameOf = (c: string) =>
    isSeniorBasis(c) ? season("basisSenior", { profile: profileOf(c) }) : c;
  const same = (ids: string[]) =>
    ids.length === selected.length && ids.every((id) => selected.includes(id));
  const chips = [
    { key: "all", label: t("all", { count: riders.length }), ids: riders.map((r) => r.id) },
    ...classes.map((c) => {
      const ids = riders.filter((r) => classOf(r) === c).map((r) => r.id);
      return { key: c, label: t("class", { name: nameOf(c), count: ids.length }), ids };
    }),
  ];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {classes.length > 0 && (
        <div role="group" aria-label={t("quick")} className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              aria-pressed={same(chip.ids)}
              className={cn(
                "focus-ring rounded-full border px-3 py-1.5 text-2sm max-sm:min-h-11",
                same(chip.ids)
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-border bg-card hover:bg-accent",
              )}
              onClick={() => onChange(chip.ids)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
      <RiderPicker riders={riders} selected={selected} onChange={onChange} />
    </div>
  );
}
