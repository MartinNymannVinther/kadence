"use client";

import { useId, useRef, useState } from "react";
import { Archive } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { importArchive, type ArchivePlan, type ArchiveProgress } from "./import-archive";
import type { ArchiveSource } from "./read-archive";

export type ArchiveState =
  | { step: "reading" }
  | { step: "cannotOpen" }
  | { step: "unreadable" }
  | { step: "ready"; source: ArchiveSource; plan: ArchivePlan };

/**
 * A Strava archive dropped on the upload (ADR 0030): what it holds, in
 * words, before anything is sent — how many activities, how many are not
 * rides — then the run with its progress, then what came of it. The rider
 * chooses rides only or everything; a run that stops says how to go on.
 */
export function StravaArchivePanel({
  riderId,
  state,
  onRunning,
  onClose,
}: {
  riderId: string;
  state: ArchiveState;
  onRunning: (running: boolean) => void;
  onClose: () => void;
}) {
  const t = useTranslations("activities.upload.archive");
  const common = useTranslations("common");
  const router = useRouter();
  const headingId = useId();
  const [progress, setProgress] = useState<ArchiveProgress | null>(null);
  const controller = useRef<AbortController | null>(null);

  async function start(onlyBike: boolean) {
    if (state.step !== "ready") return;
    controller.current = new AbortController();
    onRunning(true);
    try {
      const final = await importArchive(riderId, state.source, state.plan, {
        onlyBike,
        signal: controller.current.signal,
        onProgress: setProgress,
      });
      if (final.imported > 0) router.refresh();
    } finally {
      controller.current = null;
      onRunning(false);
    }
  }

  const running = progress !== null && progress.phase !== "finished";
  const close = (
    <Button type="button" variant="outline" className="w-fit max-sm:h-11" onClick={onClose}>
      {common("close")}
    </Button>
  );

  function body() {
    if (state.step === "reading") return <p>{t("reading")}</p>;
    if (state.step === "cannotOpen" || state.step === "unreadable")
      return (
        <>
          <p>{t(state.step)}</p>
          {close}
        </>
      );
    const { plan } = state;
    if (progress?.phase === "finished") return <Summary progress={progress} close={close} />;
    if (running)
      return (
        <>
          <p>
            {t(progress.phase === "checking" ? "checking" : "sending", {
              done: progress.done,
              total: progress.total,
            })}
          </p>
          <progress
            className="accent-primary h-2 w-full"
            value={progress.done}
            max={Math.max(progress.total, 1)}
            aria-label={t("progress")}
          />
          <Button
            type="button"
            variant="outline"
            className="w-fit max-sm:h-11"
            onClick={() => controller.current?.abort()}
          >
            {t("stop")}
          </Button>
        </>
      );
    if (plan.rides.length === 0)
      return (
        <>
          <p>{t("empty")}</p>
          {close}
        </>
      );
    return (
      <>
        <p>{t("found", { count: plan.rides.length })}</p>
        {plan.other > 0 && <p>{t("others", { count: plan.other })}</p>}
        {!plan.named && <p>{t("noNames")}</p>}
        <p className="text-meta">{t("how")}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="max-sm:h-11" onClick={() => void start(true)}>
            {t("bikeOnly")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="max-sm:h-11"
            onClick={() => void start(false)}
          >
            {t("all")}
          </Button>
          <Button type="button" variant="ghost" className="max-sm:h-11" onClick={onClose}>
            {common("cancel")}
          </Button>
        </div>
      </>
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      className="border-border bg-card flex flex-col gap-2.5 rounded-xl border p-4 text-2sm leading-relaxed"
    >
      <h3 id={headingId} className="flex items-center gap-2 text-sm font-semibold">
        <Archive aria-hidden className="text-primary size-4 shrink-0" />
        {t("title")}
      </h3>
      <div role="status" className="flex flex-col gap-2.5">
        {body()}
      </div>
      {!running && (
        <Link
          href="/help#help-strava"
          className="focus-ring text-primary flex min-h-9 w-fit items-center font-medium hover:underline"
        >
          {t("help")}
        </Link>
      )}
    </section>
  );
}

function Summary({ progress, close }: { progress: ArchiveProgress; close: React.ReactNode }) {
  const t = useTranslations("activities.upload.archive");
  const lines = [
    progress.imported > 0 ? t("imported", { count: progress.imported }) : "",
    progress.known > 0 ? t("known", { count: progress.known }) : "",
    progress.skipped > 0 ? t("skipped", { count: progress.skipped }) : "",
    progress.unreadable > 0 ? t("unreadableFiles", { count: progress.unreadable }) : "",
  ].filter(Boolean);
  const hours = Math.max(1, Math.ceil(progress.retryAfterSeconds / 3600));
  const outcome =
    progress.outcome === "limit"
      ? t("limit", { count: progress.left, hours })
      : progress.outcome === "signedOut"
        ? t("signedOut")
        : progress.outcome === "failed"
          ? t("failed", { count: progress.left })
          : progress.outcome === "cancelled"
            ? t("cancelled", { count: progress.left })
            : "";
  return (
    <>
      {lines.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p>{t("nothing")}</p>
      )}
      {outcome && <p className="bg-muted rounded-lg px-3 py-2">{outcome}</p>}
      {close}
    </>
  );
}
