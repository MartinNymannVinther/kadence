import { useTranslations } from "next-intl";
import { CoachBrief } from "@/components/assist/coach-brief";
import { CoachTips } from "@/components/coach/coach-tips";
import { Link } from "@/i18n/navigation";
import { AttentionList } from "./attention-list";
import { ATTENTION_ID } from "./signals";
import type { TeamAttentionData } from "./team-attention-data";

/**
 * Under the team's week (ADR 0061): who has something worth a look, from
 * the guardrails alone, then the AI's few sentences on top where the team
 * allows it (ADR 0017), then the coach's tips. The section carries the
 * anchor Today links to, and each rider's entry the anchor their badges
 * in the grid lead to. The flags belong to the week in progress; in
 * another week the section says so and leads back to this one.
 */
export function TeamAttention({
  data,
  thisWeekHref,
}: {
  /** Null when the week shown is not the one in progress. */
  data: TeamAttentionData | null;
  thisWeekHref: string;
}) {
  const t = useTranslations("insight");
  return (
    <div className="flex max-w-3xl flex-col gap-8 pt-3">
      <section
        id={ATTENTION_ID}
        aria-labelledby="team-attention"
        className="flex scroll-mt-20 flex-col gap-3"
      >
        <div className="flex flex-col gap-1">
          <h2 id="team-attention" className="text-lg font-semibold">
            {t("title")}
          </h2>
          <p className="text-meta text-2sm leading-relaxed">
            {data ? t("subtitle") : t("otherWeek")}
          </p>
        </div>
        {data ? (
          <>
            <AttentionList insights={data.insights} />
            {data.insights.some((i) => i.flags.length > 0) && (
              <CoachBrief allowed={data.aiAllowed} />
            )}
          </>
        ) : (
          <Link
            href={thisWeekHref}
            className="focus-ring text-primary flex min-h-10 w-fit items-center text-2sm font-medium hover:underline"
          >
            {t("toThisWeek")}
          </Link>
        )}
      </section>
      {data && data.tips.length > 0 && <CoachTips tips={data.tips} />}
    </div>
  );
}
