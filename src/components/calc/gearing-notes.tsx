import { useTranslations } from "next-intl";
import { SourceLinks } from "@/components/guides/source-links";

const STEPS = ["1", "2", "3", "4"] as const;

/**
 * What sits around the numbers: DCU's own smaller-chainring suggestions,
 * how a commissaire measures, the rules that catch people out, and the
 * sources (docs/research/klasser-og-gearing.md, sections 3.2–3.5).
 */
export function GearingNotes() {
  const t = useTranslations("calculators.gearing");
  const card =
    "border-border bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-surface sm:p-5";
  return (
    <div className="flex flex-col gap-6">
      <section className={card}>
        <h2 className="text-lg font-semibold">{t("alternative.title")}</h2>
        <p className="text-reading leading-relaxed">{t("alternative.body")}</p>
      </section>
      <section className={card}>
        <h2 className="text-lg font-semibold">{t("measure.title")}</h2>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-reading leading-relaxed">
          {STEPS.map((step) => (
            <li key={step}>{t(`measure.steps.${step}`)}</li>
          ))}
        </ol>
        <p className="text-meta text-2sm leading-relaxed">{t("measure.note")}</p>
      </section>
      <section className={card}>
        <h2 className="text-lg font-semibold">{t("rules.title")}</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-reading leading-relaxed marker:text-meta">
          <li>{t("rules.locked")}</li>
          <li>{t("rules.ecycling")}</li>
          <li>{t("rules.abroad")}</li>
          <li>{t("rules.circumference")}</li>
        </ul>
        <SourceLinks
          ids={["dcuRules2026", "dcuGear2023", "uciPart2", "garminWheel", "gearcalcChecking"]}
        />
      </section>
    </div>
  );
}
