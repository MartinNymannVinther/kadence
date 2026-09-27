import { useTranslations } from "next-intl";
import { CoachBrief } from "@/components/assist/coach-brief";
import { AttentionList } from "@/components/insight/attention-list";
import type { RiderInsight } from "@/modules/insight/rider";

/**
 * The coach's Monday brief, every day of the week: who needs attention and
 * why, from the guardrails alone — and on top, where the team allows it,
 * a few sentences from the AI on who to talk to first (ADR 0017).
 */
export function AttentionSection({
  insights,
  aiAllowed,
}: {
  insights: RiderInsight[];
  aiAllowed: boolean;
}) {
  const t = useTranslations("insight");
  return (
    <section aria-labelledby="coach-attention" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="coach-attention" className="text-lg font-semibold">
          {t("title")}
        </h2>
        <p className="text-meta text-2sm leading-relaxed">{t("subtitle")}</p>
      </div>
      <AttentionList insights={insights} />
      {insights.some((i) => i.flags.length > 0) && <CoachBrief allowed={aiAllowed} />}
    </section>
  );
}
