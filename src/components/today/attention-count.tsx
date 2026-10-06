import { ChevronRight, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * The coach's Today has one number from the guardrails (docs/adr/0062):
 * how many riders have something worth a look this week, counted as the
 * list of opmærksomhedspunkter counts them, and the way to that list in
 * the team's week on the calendar.
 */
export function AttentionCount({ count }: { count: number }) {
  const t = useTranslations("today.attention");
  return (
    <Link
      href="/calendar#opmaerksomhed"
      className="focus-ring border-border bg-card hover:bg-secondary/60 flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 shadow-[var(--surface-shadow)] transition-colors duration-[120ms]"
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          count > 0 ? "bg-sticky text-sticky-ink" : "bg-success-tint text-success",
        )}
      >
        <Eye aria-hidden className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold">{t("count", { count })}</span>
        <span className="text-meta text-2sm">{t("where")}</span>
      </span>
      <ChevronRight aria-hidden className="text-meta size-4 shrink-0" />
    </Link>
  );
}
