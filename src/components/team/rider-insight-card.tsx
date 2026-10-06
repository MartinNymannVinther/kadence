import { useTranslations } from "next-intl";
import { FlagList } from "@/components/insight/flag-item";
import { ResolvedFlags } from "@/components/insight/resolved-flags";
import { resolvedGroups } from "@/components/insight/resolved-groups";
import { WellbeingAction } from "@/components/insight/wellbeing-action";
import { basisText } from "@/components/season/basis-text";
import type { ZoneDay } from "@/components/wellbeing/zone-days";
import { ZoneStrip } from "@/components/wellbeing/zone-strip";
import type { RiderInsight } from "@/modules/insight/rider";

/**
 * One rider's week for the coach: the guardrails' warnings with the
 * wellbeing action on top, what the coach has marked afklaret this week
 * (ADR 0026), and the last two weeks of check-in zones. Shown, never
 * enforced.
 */
export function RiderInsightCard({
  insight,
  days,
  today,
}: {
  insight: RiderInsight | null;
  days: ZoneDay[];
  today: string;
}) {
  const t = useTranslations("insight");
  const wellbeing = useTranslations("wellbeing");
  const klass = basisText(insight?.basis, (k, v) => t(k, v));
  return (
    <div className="border-border bg-card flex flex-col gap-5 rounded-xl border p-4 shadow-surface sm:p-5">
      <div className="flex flex-col gap-2.5">
        <h3 className="text-sm font-semibold">{t("riderTitle")}</h3>
        <WellbeingAction status={insight?.wellbeing ?? null} />
        <FlagList
          flags={insight?.flags ?? []}
          klass={klass}
          resolve={insight ? { riderId: insight.riderId } : undefined}
        />
        <ResolvedFlags
          groups={insight ? resolvedGroups([insight], () => klass, { named: false }) : []}
        />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{wellbeing("stripTitle")}</h3>
        {days.some((d) => d.zone) ? (
          <ZoneStrip days={days} today={today} />
        ) : (
          <p className="text-meta text-2sm">{wellbeing("none")}</p>
        )}
        <p className="text-meta text-xs leading-relaxed">{t("modelNote")}</p>
      </div>
    </div>
  );
}
