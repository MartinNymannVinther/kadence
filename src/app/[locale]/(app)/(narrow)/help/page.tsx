import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getOrgContext } from "@/core/auth/session";
import { Link } from "@/i18n/navigation";
import { whoAmI } from "@/modules/team/access";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("help");
  return { title: t("title") };
}

const HOW_TO = [
  "roles",
  "password",
  "calendar",
  "sessions",
  "done",
  "comments",
  "season",
  "load",
  "warnings",
  "checkin",
  "devices",
  "toDevice",
  "rulle",
  "keys",
  "strava",
  "parents",
  "parentsPage",
  "ai",
  "data",
] as const;

/**
 * How the tool works, in the rhythm a season lives in: who may do what,
 * the calendar, sessions and templates, "done" and RPE, the comments, the
 * season plan and DCU, the load, the warnings, the check-in, uploads and
 * devices, Rulle on the trainer, upload keys, a Strava archive, the parents, the AI, then the way out. Each wave
 * adds the part it built. Every section can be linked to: `/help#help-keys`.
 * The coach guide is offered to coaches and riders; a parent who is
 * neither has the parents' page instead, so the card is left out for them.
 */
export default async function HelpPage() {
  const t = await getTranslations("help");
  const guide = await getTranslations("coachGuide");
  const ctx = await getOrgContext();
  const me = ctx ? await whoAmI(ctx.orgId, ctx.userId) : null;
  const parentOnly = !!me && !me.isCoach && !me.rider && me.children.length > 0;

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-meta mt-1 text-sm">{t("intro")}</p>

      {!parentOnly && (
        <Link
          href="/help/coach"
          className="focus-ring border-border bg-card hover:border-primary mt-6 flex items-start gap-3 rounded-xl border p-4 shadow-[var(--surface-shadow)]"
        >
          <BookOpen aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
          <span className="flex flex-col gap-1">
            <span className="text-reading font-semibold">{guide("title")}</span>
            <span className="text-meta text-2sm leading-relaxed">{guide("fromHelp")}</span>
            <span className="text-primary text-2sm font-medium">{guide("open")}</span>
          </span>
        </Link>
      )}

      <h2 className="mt-10 text-xl font-semibold">{t("howToTitle")}</h2>
      {HOW_TO.map((key) => (
        <section key={key} id={`help-${key}`} className="scroll-mt-20">
          <h3 className="text-primary mt-5 text-reading font-semibold">
            {t(`howTo.${key}.title`)}
          </h3>
          <p className="mt-1.5 text-reading leading-relaxed">{t(`howTo.${key}.body`)}</p>
        </section>
      ))}

      <p className="border-border bg-card text-meta mt-10 rounded-xl border p-4 text-sm">
        {t("closing")}
      </p>
    </div>
  );
}
