import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ProgramView } from "@/modules/exercises/types";
import { DownloadActions } from "./download-actions";
import { ProgramViewer } from "./program-viewer";

/**
 * One of Kadence's own programmes on the open page: a way back to the
 * gallery, its name and description, the download and print actions, and
 * the live viewer (docs/plan-ovelser-og-programmer.md).
 */
export async function ChosenProgram({
  program,
  downloadHref,
}: {
  program: ProgramView;
  downloadHref: string;
}) {
  const t = await getTranslations("exercises.open");
  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/guides/programs"
        className="focus-ring text-meta hover:text-foreground flex w-fit items-center gap-1 text-2sm print:hidden"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {t("backToGallery")}
      </Link>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-2xl font-semibold">{program.title}</h2>
        {program.description && (
          <p className="text-reading leading-relaxed">{program.description}</p>
        )}
      </div>
      <DownloadActions downloadHref={downloadHref} printTitle={program.title} />
      <ProgramViewer program={program} />
    </div>
  );
}
