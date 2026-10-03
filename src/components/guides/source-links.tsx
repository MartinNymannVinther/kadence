import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { GUIDE_SOURCES, type GuideSourceId } from "@/modules/guides/sources";

/** A section's sources: title, publisher and year, each linked to the original. */
export function SourceLinks({ ids }: { ids: readonly GuideSourceId[] }) {
  const t = useTranslations("open");
  return (
    <div className="flex flex-col gap-1">
      <p className="text-label text-xs font-medium">{t("sources")}</p>
      <ul className="flex flex-col gap-0.5">
        {ids.map((id) => {
          const source = GUIDE_SOURCES[id];
          return (
            <li key={id} className="text-2sm leading-snug">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring text-primary inline-flex items-baseline gap-1 hover:underline"
              >
                <span>
                  {source.title}
                  <span className="text-meta">
                    {" "}
                    · {source.publisher}
                    {source.year ? `, ${source.year}` : ""}
                  </span>
                </span>
                <ExternalLink aria-hidden className="size-3 shrink-0 self-center" />
                <span className="sr-only">{t("opensElsewhere")}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
