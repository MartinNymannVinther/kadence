import { ChevronRight, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BUILTIN_PROGRAMS } from "@/modules/exercises/builtin";
import { programMinutes } from "@/modules/exercises/dose";
import { builtinProgramView } from "@/modules/exercises/view";

/**
 * The open page's gallery (docs/plan-ovelser-og-programmer.md): Kadence's
 * own programmes as cards — name, description, how many parts, about how
 * long — and "Sammensæt dit eget" to build one from the library. Picking a
 * card sets `program=builtin:<id>`; the page resolves it.
 */
export async function ProgramGallery() {
  const t = await getTranslations("exercises");
  const to = await getTranslations("exercises.open");
  const programs = BUILTIN_PROGRAMS.map((p) => ({ id: p.id, view: builtinProgramView(p.id, t)! }));

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="programs-builtin" className="flex flex-col gap-3">
        <h2 id="programs-builtin" className="text-lg font-semibold">
          {to("builtinHeading")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {programs.map(({ id, view }) => (
            <li key={id}>
              <Link
                href={`/guides/programs?program=builtin:${id}`}
                className="focus-ring border-border bg-card hover:border-primary flex h-full flex-col gap-1.5 rounded-xl border p-4 shadow-surface"
              >
                <span className="text-reading font-semibold">{view.title}</span>
                <span className="text-meta text-2sm leading-relaxed">{view.description}</span>
                <span className="text-meta mt-1 text-2sm tabular-nums">
                  {to("parts", { count: view.parts.length })} ·{" "}
                  {t("dose.minutes", { minutes: programMinutes(view) })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Link
        href="/guides/programs?compose=1"
        className="focus-ring border-primary bg-card hover:bg-accent flex items-start gap-3 rounded-xl border-2 p-4 shadow-surface"
      >
        <Sparkles aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
        <span className="flex flex-1 flex-col gap-1">
          <span className="text-reading font-semibold">{to("composeTitle")}</span>
          <span className="text-meta text-2sm leading-relaxed">{to("composeBody")}</span>
        </span>
        <ChevronRight aria-hidden className="text-meta mt-0.5 size-4 shrink-0" />
      </Link>
    </div>
  );
}
