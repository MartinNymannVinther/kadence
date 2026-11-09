import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Garmin's attribution on the page (src/modules/devices/attribution.ts):
 * the "Garmin [device]" line under a ride's title, and the line under a
 * heading whose numbers are derived in part from rides that came through
 * Garmin. Plain text, never a tooltip or a fold, and nothing at all when
 * no ride from Garmin is there.
 */

export function GarminLine({ line, className }: { line: string | null; className?: string }) {
  if (!line) return null;
  return (
    <span translate="no" className={cn("text-meta text-xs", className)}>
      {line}
    </span>
  );
}

export function GarminDerivedNote({ show, className }: { show: boolean; className?: string }) {
  const t = useTranslations("garmin");
  if (!show) return null;
  return <p className={cn("text-meta text-xs", className)}>{t("derived")}</p>;
}
