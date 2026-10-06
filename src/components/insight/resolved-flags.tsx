"use client";

import { Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRun } from "@/components/common/use-run";
import { unresolveFlagAction } from "@/modules/insight/resolution-actions";
import { FlagItem } from "./flag-item";
import { opensByItself, resolvedCount, type ResolvedGroup } from "./resolved-groups";
import { WellbeingAction } from "./wellbeing-action";

/**
 * The trace of what a coach has marked afklaret this week (ADR 0026): a
 * line with the count, the items behind it on request, and "Fortryd" on
 * each — nothing vanishes without a way back. Grouped per rider with
 * their wellbeing chip; opens by itself when a rider in it is in the red
 * zone, on load and after the press that put them there. Two flags held
 * by one resolution (two strength pairs) are two items that undo the
 * same row.
 */
export function ResolvedFlags({ groups }: { groups: ResolvedGroup[] }) {
  const t = useTranslations("insight.resolve");
  const auto = opensByItself(groups);
  const [open, setOpen] = useState(auto);
  // A press only refreshes the props, so the initial state would not see a
  // red-zone rider entering the trace: adjust the state during render
  // (react.dev, "storing information from previous renders"), not in an
  // effect. Leaving the trace changes nothing the coach has chosen.
  const [wasAuto, setWasAuto] = useState(auto);
  if (auto !== wasAuto) {
    setWasAuto(auto);
    if (auto) setOpen(true);
  }
  const { run, pending } = useRun();
  const count = resolvedCount(groups);
  if (count === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-meta text-2sm flex flex-wrap items-center gap-x-2">
        {t("count", { count })}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="focus-ring text-primary min-h-8 font-medium hover:underline"
        >
          {open ? t("hide") : t("show")}
        </button>
      </p>
      {open && (
        <ul className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border">
          {groups.map((g) => (
            <li key={g.riderId} className="flex flex-col gap-2.5 px-4 py-3.5">
              {g.riderName && <p className="text-sm font-semibold">{g.riderName}</p>}
              <WellbeingAction status={g.wellbeing} />
              <ul className="flex flex-col gap-2">
                {g.items.map((item, index) => (
                  <FlagItem
                    key={`${item.resolutionId}-${index}`}
                    flag={item.flag}
                    klass={g.klass}
                    weekHref={g.weekHref}
                    action={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run(() => unresolveFlagAction({ resolutionId: item.resolutionId }))
                        }
                      >
                        <Undo2 data-icon="inline-start" />
                        {t("undo")}
                      </Button>
                    }
                  />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {open && <p className="text-meta text-xs leading-relaxed">{t("weekNote")}</p>}
    </div>
  );
}
