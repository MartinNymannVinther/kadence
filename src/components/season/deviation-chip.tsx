import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { cn } from "@/lib/utils";
import type { Reference } from "@/modules/paradigms";
import { DEVIATION_STYLE, deviationKind } from "./deviation";

/** One month's deviation from DCU, or a senior's profile: tint, arrow, and the hours in words. */
export function DeviationChip({
  planned,
  dcu,
  reference = "dcu",
}: {
  planned: number;
  dcu: number;
  reference?: Reference;
}) {
  const t = useTranslations("season.deviation");
  const locale = useLocale();
  const kind = deviationKind(planned, dcu);
  const style = DEVIATION_STYLE[kind];
  const Icon = style.icon;
  const hours = num(Math.abs(planned - dcu), locale, 1);
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        style.chip,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {t(kind, { hours, ref: reference })}
    </span>
  );
}
