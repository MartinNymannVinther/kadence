import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SEVERITY_STYLE } from "./severity";
import type { RiderSignals } from "./signals";

/**
 * A rider's open flags as small badges beside their name in the team's
 * week (ADR 0061): the severity as a tint and an icon of its own shape,
 * a short word for the kind, and the whole group one link down to the
 * rider's entry in the attention list, where the sentence and the
 * numbers are. `row` lays them side by side, for the phone's card.
 */
export function SignalBadges({
  name,
  signals,
  row = false,
  className,
}: {
  name: string;
  signals: RiderSignals;
  row?: boolean;
  className?: string;
}) {
  const t = useTranslations("insight.badge");
  const severities = useTranslations("insight.severity");
  const said = signals.badges.map((b) => `${severities(b.severity)}: ${t(b.kind)}`);
  if (signals.more > 0) said.push(t("more", { count: signals.more }));

  return (
    <a
      href={signals.anchor}
      aria-label={t("label", { name, flags: said.join(", ") })}
      className={cn(
        "focus-ring group flex w-fit max-w-full gap-1 rounded-md",
        row ? "min-h-10 flex-wrap items-center" : "flex-col items-start",
        className,
      )}
    >
      {signals.badges.map((badge) => {
        const style = SEVERITY_STYLE[badge.severity];
        const Icon = style.icon;
        return (
          <span
            key={badge.kind}
            aria-hidden
            title={`${severities(badge.severity)}: ${t(badge.kind)}`}
            className={cn(
              "inline-flex h-5 max-w-full min-w-0 items-center gap-1 rounded-full px-1.5 text-2xs font-medium group-hover:underline",
              style.chip,
            )}
          >
            <Icon className="size-3 shrink-0" />
            <span className="truncate">{t(badge.kind)}</span>
          </span>
        );
      })}
      {signals.more > 0 && (
        <span aria-hidden className="text-meta inline-flex h-5 items-center px-1 text-2xs">
          {t("more", { count: signals.more })}
        </span>
      )}
    </a>
  );
}
