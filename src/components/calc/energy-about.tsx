import { useTranslations } from "next-intl";
import { SourceLinks } from "@/components/guides/source-links";

const POINTS = ["1", "2", "3", "4"] as const;

/** How the energy calculator works and where its numbers come from (docs/research/ernaering.md, 4). */
export function EnergyAbout() {
  const t = useTranslations("calculators.energy.about");
  return (
    <section className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-reading leading-relaxed marker:text-[var(--meta)]">
        {POINTS.map((p) => (
          <li key={p}>{t(`points.${p}`)}</li>
        ))}
      </ul>
      <SourceLinks
        ids={[
          "hopker2009",
          "martin1998",
          "keytel2005",
          "compendium2024",
          "thomas2016",
          "jeukendrup2014",
          "tdFluid",
        ]}
      />
    </section>
  );
}
