"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Archive } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { summarise } from "./archive-summary";
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
 *
 * Only the sentence that changes is read aloud as it changes (the
 * status); the buttons and the explanation around it are not. When the
 * button pressed, or Stop, leaves the page as a run starts or ends, focus
 * goes to the panel's heading rather than to nowhere. Stop lets the
 * request on its way be answered, so what came in is counted; a panel
 * that goes while its run is under way ends the run there and then.
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
  const section = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [progress, setProgress] = useState<ArchiveProgress | null>(null);
  const [stopping, setStopping] = useState(false);
  /** Stop, and the page going: see ImportOptions. Made for each run. */
  const run = useRef<{ stop: AbortController; cutoff: AbortController } | null>(null);

  // The dialog closed or another page opened: the run ends here, rather
  // than going on with nobody seeing it and no Stop to press.
  useEffect(
    () => () => {
      run.current?.stop.abort();
      run.current?.cutoff.abort();
    },
    [],
  );

  const running = progress !== null && progress.phase !== "finished";
  const finished = progress?.phase === "finished";

  useEffect(() => {
    if (!running && !finished) return;
    const active = document.activeElement;
    if (!active || active === document.body || section.current?.contains(active))
      heading.current?.focus();
  }, [running, finished]);

  async function start(onlyBike: boolean) {
    if (state.step !== "ready") return;
    const current = { stop: new AbortController(), cutoff: new AbortController() };
    run.current = current;
    onRunning(true);
    try {
      const final = await importArchive(riderId, state.source, state.plan, {
        onlyBike,
        signal: current.stop.signal,
        cutoff: current.cutoff.signal,
        onProgress: setProgress,
      });
      if (final.imported > 0) router.refresh();
    } finally {
      run.current = null;
      onRunning(false);
    }
  }

  const close = (
    <Button type="button" variant="outline" className="w-fit max-sm:h-11" onClick={onClose}>
      {common("close")}
    </Button>
  );

  /** The sentence that changes, and is read aloud when it does. */
  function said() {
    if (state.step !== "ready") return <p>{t(state.step)}</p>;
    if (progress?.phase === "finished") return <SummaryText progress={progress} />;
    if (running)
      return (
        <p>
          {t(progress.phase === "checking" ? "checking" : "sending", {
            done: progress.done,
            total: progress.total,
          })}
        </p>
      );
    const count = state.plan.rides.length;
    return <p>{count === 0 ? t("empty") : t("found", { count })}</p>;
  }

  /** Everything around it: what to know, the progress bar and the buttons. */
  function around() {
    if (state.step === "reading") return null;
    if (state.step !== "ready" || finished) return close;
    if (running)
      return (
        <>
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
            // Not disabled: a button that is keeps no focus.
            aria-disabled={stopping}
            onClick={() => {
              setStopping(true);
              run.current?.stop.abort();
            }}
          >
            {t(stopping ? "stopping" : "stop")}
          </Button>
        </>
      );
    const { plan } = state;
    if (plan.rides.length === 0) return close;
    return (
      <>
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
      ref={section}
      aria-labelledby={headingId}
      className="border-border bg-card flex flex-col gap-2.5 rounded-xl border p-4 text-2sm leading-relaxed"
    >
      <h3
        id={headingId}
        ref={heading}
        // Reached by the keyboard only when a run starts or ends under it.
        tabIndex={-1}
        className="flex items-center gap-2 text-sm font-semibold outline-none"
      >
        <Archive aria-hidden className="text-primary size-4 shrink-0" />
        {t("title")}
      </h3>
      <div role="status" className="flex flex-col gap-2.5">
        {said()}
      </div>
      {around()}
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

function SummaryText({ progress }: { progress: ArchiveProgress }) {
  const t = useTranslations("activities.upload.archive");
  const { lines, outcome } = summarise(progress);
  return (
    <>
      {lines.length > 0 && (
        <ul className="flex flex-col gap-1">
          {lines.map((line) => (
            <li key={line.key}>{t(line.key, line.values)}</li>
          ))}
        </ul>
      )}
      {outcome && <p className="bg-muted rounded-lg px-3 py-2">{t(outcome.key, outcome.values)}</p>}
    </>
  );
}
