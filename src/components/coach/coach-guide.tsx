import { useTranslations } from "next-intl";
import { GUIDE_SECTIONS, guideValues } from "@/modules/coach";
import { SourceList } from "./source-list";

/**
 * The coach guide: a table of contents, then each section with its short
 * introduction, its points and its sources. The numbers in the words come
 * from the modules that own them (`guideValues`).
 */
export function CoachGuide() {
  const t = useTranslations("coachGuide");
  const values = guideValues();
  const text = (key: string) => t(key as "title", values);

  return (
    <div className="flex flex-col gap-8">
      <nav aria-labelledby="guide-contents" className="flex flex-col gap-2">
        <h2 id="guide-contents" className="text-base font-semibold">
          {t("contents")}
        </h2>
        <ol className="grid gap-x-6 gap-y-1 text-2sm sm:grid-cols-2">
          {GUIDE_SECTIONS.map((section, i) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="focus-ring text-primary flex min-h-9 items-center gap-2 hover:underline"
              >
                <span className="text-meta w-5 text-right tabular-nums">{i + 1}.</span>
                {text(`sections.${section.id}.title`)}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {GUIDE_SECTIONS.map((section, i) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-title`}
          className="border-border bg-card flex scroll-mt-20 flex-col gap-3 rounded-xl border p-4 shadow-surface sm:p-5"
        >
          <h2 id={`${section.id}-title`} className="text-lg font-semibold">
            <span className="text-meta mr-2 tabular-nums">{i + 1}.</span>
            {text(`sections.${section.id}.title`)}
          </h2>
          <p className="text-reading leading-relaxed">{text(`sections.${section.id}.intro`)}</p>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-reading leading-relaxed marker:text-meta">
            {Array.from({ length: section.points }, (_, p) => (
              <li key={p}>{text(`sections.${section.id}.points.${p + 1}`)}</li>
            ))}
          </ul>
          <SourceList ids={section.sources} />
        </section>
      ))}
    </div>
  );
}
