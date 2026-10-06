"use client";

import { ChevronDown, ChevronUp, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatEntry, type BleLog } from "./bluetooth/ble-log";

/**
 * Bluetooth diagnostics, shown only with `?ble=log` on the URL
 * (TECH-DEBT.md "Rulle has never met a real trainer";
 * docs/rulle-proevetur.md is the checklist it is for): the trainer's and
 * the strap's last events, timestamped from when the page opened.
 * Collapsed by default so it stays out of the rider's way; "Kopiér log"
 * puts every line on the clipboard as plain text. Nothing here is sent
 * anywhere, and closing the tab forgets it. The log keeps growing while
 * the panel is collapsed — collapsing only hides the list.
 */
export function BleLogPanel({ log }: { log: BleLog }) {
  const t = useTranslations("rulle.log");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const entries = useSyncExternalStore(log.subscribe, log.getSnapshot, log.getSnapshot);
  const [justCopied, setJustCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => clearTimeout(copyTimer.current), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, open]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(log.text());
      clearTimeout(copyTimer.current);
      setJustCopied(true);
      copyTimer.current = setTimeout(() => setJustCopied(false), 2000);
    } catch {
      toast.error(tCommon("copyFailed"));
    }
  }

  return (
    <div
      className="bg-card/90 border-border fixed top-3 left-3 z-50 flex max-h-[70vh] w-[min(92vw,26rem)] flex-col overflow-hidden rounded-xl border shadow-surface"
      title={t("hint")}
    >
      <button
        type="button"
        className="text-meta flex min-h-11 items-center justify-between gap-2 px-3 text-left text-xs font-semibold tracking-wide uppercase sm:min-h-9"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{t("title")}</span>
        <span className="flex items-center gap-2 font-normal normal-case">
          <span className="tabular-nums">{t("count", { count: entries.length })}</span>
          {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </span>
      </button>
      {open && (
        <div className="border-border flex min-h-0 flex-1 flex-col gap-2 border-t p-2">
          <div
            ref={scrollRef}
            className="bg-background/60 min-h-24 flex-1 overflow-y-auto rounded-md p-2 font-mono text-[11px] leading-relaxed break-all"
          >
            {entries.length === 0 ? (
              <p className="text-meta">{t("empty")}</p>
            ) : (
              entries.map((entry, i) => <p key={i}>{formatEntry(entry)}</p>)
            )}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => void onCopy()}>
            <Copy data-icon="inline-start" />
            {justCopied ? t("copied") : t("copy")}
          </Button>
        </div>
      )}
    </div>
  );
}
