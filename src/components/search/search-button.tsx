"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { useSearch } from "./search-provider";

const unchanging = () => () => {};

/**
 * The keys that open Søg, as this keyboard prints them: ⌘K on a Mac (an
 * iPad says Macintosh too), Ctrl K everywhere else. Both work everywhere;
 * this is only the hint. The server renders ⌘K and a PC corrects it once
 * the page is live.
 */
function useShortcut(): string {
  const mac = useSyncExternalStore(
    unchanging,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent),
    () => true,
  );
  return mac ? "⌘K" : "Ctrl K";
}

/**
 * The search field at the top of the sidebar, under the team's name: a
 * quiet field that opens the palette. It is drawn on the sidebar's own
 * tokens — card, border, meta — which the moss rail re-points, so it reads
 * right on paper and on moss. The button takes focus before it opens the
 * palette, so focus comes back to it on close even where a click does not
 * focus a button (Safari).
 */
export function SearchButton({ className }: { className?: string }) {
  const search = useSearch();
  const t = useTranslations("search");
  const keys = useShortcut();
  if (!search) return null;
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={search.open}
      aria-keyshortcuts="Meta+K Control+K"
      title={t("shortcut", { keys })}
      onClick={(event) => {
        event.currentTarget.focus();
        search.setOpen(true);
      }}
      className={cn(
        "focus-ring border-border bg-card text-meta hover:text-foreground flex h-9 w-full items-center gap-2 rounded-[10px] border px-2.5 text-2sm transition-colors duration-[120ms] ease-out",
        className,
      )}
    >
      <Search aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left">
        {search.coach ? t("open") : t("openOther")}
      </span>
      <kbd
        aria-hidden
        className="border-border shrink-0 rounded-[5px] border px-1.5 font-sans text-2xs leading-[1.6] font-medium"
      >
        {keys}
      </kbd>
    </button>
  );
}

/** The magnifier in the phone's header, before the person: a thumb's way into the palette. */
export function SearchIconButton() {
  const search = useSearch();
  const t = useTranslations("search");
  if (!search) return null;
  return (
    <button
      type="button"
      aria-label={t("label")}
      aria-haspopup="dialog"
      aria-expanded={search.open}
      onClick={(event) => {
        event.currentTarget.focus();
        search.setOpen(true);
      }}
      className="focus-ring text-meta hover:text-foreground hover:bg-muted flex size-11 items-center justify-center rounded-[10px] transition-colors duration-[120ms] ease-out"
    >
      <Search aria-hidden className="size-5" />
    </button>
  );
}
