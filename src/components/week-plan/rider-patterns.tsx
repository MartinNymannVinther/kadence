import { useLocale, useTranslations } from "next-intl";
import { patternText } from "@/components/training/pattern-text";
import type { PlanRider } from "./types";

/**
 * The patterns in the chosen riders' moved and skipped sessions, under the
 * riders in "Planlæg ugen" (docs/adr/0119): what Kadence sees, so the week
 * can be laid to the rider. Nothing when nobody chosen has a pattern.
 */
export function RiderPatterns({ riders, selected }: { riders: PlanRider[]; selected: string[] }) {
  const t = useTranslations("changes.patterns");
  const reason = useTranslations("changes.reason");
  const locale = useLocale();
  const shown = riders.filter((r) => selected.includes(r.id) && (r.patterns?.length ?? 0) > 0);
  if (shown.length === 0) return null;
  const tell = t as unknown as Parameters<typeof patternText>[1];
  const why = reason as unknown as Parameters<typeof patternText>[2];
  return (
    <div className="bg-sticky text-sticky-ink flex flex-col gap-1.5 rounded-lg px-3 py-2.5 text-2sm">
      <p className="font-medium">{t("plannerHint")}</p>
      <ul className="flex flex-col gap-1">
        {shown.flatMap((r) =>
          r.patterns!.map((p) => (
            <li key={`${r.id}-${p.key}`}>
              <span className="font-medium">{r.name}:</span> {patternText(p, tell, why, locale)}
            </li>
          )),
        )}
      </ul>
    </div>
  );
}
