import { ArrowRight, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { calendarHref } from "@/components/calendar/href";
import { flagSentence, flagSigns } from "@/components/insight/flag-text";
import { SEVERITY_STYLE } from "@/components/insight/severity";
import { ATTENTION_ID, attentionAnchor } from "@/components/insight/signals";
import { WellbeingAction } from "@/components/insight/wellbeing-action";
import { basisText } from "@/components/season/basis-text";
import { Link } from "@/i18n/navigation";
import type { RiderInsight } from "@/modules/insight/rider";
import type { Flag } from "@/modules/load";
import { cn } from "@/lib/utils";

/** Riders on Overblik before the rest are counted; the whole list is in the team's week. */
export const ATTENTION_SHOWN = 3;

/** A flag's kind as the team's week badges it, its severity as tint, icon and a word for a screen reader. */
function FlagBadge({ flag }: { flag: Flag }) {
  const badges = useTranslations("insight.badge");
  const severities = useTranslations("insight.severity");
  const style = SEVERITY_STYLE[flag.severity];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium",
        style.chip,
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span className="sr-only">{severities(flag.severity)}: </span>
      <span className="truncate">
        {badges(flag.kind, { ref: typeof flag.values.ref === "string" ? flag.values.ref : "dcu" })}
      </span>
    </span>
  );
}

/**
 * "Værd at se på" on a coach's Overblik: the riders with the most to
 * look at this week — the insight service sorts them, the most serious
 * first (ADR 0062) — at most three, each with the first open flag in the
 * attention list's own words and the wellbeing action, if any, and the
 * way to the rider. The whole list, the summary and the coach's tips stay
 * under the team's week, one link away. Shown, never enforced.
 */
export function AttentionTop({ insights }: { insights: RiderInsight[] }) {
  const t = useTranslations("today.attentionTop");
  const insight = useTranslations("insight");
  const flagT = useTranslations("insight.flag");
  const signs = useTranslations("insight.sign");
  const locale = useLocale();
  const flagged = insights.filter((i) => i.flags.length > 0);
  const shown = flagged.slice(0, ATTENTION_SHOWN);
  const others = flagged.length - shown.length;
  const teamWeek = calendarHref({ view: "team" });

  return (
    <section aria-labelledby="attention-top" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="attention-top" className="text-lg font-semibold">
          {t("title")}
        </h2>
        <p className="text-meta text-2sm leading-relaxed">{t("hint")}</p>
      </div>
      {shown.length === 0 ? (
        <p className="border-border bg-card text-2sm rounded-xl border p-4 leading-relaxed">
          {insights.some((i) => i.resolved.length > 0)
            ? insight("allResolved")
            : insight("allCalm")}
        </p>
      ) : (
        <ul className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-surface">
          {shown.map((rider) => {
            const flag = rider.flags[0]!;
            const klass = basisText(rider.basis, (k, v) => insight(k, v));
            const signList = flagSigns(flag).map((s) => signs(s));
            const more = rider.flags.length - 1;
            return (
              <li key={rider.riderId} className="flex flex-col gap-1.5 px-4 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <Link
                    href={`/riders/${rider.riderId}`}
                    className="focus-ring hover:text-primary flex min-h-8 items-center gap-1 text-sm font-semibold"
                  >
                    {rider.name}
                    <ChevronRight aria-hidden className="text-meta size-4" />
                  </Link>
                  <FlagBadge flag={flag} />
                </div>
                <WellbeingAction status={rider.wellbeing} />
                <p className="text-2sm leading-relaxed">
                  {flagSentence(flag, (key, values) => flagT(key, values), { locale, klass })}
                </p>
                {signList.length > 0 && (
                  <p className="text-meta text-xs">
                    {flagT("signs", { signs: signList.join(", ") })}
                  </p>
                )}
                {more > 0 && (
                  <Link
                    href={`${teamWeek}#${attentionAnchor(rider.riderId)}`}
                    className="focus-ring text-primary flex min-h-8 w-fit items-center text-xs font-medium hover:underline"
                  >
                    {t("more", { count: more })}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {others > 0 && <p className="text-meta text-2sm">{t("others", { count: others })}</p>}
      <Link
        href={`${teamWeek}#${ATTENTION_ID}`}
        className="focus-ring text-primary flex min-h-10 w-fit items-center gap-1 text-2sm font-medium hover:underline"
      >
        {t("all")}
        <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </section>
  );
}
