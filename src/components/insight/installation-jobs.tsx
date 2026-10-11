import { useLocale, useTranslations } from "next-intl";
import type { JobsOverview } from "@/core/jobs/status";
import { formatStamp } from "@/core/dates";

/**
 * The background work, for the installation's owner (docs/adr/0085): how
 * many jobs are waiting, how many gave up, how long the oldest has
 * waited, when a worker last took one, and whether a worker container or
 * the app itself runs them. Counts and a time; no kind, no team.
 */
export function InstallationJobs({ jobs, worker }: { jobs: JobsOverview; worker: boolean }) {
  const t = useTranslations("settings.installation");
  const locale = useLocale();
  const minutes = Math.floor(jobs.oldestPendingSeconds / 60);

  return (
    <div className="border-border bg-card flex flex-col gap-1 rounded-xl border p-4 text-2sm shadow-surface">
      <p className="font-medium">{t("jobs.title")}</p>
      <p className="tabular-nums">
        {t("jobs.counts", { pending: jobs.pending, failed: jobs.failed })}
        {jobs.pending > 0 && minutes > 0 ? ` ${t("jobs.oldest", { minutes })}` : null}
      </p>
      <p className="tabular-nums">
        {jobs.lastStartedAt
          ? t("jobs.last", { when: formatStamp(jobs.lastStartedAt, locale) })
          : t("jobs.never")}{" "}
        {worker ? t("jobs.inWorker") : t("jobs.inApp")}
      </p>
      {jobs.failed > 0 && <p className="text-meta text-xs">{t("jobs.failedHelp")}</p>}
    </div>
  );
}
