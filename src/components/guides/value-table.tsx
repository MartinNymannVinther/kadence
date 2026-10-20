import { useTranslations } from "next-intl";
import { VALUE_ROWS, type ValueRow } from "@/modules/guides/equipment-value";
import { SourceLinks } from "./source-links";

/**
 * "Most speed per krone": the research note's ranked table, cheapest
 * gains first, with what is left of each in the middle of a bunch.
 */
export function ValueTable() {
  const t = useTranslations("guides.equipment.value");

  const price = (row: ValueRow) => {
    const [low, high] = row.priceDkk;
    if (high === 0) return t("free");
    return low === high ? t("priceOne", { price: low }) : t("priceRange", { low, high });
  };
  const watts = (row: ValueRow) => {
    const [low, high] = row.watts;
    if (row.claim) return t("claim", { watts: low });
    if (high === 0) return t("none");
    return low === high ? t("wattsOne", { watts: low }) : t("wattsRange", { low, high });
  };

  return (
    <section
      aria-labelledby="value-title"
      className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-surface sm:p-5"
    >
      <h2 id="value-title" className="text-lg font-semibold">
        {t("title")}
      </h2>
      <p className="text-reading leading-relaxed">{t("intro")}</p>
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-2sm">
          <thead>
            <tr className="text-label text-left text-xs">
              <th className="px-1 py-2 font-medium">{t("measure")}</th>
              <th className="px-1 py-2 font-medium">{t("price")}</th>
              <th className="px-1 py-2 font-medium">{t("watts")}</th>
              <th className="px-1 py-2 font-medium">{t("inBunch")}</th>
            </tr>
          </thead>
          <tbody>
            {VALUE_ROWS.map((row) => (
              <tr key={row.id} className="border-border border-t align-top">
                <td className="px-1 py-2 leading-snug">{t(`rows.${row.id}` as "title")}</td>
                <td className="px-1 py-2 whitespace-nowrap tabular-nums">{price(row)}</td>
                <td className="px-1 py-2 whitespace-nowrap tabular-nums">{watts(row)}</td>
                <td className="text-meta px-1 py-2">{t(`bunch.${row.inBunch}` as "title")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SourceLinks
        ids={[
          "frictionFacts",
          "barry2015",
          "cnClothing2025",
          "brrTyres",
          "cnHelmets2025",
          "cnWheels2026",
          "cnBikes2024",
        ]}
      />
    </section>
  );
}
