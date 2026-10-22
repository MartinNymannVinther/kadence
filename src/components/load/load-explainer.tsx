import { useTranslations } from "next-intl";
import { LegendKey } from "@/components/charts/chart-legend";
import { FATIGUE_COLOUR, FITNESS_COLOUR, FORM_COLOUR } from "./form-state";

/**
 * The three words of the load chart, one plain sentence each, for a
 * 15-year-old and a parent as much as a coach (ADR 0016). Each word
 * carries its key drawn as the chart draws it, so the sentence and the
 * line are told apart the same way. Kadence's own names; how RPE counts
 * is in the help page.
 */
export function LoadExplainer() {
  const t = useTranslations("load");
  const terms = [
    { key: "fitness", color: FITNESS_COLOUR, mark: "area" as const },
    { key: "fatigue", color: FATIGUE_COLOUR, mark: "line" as const },
    { key: "form", color: FORM_COLOUR, mark: "line" as const },
  ] as const;
  return (
    <div className="grid gap-2">
      <dl className="grid gap-2 text-2sm leading-relaxed">
        {terms.map((term) => (
          <div key={term.key} className="flex gap-2">
            <span aria-hidden className="mt-1.5 shrink-0">
              <LegendKey mark={term.mark} color={term.color} />
            </span>
            <div>
              <dt className="inline font-semibold">{t(term.key)}: </dt>
              <dd className="text-muted-foreground inline">{t(`explain.${term.key}`)}</dd>
            </div>
          </div>
        ))}
      </dl>
      <p className="text-meta text-xs leading-relaxed">{t("scale")}</p>
    </div>
  );
}
