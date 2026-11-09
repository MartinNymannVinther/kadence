import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** "Sprunget over: Syg" under a skipped session (docs/adr/0117); nothing for any other. */
export function SkipLine({
  session,
  className,
}: {
  session: { skipped: boolean; skipReason: string | null; activity: unknown };
  className?: string;
}) {
  const t = useTranslations("changes");
  if (!session.skipped || session.activity) return null;
  return (
    <span className={cn("text-meta text-xs", className)}>
      {session.skipReason
        ? t("skip.line", { reason: t(`reason.${session.skipReason}` as "reason.ill") })
        : t("skip.lineNoReason")}
    </span>
  );
}
