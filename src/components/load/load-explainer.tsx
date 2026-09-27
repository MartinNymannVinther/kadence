import { useTranslations } from "next-intl";

/**
 * The three words of the load chart, one plain sentence each, for a
 * 15-year-old and a parent as much as a coach (ADR 0016). Kadence's own
 * names; how RPE counts is in the help page.
 */
export function LoadExplainer() {
  const t = useTranslations("load");
  const terms = [
    { key: "fitness", color: "var(--series-1)" },
    { key: "fatigue", color: "var(--series-2)" },
    { key: "form", color: "var(--meta)" },
  ] as const;
  return (
    <div className="grid gap-2">
      <dl className="grid gap-2 text-2sm leading-relaxed">
        {terms.map((term) => (
          <div key={term.key} className="flex gap-2">
            <span
              aria-hidden
              className="mt-1.5 h-2 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: term.color }}
            />
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
