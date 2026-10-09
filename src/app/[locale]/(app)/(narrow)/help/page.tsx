import type { Metadata } from "next";
import { BookOpen, HeartHandshake } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { GuideDoor } from "@/components/guides/guide-door";
import { TopicCards } from "@/components/guides/topic-cards";
import { getOrgContext } from "@/core/auth/session";
import { featureOn } from "@/core/features";
import { whoAmI } from "@/modules/team/access";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("help");
  return { title: t("title") };
}

const HOW_TO = [
  "roles",
  "password",
  "words",
  "overview",
  "calendar",
  "search",
  "sessions",
  "exercises",
  "done",
  "comments",
  "season",
  "load",
  "warnings",
  "checkin",
  "reminders",
  "devices",
  "toDevice",
  "rulle",
  "keys",
  "strava",
  "parents",
  "parentsPage",
  "ai",
  "data",
  "pilot",
] as const;

/**
 * "Viden og hjælp": knowledge behind one door. First the two guides — the
 * coach guide for everyone but a parent who is nothing else, and the
 * parents' guide for everyone — then "Viden om sporten", the open guides
 * and calculators this installation shows (ADR 0047, 0057), which anyone
 * can read without signing in. Then how the tool works, in the rhythm a
 * season lives in: who may do what, the coach's Overblik, the calendar,
 * sessions and templates, "done" and RPE, the comments, the season plan
 * and DCU, the load, the warnings, the check-in, uploads and devices,
 * Rulle on the trainer, upload keys, a Strava archive, the parents, the
 * AI, then the way out. Each wave adds the part it built. Every section
 * can be linked to: `/help#help-keys`. Rulle's world is described only
 * where the installation has it on (ADR 0057).
 */
export default async function HelpPage() {
  const t = await getTranslations("help");
  const guide = await getTranslations("coachGuide");
  const parents = await getTranslations("parents.guide");
  const ctx = await getOrgContext();
  const me = ctx ? await whoAmI(ctx.orgId, ctx.userId) : null;
  const parentOnly = !!me && !me.isCoach && !me.rider && me.children.length > 0;
  const rulleWorld = featureOn("rulleWorld");

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-meta mt-1 text-sm">{t("intro")}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {!parentOnly && (
          <GuideDoor
            href="/help/coach"
            icon={BookOpen}
            title={guide("title")}
            body={guide("fromHelp")}
            open={guide("open")}
          />
        )}
        <GuideDoor
          href="/help/parents"
          icon={HeartHandshake}
          title={parents("title")}
          body={parents("fromHelp")}
          open={parents("open")}
          className={parentOnly ? "sm:col-span-2" : undefined}
        />
      </div>

      <section aria-labelledby="help-sport" className="mt-10 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="help-sport" className="text-xl font-semibold">
            {t("knowledge.title")}
          </h2>
          <p className="text-meta text-2sm leading-relaxed">{t("knowledge.hint")}</p>
        </div>
        <TopicCards />
      </section>

      <h2 className="mt-10 text-xl font-semibold">{t("howToTitle")}</h2>
      <p className="text-meta mt-1 text-2sm leading-relaxed">{t("howToHint")}</p>
      {HOW_TO.map((key) => (
        <section key={key} id={`help-${key}`} className="scroll-mt-20">
          <h3 className="text-primary mt-5 text-reading font-semibold">
            {t(`howTo.${key}.title`)}
          </h3>
          <p className="mt-1.5 text-reading leading-relaxed">{t(`howTo.${key}.body`)}</p>
          {key === "rulle" && rulleWorld && (
            <p className="mt-1.5 text-reading leading-relaxed">{t("howTo.rulle.world")}</p>
          )}
        </section>
      ))}

      <p className="border-border bg-card text-meta mt-10 rounded-xl border p-4 text-sm">
        {t("closing")}
      </p>
    </div>
  );
}
