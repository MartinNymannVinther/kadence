import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { basisText } from "@/components/season/basis-text";
import { Link } from "@/i18n/navigation";
import type { RiderInsight } from "@/modules/insight/rider";
import { FlagList } from "./flag-item";
import { WellbeingAction } from "./wellbeing-action";

/**
 * "Kræver opmærksomhed": the coach's riders with something worth a look
 * this week, the most serious first (src/modules/insight/service.ts), and
 * the wellbeing actions at the top of each. The list is the guardrails'
 * own — no model involved — so it is there on every Monday, AI or not.
 */
export function AttentionList({ insights }: { insights: RiderInsight[] }) {
  const t = useTranslations("insight");
  const flagged = insights.filter((i) => i.flags.length > 0);
  const calm = insights.length - flagged.length;

  if (flagged.length === 0)
    return (
      <p className="border-border bg-card text-2sm rounded-xl border p-4 leading-relaxed">
        {t("allCalm")}
      </p>
    );

  return (
    <div className="flex flex-col gap-3">
      <ul className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-[var(--surface-shadow)]">
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
            <FlagList flags={insight.flags} klass={basisText(insight.basis, (k, v) => t(k, v))} />
          </li>
        ))}
      </ul>
      {calm > 0 && <p className="text-meta text-2sm">{t("othersCalm", { count: calm })}</p>}
      <p className="text-meta text-xs leading-relaxed">{t("modelNote")}</p>
    </div>
  );
}
