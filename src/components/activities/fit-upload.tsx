"use client";

import { useId, useState } from "react";
import { CircleCheck, CircleX, Copy, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type FileResult = {
  name: string;
  ok: boolean;
  activityId?: string;
  sessionId?: string | null;
  sessionTitle?: string | null;
  error?: string;
};

/** The route takes five files at a time; more are sent in turns. */
const BATCH = 3;

/**
 * A ride from a FIT file, the way that always works — offline, without
 * Wahoo or Garmin (dogma 2): drop the files here or pick them, and each
 * one answers on its own line — imported and matched to the session it
 * fulfilled, already there, or the decoder's reason in plain words.
 * Posts to /api/activities/upload, a route because a ride can be larger
 * than a server action takes.
 */
export function FitUpload({ riderId, compact = false }: { riderId: string; compact?: boolean }) {
  const t = useTranslations("activities.upload");
  const router = useRouter();
  const inputId = useId();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<FileResult[]>([]);

  async function send(list: FileList | File[]) {
    const files = Array.from(list).slice(0, 20);
    if (files.length === 0 || busy) return;
    setBusy(true);
    setResults([]);
    const answered: FileResult[] = [];
    for (let i = 0; i < files.length; i += BATCH) {
      const form = new FormData();
      form.set("riderId", riderId);
      for (const file of files.slice(i, i + BATCH)) form.append("file", file);
      try {
        const response = await fetch("/api/activities/upload", { method: "POST", body: form });
        const data = (await response.json()) as { results?: FileResult[]; error?: string };
        if (data.results) answered.push(...data.results);
        else
          answered.push(
            ...files
              .slice(i, i + BATCH)
              .map((f) => ({ name: f.name, ok: false, error: data.error ?? "generic" })),
          );
      } catch {
        answered.push(
          ...files.slice(i, i + BATCH).map((f) => ({ name: f.name, ok: false, error: "generic" })),
        );
      }
      setResults([...answered]);
    }
    setBusy(false);
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
          void send(e.dataTransfer.files);
        }}
        className={cn(
          "border-input bg-secondary/40 has-focus-visible:outline-ring flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 text-center transition-colors duration-[120ms] has-focus-visible:outline-2",
          compact ? "min-h-24 py-4" : "min-h-32 py-6",
          over && "border-primary bg-accent/60",
          busy && "opacity-60",
        )}
      >
        <Upload aria-hidden className="text-primary size-5" />
        <span className="text-sm font-medium">{busy ? t("busy") : t("drop")}</span>
        <span className="text-meta text-xs">{t("hint")}</span>
        <input
          id={inputId}
          type="file"
          accept=".fit,.FIT,application/vnd.ant.fit,application/octet-stream"
          multiple
          disabled={busy}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) void send(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {results.length > 0 && (
        <ul aria-live="polite" className="flex flex-col gap-2">
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
