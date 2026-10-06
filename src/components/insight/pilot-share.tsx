import { useTranslations } from "next-intl";
import { share } from "@/modules/insight/pilot-numbers";

/**
 * One of the pilot's shares (docs/adr/0066): the percentage, the count it
 * stands on, and a thin bar. A share of nothing is a dash, not 0 %.
 */
export function PilotShare({ part, whole }: { part: number; whole: number }) {
  const t = useTranslations("insight.pilot");
  const value = share(part, whole);
  if (value === null) return <span className="text-meta">{t("none")}</span>;
  return (
    <span className="flex flex-col items-end gap-1">
      <span className="whitespace-nowrap">
        <span className="font-medium">{t("percent", { share: value })}</span>{" "}
        <span className="text-meta text-xs">{t("of", { part, whole })}</span>
      </span>
      <span className="bg-secondary block h-1 w-16 overflow-hidden rounded-full" aria-hidden>
        <span
          className="bg-primary block h-full rounded-full"
          style={{ width: `${value * 100}%` }}
        />
      </span>
    </span>
  );
}
