import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { InstallationJobs } from "@/components/insight/installation-jobs";
import { PilotClubs } from "@/components/insight/pilot-clubs";
import { personsSummary, platformOverview } from "@/core/admin/overview";
import { getSession } from "@/core/auth/session";
import { formatDay } from "@/core/dates";
import { env } from "@/core/env";
import { jobsOverview } from "@/core/jobs/status";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.installation");
  return { title: t("title") };
}

/**
 * The installation's owner sees the clubs on it (ADR 0048): how many
 * coaches, riders and parents, when someone was last in, how much space
 * their files take and the AI calls of the last day, and the pilot's
 * three numbers for the last full week (ADR 0066). Counts only; the
 * database hands nothing else over. People who use Kadence alone are one
 * line, "Enkeltpersoner", with how many, how many were in this week,
 * their files and AI calls (ADR 0080). Below them, the background work
 * (ADR 0085): jobs waiting and given up, and when a worker last took one.
 * Anyone else gets a 404, as for admission.
 */
export default async function InstallationPage() {
  const session = await getSession();
  const overview = session ? await platformOverview(session.user.id) : null;
  if (!overview) notFound();
  // Clubs one by one; persons alone as one line of counts, never names (ADR 0080).
  const clubs = overview.filter((c) => c.kind === "club");
  const persons = personsSummary(overview);
  const jobs = await jobsOverview();

  const t = await getTranslations("settings.installation");
  const locale = await getLocale();
  const total = (key: "coaches" | "riders" | "parents") => clubs.reduce((n, c) => n + c[key], 0);
  const megabytes = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-meta text-2sm leading-relaxed">{t("subtitle")}</p>
        <p className="text-2sm">
          {t("totals", {
            clubs: clubs.length,
            coaches: total("coaches"),
            riders: total("riders"),
            parents: total("parents"),
          })}
        </p>
      </div>

      {clubs.length === 0 ? (
        <p className="border-border bg-card rounded-xl border p-4 text-2sm">{t("none")}</p>
      ) : (
        <div className="border-border bg-card overflow-x-auto rounded-xl border shadow-surface">
          <table className="w-full min-w-[40rem] border-collapse text-2sm">
            <thead>
              <tr className="text-label text-left text-xs">
                <th className="px-3 py-2 font-medium">{t("club")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("coaches")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("riders")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("parents")}</th>
                <th className="px-3 py-2 font-medium">{t("lastSeen")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("files")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("ai")}</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club) => (
                <tr key={club.orgId} className="border-border border-t tabular-nums">
                  <td className="px-3 py-2">
                    <span className="font-medium">{club.name}</span>
                    <span className="text-meta block text-xs">
                      {t("created", { date: formatDay(club.createdAt, locale) })}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{club.coaches}</td>
                  <td className="px-3 py-2 text-right">{club.riders}</td>
                  <td className="px-3 py-2 text-right">{club.parents}</td>
                  <td className="px-3 py-2">
                    {club.lastSeen ? formatDay(club.lastSeen, locale) : t("never")}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {t("megabytes", { mb: megabytes(club.fileBytes) })}
                  </td>
                  <td className="px-3 py-2 text-right">{club.aiCallsDay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {persons.count > 0 && (
        <div className="border-border bg-card flex flex-col gap-1 rounded-xl border p-4 text-2sm shadow-surface">
          <p className="font-medium">{t("persons.title")}</p>
          <p className="tabular-nums">
            {t("persons.counts", {
              count: persons.count,
              seen: persons.seenWeek,
              mb: megabytes(persons.fileBytes),
              ai: persons.aiCallsDay,
            })}
          </p>
          <p className="text-meta text-xs">{t("persons.privacy")}</p>
        </div>
      )}

      {clubs.length > 0 && <PilotClubs clubs={clubs} />}

      <InstallationJobs jobs={jobs} worker={env.WORKER === "on"} />

      <div className="border-border bg-card flex flex-col gap-1.5 rounded-xl border p-4 text-2sm leading-relaxed">
        <p>{t("privacy")}</p>
        <p>
          {t("newClub")}{" "}
          <Link href="/settings/access" className="focus-ring text-primary hover:underline">
            {t("toAccess")}
          </Link>
        </p>
        <p className="text-meta">{t("help")}</p>
      </div>
    </div>
  );
}
