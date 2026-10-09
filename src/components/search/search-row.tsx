"use client";

import { CircleHelp, Settings } from "lucide-react";
import { NAV_ICONS } from "@/app/[locale]/(app)/nav-icons";
import { SportIcon } from "@/components/training/sport-icon";
import { cn } from "@/lib/utils";
import type { Mark, PaletteHit } from "./use-search-sources";

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/** The row's mark: a rider's initials, the sport, or the place's icon from the menu. */
function RowMark({ mark, active }: { mark: Mark; active: boolean }) {
  const tone = active ? "text-accent-foreground" : "text-meta";
  switch (mark.kind) {
    case "rider":
      return (
        <span
          aria-hidden
          className="bg-secondary text-secondary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-2xs font-semibold"
        >
          {initials(mark.name)}
        </span>
      );
    case "template":
      return <SportIcon sport={mark.sport} className={tone} />;
    case "place": {
      const Icon = NAV_ICONS[mark.key];
      return <Icon aria-hidden className={cn("size-4 shrink-0", tone)} />;
    }
    case "settings":
      return <Settings aria-hidden className={cn("size-4 shrink-0", tone)} />;
    case "help":
      return <CircleHelp aria-hidden className={cn("size-4 shrink-0", tone)} />;
  }
}

/**
 * One row of Søg: an option in the palette's listbox, lit while it is
 * the active one (`aria-activedescendant` on the field points at it). It
 * is never focused itself — focus stays in the field, so typing goes on —
 * and a press on it does not take focus from the field either.
 */
export function SearchRow({
  id,
  hit,
  active,
  onPick,
  onPoint,
}: {
  id: string;
  hit: PaletteHit;
  active: boolean;
  onPick: () => void;
  /** The pointer moved onto the row: it becomes the active one. */
  onPoint: () => void;
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      onMouseDown={(event) => event.preventDefault()}
      onPointerMove={onPoint}
      onClick={onPick}
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-1.5 text-sm sm:min-h-9",
        active ? "bg-accent text-accent-foreground" : "text-foreground",
      )}
    >
      <RowMark mark={hit.mark} active={active} />
      <span className="min-w-0 truncate">{hit.label}</span>
      {hit.meta ? (
        <span className={cn("shrink-0 text-xs", active ? "text-accent-foreground" : "text-meta")}>
          {hit.meta}
        </span>
      ) : null}
    </div>
  );
}
