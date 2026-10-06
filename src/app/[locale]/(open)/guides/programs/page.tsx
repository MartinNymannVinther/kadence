import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChosenProgram } from "@/components/exercises/chosen-program";
import { OpenPageHead } from "@/components/guides/open-page-head";
import { ProgramComposer } from "@/components/exercises/program-composer";
import { ProgramGallery } from "@/components/exercises/program-gallery";
import { decodeComposition } from "@/modules/exercises/compose";
import { builtinProgramView } from "@/modules/exercises/view";

export async function generateMetadata(): Promise<Metadata> {
  const to = await getTranslations("exercises.open");
  return { title: to("title"), description: to("intro") };
}

type Search = Promise<Record<string, string | string[] | undefined>>;

const BUILTIN_PREFIX = "builtin:";

/**
 * "/guides/programs" (docs/plan-ovelser-og-programmer.md), open to anyone:
 * Kadence's own programmes, or "sammensæt dit eget" from the library. The
 * state lives in the query string, not in a session —
 * `program=builtin:<id>` picks one of Kadence's own, `c=<composition>` or
 * `compose=1` opens the composer. Everything here is built-in only; a
 * team's own programme opens inside the app (Ø-04) and downloads through
 * the same route with `program=team:<uuid>`.
 */
export default async function ProgramsPage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  const param = (key: string) => (typeof search[key] === "string" ? search[key] : undefined);
  const t = await getTranslations("exercises");
  const to = await getTranslations("exercises.open");
  const locale = await getLocale();

  const programParam = param("program");
  const compositionParam = param("c");
  const composeParam = param("compose");

  if (programParam?.startsWith(BUILTIN_PREFIX)) {
    const view = builtinProgramView(programParam.slice(BUILTIN_PREFIX.length), t);
    if (view) {
      const downloadHref = `/api/programs/download?program=${programParam}&locale=${locale}`;
      return (
        <>
          <OpenPageHead title={to("title")} intro={to("intro")} />
          <ChosenProgram program={view} downloadHref={downloadHref} />
        </>
      );
    }
  }

  if (composeParam || compositionParam !== undefined) {
    const decoded = compositionParam ? decodeComposition(compositionParam) : [];
    const notFound = Boolean(compositionParam) && decoded === null;
    return (
      <>
        <OpenPageHead title={to("title")} intro={to("intro")} />
        {notFound && (
          <Alert className="mb-6">
            <AlertDescription>{to("notFound")}</AlertDescription>
          </Alert>
        )}
        <ProgramComposer initial={decoded ?? []} />
      </>
    );
  }

  return (
    <>
      <OpenPageHead title={to("title")} intro={to("intro")} />
      {programParam && (
        <Alert className="mb-6">
          <AlertDescription>{to("notFound")}</AlertDescription>
        </Alert>
      )}
      <ProgramGallery />
    </>
  );
}
