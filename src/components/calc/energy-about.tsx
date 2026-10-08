import { useTranslations } from "next-intl";
import { SourceLinks } from "@/components/guides/source-links";

const POINTS = ["1", "2", "3", "4", "5", "6"] as const;

/** Where the advice and its numbers come from (docs/research/ernaering.md, 4 and 4.13). */
export function EnergyAbout() {
  const t = useTranslations("calculators.energy.about");
  return (
    <section className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-surface sm:p-5 print:hidden">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-reading leading-relaxed marker:text-meta">
        {POINTS.map((p) => (
          <li key={p}>{t(`points.${p}`)}</li>
        ))}
      </ul>
      <SourceLinks
        ids={[
          "nnr2023Energy",
          "fcdb61",
          "thomas2016",
          "jeukendrup2014",
          "tdFood2026",
          "tdFluid",
          "usdaDangerZone",
          "dcuU17Compendium",
          "dcuU19Compendium",
          "compendium2024",
        ]}
      />
    </section>
  );
}
