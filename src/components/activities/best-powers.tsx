import { useTranslations } from "next-intl";
import { BEST_POWER_SECONDS } from "@/modules/load/weighted-power";

/**
 * The ride's best average watt over 5 seconds, 1, 5, 20 and 60 minutes —
 * the rider's own numbers against themselves, never a ranking (ADR 0013).
 */
export function BestPowers({ best }: { best: Record<string, number> }) {
  const t = useTranslations("activities.best");
  const tiles = BEST_POWER_SECONDS.filter((s) => typeof best[String(s)] === "number");
  if (tiles.length === 0) return <p className="text-meta text-2sm">{t("none")}</p>;
  return (
    <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {tiles.map((seconds) => (
        <div
          key={seconds}
          className="border-border bg-card flex flex-col gap-0.5 rounded-lg border px-3 py-2.5"
        >
          <dt className="text-label text-xs">{t(`d${seconds}` as "d5")}</dt>
          <dd className="text-base font-semibold">{t("watt", { w: best[String(seconds)]! })}</dd>
        </div>
      ))}
    </dl>
  );
}
