import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FLAG_SECTION } from "@/modules/coach/flag-sections";
import type { Flag } from "@/modules/load";
import { cn } from "@/lib/utils";
import { flagSentence, flagSigns } from "./flag-text";
import { ResolveFlagButton } from "./resolve-flag-button";
import { SEVERITY_STYLE } from "./severity";

/**
 * One guardrail flag: how much it matters (icon and word) and the sentence
 * with the numbers. Shown to the coach, never enforced. `action` is what
 * the coach can do about the row itself — afklaret, or fortryd.
 */
export function FlagItem({
  flag,
  klass,
  action,
}: {
  flag: Flag;
  klass: string;
  action?: ReactNode;
}) {
  const t = useTranslations("insight.flag");
  const severities = useTranslations("insight.severity");
  const signs = useTranslations("insight.sign");
  const locale = useLocale();
  const style = SEVERITY_STYLE[flag.severity];
  const Icon = style.icon;
  const insight = useTranslations("insight");
  const signList = flagSigns(flag).map((s) => signs(s as "ill"));
  const section = FLAG_SECTION[flag.kind];
  return (
    <li className="flex items-start gap-2.5 text-2sm leading-relaxed">
      <span
        className={cn(
          "mt-0.5 inline-flex h-5 w-27 shrink-0 items-center justify-center gap-1 rounded-full px-2 text-2xs font-medium whitespace-nowrap",
          style.chip,
        )}
      >
        <Icon aria-hidden className="size-3" />
        {severities(flag.severity)}
      </span>
      <span className="min-w-0">
        {flagSentence(flag, (key, values) => t(key as "ramp", values), { locale, klass })}
        {signList.length > 0 && (
          <span className="text-meta block text-xs">
            {t("signs", { signs: signList.join(", ") })}
          </span>
        )}
        {(section || action) && (
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {section && (
              <Link
                href={`/help/coach#${section}`}
                className="focus-ring text-primary text-xs font-medium hover:underline"
              >
                {insight("guideLink")}
              </Link>
            )}
            {action}
          </span>
        )}
      </span>
    </li>
  );
}

/**
 * A rider's flags, most serious first (the guardrails already sort them).
 * With `resolve`, each carries the coach's "Afklaret" button.
 */
export function FlagList({
  flags,
  klass,
  resolve,
}: {
  flags: Flag[];
  klass: string;
  resolve?: { riderId: string };
}) {
  const insight = useTranslations("insight");
  if (flags.length === 0) return <p className="text-meta text-2sm">{insight("noFlags")}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {flags.map((flag, i) => (
        <FlagItem
          key={`${flag.kind}-${i}`}
          flag={flag}
          klass={klass}
          action={resolve && <ResolveFlagButton riderId={resolve.riderId} kind={flag.kind} />}
        />
      ))}
    </ul>
  );
}
