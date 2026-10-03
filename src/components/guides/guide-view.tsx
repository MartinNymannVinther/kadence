import { useTranslations } from "next-intl";
import { GUIDES, guideNumbers, type GuideId } from "@/modules/guides/guides";
import { SourceLinks } from "./source-links";

/**
 * One open guide: a table of contents, then each section with its
 * introduction, its points and its sources, in the coach guide's form
 * (ADR 0021). A section that is the milieu's experience rather than
 * written rules says so above its points. The numbers in the words come
 * from the modules that own them (`guideNumbers`).
 */
export function GuideView({
  guide,
  extra = {},
}: {
  guide: GuideId;
  /** Content shown inside a section, after its points: the food guide's recipes. */
  extra?: Partial<Record<string, React.ReactNode>>;
}) {
  const t = useTranslations(`guides.${guide}`);
  const open = useTranslations("open");
  const values = guideNumbers();
  const text = (key: string) => t(key as "title", values);
  const sections = GUIDES[guide];

  return (
    <div className="flex flex-col gap-8">
      <nav aria-labelledby="guide-contents" className="flex flex-col gap-2">
        <h2 id="guide-contents" className="text-base font-semibold">
          {open("contents")}
        </h2>
        <ol className="grid gap-x-6 gap-y-1 text-2sm sm:grid-cols-2">
          {sections.map((section, i) => (
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

      {sections.map((section, i) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-title`}
          className="border-border bg-card flex scroll-mt-20 flex-col gap-3 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5"
        >
          <h2 id={`${section.id}-title`} className="text-lg font-semibold">
            <span className="text-meta mr-2 tabular-nums">{i + 1}.</span>
            {text(`sections.${section.id}.title`)}
          </h2>
          {section.experience && (
            <p className="bg-sticky text-sticky-ink rounded-md px-3 py-2 text-2sm leading-relaxed">
              <span className="font-semibold">{open("experience")}.</span> {open("experienceNote")}
            </p>
          )}
          <p className="text-reading leading-relaxed">{text(`sections.${section.id}.intro`)}</p>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-reading leading-relaxed marker:text-[var(--meta)]">
            {Array.from({ length: section.points }, (_, p) => (
              <li key={p}>{text(`sections.${section.id}.points.${p + 1}`)}</li>
            ))}
          </ul>
          {extra[section.id]}
          <SourceLinks ids={section.sources} />
        </section>
      ))}

      <p className="text-meta text-2sm leading-relaxed">{open("updated")}</p>
    </div>
  );
}
