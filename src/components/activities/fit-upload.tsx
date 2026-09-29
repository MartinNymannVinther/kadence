"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleCheck, CircleX, Copy, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { DeviceFolderButton, type FolderStatus } from "./device-folder-button";
import { planArchive } from "./import-archive";
import { recogniseZip, type ArchiveSource } from "./read-archive";
import { StravaArchivePanel, type ArchiveState } from "./strava-archive-panel";

type FileResult = {
  name: string;
  ok: boolean;
  activityId?: string;
  sessionId?: string | null;
  sessionTitle?: string | null;
  error?: string;
};

/** The route takes three files at a time; more are sent in turns. */
const BATCH = 3;
/** Files picked by hand in one go. */
const MAX_PICKED = 20;
/** Rides from a device's folder in one go: what the server keeps in an hour (ADR 0019). */
const MAX_FROM_DEVICE = 60;
const QUIET: FolderStatus = { doing: "nothing", said: null };

/**
 * A ride from a FIT file, the way that always works — offline, without
 * Wahoo or Garmin (dogma 2): drop the files here or pick them, and each
 * one answers on its own line — imported and matched to the session it
 * fulfilled, already there, or the decoder's reason in plain words.
 * Beside it, "Hent fra enheden" reads a plugged-in bike computer's folder
 * and sends the rides that are new (ADR 0029). A Strava archive, dropped
 * here as the zip Strava sends or picked as the folder it unpacks to, goes
 * to its own import instead (ADR 0030), a panel of its own for each
 * archive; when the panel is closed, focus goes back to the drop zone.
 * `onBusy` tells a dialog around it that an archive's run is under way.
 * Posts to /api/activities/upload, a route because a ride can be larger
 * than a server action takes.
 */
export function FitUpload({
  riderId,
  compact = false,
  onBusy,
}: {
  riderId: string;
  compact?: boolean;
  onBusy?: (busy: boolean) => void;
}) {
  const t = useTranslations("activities.upload");
  const router = useRouter();
  const inputId = useId();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [folder, setFolder] = useState<FolderStatus>(QUIET);
  const [results, setResults] = useState<FileResult[]>([]);
  const [archive, setArchive] = useState<ArchiveState | null>(null);
  // A new archive is a new panel: nothing of the last one's run is carried over.
  const [archiveNumber, setArchiveNumber] = useState(0);
  const [archiveRunning, setArchiveRunning] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const refocus = useRef(false);
  // The folder's rides arrive after a wait, from a press made renders ago:
  // whether files are on their way is asked of the moment, not of then.
  const sending = useRef(false);
  const held = busy || folder.doing !== "nothing" || archiveRunning || archive?.step === "reading";

  /** Said to the dialog around at once, in the same press, so no Escape slips in between. */
  function archiveRuns(running: boolean) {
    setArchiveRunning(running);
    onBusy?.(running);
  }

  useEffect(() => {
    if (archive !== null || !refocus.current) return;
    refocus.current = false;
    input.current?.focus();
  }, [archive]);

  function closeArchive() {
    refocus.current = true;
    setArchive(null);
  }

  async function openArchive(source: ArchiveSource) {
    setResults([]);
    setFolder(QUIET);
    setArchiveNumber((n) => n + 1);
    setArchive({ step: "reading" });
    const plan = await planArchive(source).catch(() => null);
    setArchive(plan ? { step: "ready", source, plan } : { step: "unreadable" });
  }

  /** What the rider dropped or picked: a Strava archive goes to its own import, the rest is uploaded. */
  async function receive(list: FileList | File[]) {
    const files = Array.from(list);
    const zip = files.find((f) => /\.zip$/i.test(f.name) || /zip/i.test(f.type));
    const kind = zip ? await recogniseZip(zip) : null;
    if (!kind) return send(files, "hand");
    if ("cannotOpen" in kind) {
      setResults([]);
      setArchiveNumber((n) => n + 1);
      setArchive({ step: "cannotOpen" });
    } else await openArchive(kind.strava);
  }

  async function send(list: FileList | File[], from: "hand" | "device") {
    const files = Array.from(list).slice(0, from === "device" ? MAX_FROM_DEVICE : MAX_PICKED);
    if (files.length === 0 || sending.current) return;
    sending.current = true;
    // What the folder or the archive held is about the files before these.
    if (from === "hand") {
      setFolder(QUIET);
      setArchive(null);
    }
    setBusy(true);
    setResults([]);
    const answered: FileResult[] = [];
    try {
      for (let i = 0; i < files.length; i += BATCH) {
        const batch = files.slice(i, i + BATCH);
        const refused = (error: string) => batch.map((f) => ({ name: f.name, ok: false, error }));
        const form = new FormData();
        form.set("riderId", riderId);
        // Under its own name: a file from a folder would otherwise travel
        // under its path on the device.
        for (const file of batch) form.append("file", file, file.name);
        try {
          const response = await fetch("/api/activities/upload", { method: "POST", body: form });
          const data = (await response.json()) as { results?: FileResult[]; error?: string };
          answered.push(...(data.results ?? refused(data.error ?? "generic")));
        } catch {
          answered.push(...refused("generic"));
        }
        setResults([...answered]);
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
    if (answered.some((r) => r.ok)) router.refresh();
  }

  const message = (r: FileResult) => {
    if (r.ok) return r.sessionTitle ? t("matched", { title: r.sessionTitle }) : t("unmatched");
    const code = r.error ?? "generic";
    return t.has(`error.${code}` as "error.generic")
      ? t(`error.${code}` as "error.generic")
      : t("error.generic");
  };

  return (
    <div className="flex flex-col gap-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!held) void receive(e.dataTransfer.files);
        }}
        className={cn(
          "border-input bg-secondary/40 has-focus-visible:outline-ring flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 text-center transition-colors duration-[120ms] has-focus-visible:outline-2",
          compact ? "min-h-24 py-4" : "min-h-32 py-6",
          over && !held && "border-primary bg-accent/60",
          held && "cursor-default opacity-60",
        )}
      >
        <Upload aria-hidden className="text-primary size-5" />
        <span className="text-sm font-medium">{busy ? t("busy") : t("drop")}</span>
        <span className="text-meta text-xs">{t("hint")}</span>
        <input
          ref={input}
          id={inputId}
          type="file"
          accept=".fit,.FIT,.tcx,.TCX,.gpx,.GPX,.gz,.zip,application/vnd.ant.fit,application/gpx+xml,application/vnd.garmin.tcx+xml,application/gzip,application/zip,application/octet-stream"
          multiple
          disabled={held}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) void receive(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      <DeviceFolderButton
        riderId={riderId}
        disabled={busy || archiveRunning}
        max={MAX_FROM_DEVICE}
        status={folder}
        onStatus={setFolder}
        onFresh={(files) => void send(files, "device")}
        onArchive={(source) => void openArchive(source)}
      />

      {archive && (
        <StravaArchivePanel
          key={archiveNumber}
          riderId={riderId}
          state={archive}
          onRunning={archiveRuns}
          onClose={closeArchive}
        />
      )}

      {results.length > 0 && (
        <ul
          aria-live="polite"
          aria-label={t("results")}
          // A list that scrolls is reached by the keyboard too.
          tabIndex={results.length > 6 ? 0 : undefined}
          className={cn(
            "flex flex-col gap-2",
            results.length > 6 && "focus-ring max-h-96 overflow-y-auto rounded-lg pr-1",
          )}
        >
          {results.map((r, i) => {
            const duplicate = r.error === "duplicate";
            const Icon = r.ok ? CircleCheck : duplicate ? Copy : CircleX;
            return (
              <li
                key={`${r.name}-${i}`}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg px-3 py-2 text-2sm",
                  r.ok
                    ? "bg-success-tint text-success"
                    : duplicate
                      ? "bg-muted"
                      : "bg-warning-tint",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    !r.ok && !duplicate && "text-destructive",
                  )}
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium text-foreground">{r.name}</span>
                  <span className="text-foreground">{message(r)}</span>
                  {r.ok && r.activityId && (
                    <Link
                      href={`/activities/${r.activityId}`}
                      className="focus-ring text-primary flex min-h-8 w-fit items-center font-medium hover:underline"
                    >
                      {t("open")}
                    </Link>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
