import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { basisText } from "@/components/season/basis-text";
import { Link } from "@/i18n/navigation";
import type { RiderInsight } from "@/modules/insight/rider";
import { FlagList } from "./flag-item";
import { ResolvedFlags } from "./resolved-flags";
import { resolvedGroups } from "./resolved-groups";
import { WellbeingAction } from "./wellbeing-action";

/**
 * "Mulige opmærksomhedspunkter": the coach's riders with something worth a look
 * this week, the most serious first (src/modules/insight/service.ts), and
 * the wellbeing actions at the top of each. The list is the guardrails'
 * own — no model involved — so it is there on every Monday, AI or not.
 * What the coach has marked afklaret this week sits under the list, with
 * a way back (ADR 0026); a rider whose flags are all afklaret leaves the
 * list, and the line under it is their trace, with their wellbeing chip.
 */
export function AttentionList({ insights }: { insights: RiderInsight[] }) {
  const t = useTranslations("insight");
  const flagged = insights.filter((i) => i.flags.length > 0);
  const resolved = resolvedGroups(insights, (i) => basisText(i.basis, (k, v) => t(k, v)));
  const calm = insights.filter((i) => i.flags.length === 0 && i.resolved.length === 0).length;

  return (
    <div className="flex flex-col gap-3">
      {flagged.length === 0 ? (
        <p className="border-border bg-card text-2sm rounded-xl border p-4 leading-relaxed">
          {resolved.length > 0 ? t("allResolved") : t("allCalm")}
        </p>
      ) : (
        <ul className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-surface">
          {flagged.map((insight) => (
            <li key={insight.riderId} className="flex flex-col gap-2.5 px-4 py-3.5">
              <Link
                href={`/riders/${insight.riderId}`}
                className="focus-ring hover:text-primary flex min-h-8 w-fit items-center gap-1 text-sm font-semibold"
              >
                {insight.name}
                <ChevronRight aria-hidden className="text-meta size-4" />
              </Link>
              <WellbeingAction status={insight.wellbeing} />
              <FlagList
                flags={insight.flags}
                klass={basisText(insight.basis, (k, v) => t(k, v))}
                resolve={{ riderId: insight.riderId }}
              />
            </li>
          ))}
        </ul>
      )}
      <ResolvedFlags groups={resolved} />
      {flagged.length > 0 && calm > 0 && (
        <p className="text-meta text-2sm">{t("othersCalm", { count: calm })}</p>
      )}
      {flagged.length > 0 && <p className="text-meta text-xs leading-relaxed">{t("modelNote")}</p>}
    </div>
  );
}
