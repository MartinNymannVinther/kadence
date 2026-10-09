"use client";

import { createContext, useContext, useEffect, useEffectEvent, useState } from "react";
import type { NavMenu } from "@/app/[locale]/(app)/nav-items";
import type { SettingsItem } from "@/app/[locale]/(app)/(narrow)/settings/settings-items";
import type { Searcher } from "@/modules/search/groups";
import { searchIndexAction } from "@/modules/search/actions";
import type { SearchIndex } from "@/modules/search/service";
import { SearchPalette } from "./search-palette";

/**
 * Søg for the whole signed-in app (the search approved with
 * docs/mockups/navigation): whether the palette is open, ⌘K and Ctrl+K
 * anywhere on the page, and the palette itself, drawn once. The sidebar's
 * field and the phone header's magnifier open it through `useSearch`.
 *
 * The riders and the library are asked for the first time the palette
 * opens, not with every page, and kept for as long as the page lives; a
 * rider or a template added since shows after a reload. The index belongs
 * to one team, so after "Skift hold" the old team's is not shown — the
 * next opening asks again. A failed read is not kept either: the places
 * and the help still answer, and the next opening tries again.
 */

export type IndexState =
  { status: "loading" } | { status: "ready"; index: SearchIndex } | { status: "failed" };

type Held = IndexState & { scope: string };

type SearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** A coach searches riders as well; the field says so. */
  coach: boolean;
};

const SearchContext = createContext<SearchContextValue | null>(null);

/** The palette's switch, or null outside the signed-in app. */
export function useSearch(): SearchContextValue | null {
  return useContext(SearchContext);
}

export function SearchProvider({
  scope,
  menu,
  settings,
  who,
  children,
}: {
  /** The team the index is read for; a new team means a new index. */
  scope: string;
  /** The role's places, as the menu has them (menuFor in nav-items.ts). */
  menu: NavMenu;
  /** The settings tabs this person has (settingsGroups in settings-items.ts). */
  settings: SettingsItem[];
  who: Searcher;
  children: React.ReactNode;
}) {
  const [open, setOpenNow] = useState(false);
  const [held, setHeld] = useState<Held | null>(null);
  const state: IndexState | null = held?.scope === scope ? held : null;

  function load() {
    if (state && state.status !== "failed") return;
    const asked = scope;
    const settle = (next: IndexState) =>
      setHeld((was) => (was?.scope === asked ? { ...next, scope: asked } : was));
    setHeld({ status: "loading", scope: asked });
    searchIndexAction({}).then(
      (result) =>
        settle(result.ok ? { status: "ready", index: result.data } : { status: "failed" }),
      () => settle({ status: "failed" }),
    );
  }

  function setOpen(next: boolean) {
    setOpenNow(next);
    if (next) load();
  }

  // ⌘K on a Mac, Ctrl+K elsewhere; both everywhere, since a Mac with an
  // external keyboard, or a person used to either, should not have to know.
  // The same keys close it again.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
    if (event.key.toLowerCase() !== "k" && event.code !== "KeyK") return;
    event.preventDefault();
    if (!event.repeat) setOpen(!open);
  });
  useEffect(() => {
    const listen = (event: KeyboardEvent) => onKeyDown(event);
    document.addEventListener("keydown", listen);
    return () => document.removeEventListener("keydown", listen);
  }, []);

  return (
    <SearchContext.Provider value={{ open, setOpen, coach: who.coach }}>
      {children}
      <SearchPalette
        open={open}
        onOpenChange={setOpen}
        state={state}
        menu={menu}
        settings={settings}
        who={who}
      />
    </SearchContext.Provider>
  );
}
