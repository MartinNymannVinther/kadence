"use client";

import { Search, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import type { NavMenu } from "@/app/[locale]/(app)/nav-items";
import type { SettingsItem } from "@/app/[locale]/(app)/(narrow)/settings/settings-items";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { searchGroups, type GroupKey, type Searcher } from "@/modules/search/groups";
import { normalize } from "@/modules/search/match";
import type { IndexState } from "./search-provider";
import { SearchRow } from "./search-row";
import { useSearchSources, type PaletteHit } from "./use-search-sources";

type PaletteProps = {
  state: IndexState | null;
  menu: NavMenu;
  settings: SettingsItem[];
  who: Searcher;
};

/**
 * The palette (the search approved with docs/mockups/navigation): one
 * field at the top, and under it what it finds, in groups — Ryttere, Pas,
 * Sider, Hjælp — at most five in each. On the shared Dialog, so focus is
 * held inside while it is open and goes back to whatever opened it — the
 * sidebar's field, the header's magnifier, or the place ⌘K was pressed.
 * Near the top of the screen rather than in the middle, so a phone's
 * keyboard does not cover it, and clear of the status bar when Kadence
 * runs from the home screen (ADR 0061: the page reaches under it).
 *
 * It is a combobox: focus stays in the field, ↑ and ↓ move the lit row
 * (`aria-activedescendant`), Enter opens it, Esc closes. A tap or a click
 * on a row opens it too. Opening a row closes the palette.
 */
export function SearchPalette({
  open,
  onOpenChange,
  ...props
}: PaletteProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const field = useRef<HTMLInputElement>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        initialFocus={field}
        className="top-[max(0.75rem,env(safe-area-inset-top))] flex max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top))] w-full max-w-[calc(100%-1.5rem)] translate-y-0 flex-col gap-0 overflow-hidden rounded-[14px] p-0 sm:top-[12vh] sm:max-h-[min(36rem,80vh)] sm:max-w-[560px]"
      >
        <PaletteBody {...props} field={field} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

/** What is inside: mounted while the palette is open, so it starts empty every time. */
function PaletteBody({
  state,
  menu,
  settings,
  who,
  field,
  onClose,
}: PaletteProps & { field: React.RefObject<HTMLInputElement | null>; onClose: () => void }) {
  const t = useTranslations("search");
  const common = useTranslations("common");
  const router = useRouter();
  const base = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const sources = useSearchSources({
    index: state?.status === "ready" ? state.index : null,
    menu,
    settings,
    who,
  });
  const groups = searchGroups(query, sources);
  const hits = groups.flatMap((group) => group.hits);
  // Where each group's rows start in the one list the arrows walk.
  const starts = groups.map((_, at) =>
    groups.slice(0, at).reduce((sum, group) => sum + group.hits.length, 0),
  );
  const lit = hits.length === 0 ? -1 : Math.min(active, hits.length - 1);
  const optionId = (at: number) => `${base}-option-${at}`;
  const typed = normalize(query) !== "";
  const label: Record<GroupKey, string> = {
    riders: t("groups.riders"),
    templates: t("groups.templates"),
    places: t("groups.places"),
    help: t("groups.help"),
  };

  // The lit row stays in view as the arrows walk past the list's edge.
  useEffect(() => {
    if (lit >= 0)
      document.getElementById(`${base}-option-${lit}`)?.scrollIntoView({ block: "nearest" });
  }, [base, lit]);

  function go(hit: PaletteHit) {
    onClose();
    router.push(hit.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (hits.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((lit + step + hits.length) % hits.length);
    } else if (event.key === "Enter" && lit >= 0) {
      event.preventDefault();
      go(hits[lit]!);
    }
  }

  // The quiet line under the rows: "Henter …" while the riders and the
  // library are on their way, what still works when they could not be
  // read, and "Intet fundet" when nothing matches. Nothing while nothing is
  // typed, because the places need no index.
  const status = !typed
    ? ""
    : state?.status === "loading"
      ? t("loading")
      : state?.status === "failed"
        ? t("failed")
        : hits.length === 0
          ? t("empty")
          : "";

  return (
    <>
      <DialogTitle className="sr-only">{t("label")}</DialogTitle>
      <div className="border-border has-[input:focus-visible]:border-ring flex h-14 shrink-0 items-center gap-2.5 border-b pr-1.5 pl-4 transition-colors duration-[120ms] sm:h-[3.25rem]">
        <Search aria-hidden className="text-meta size-[1.125rem] shrink-0" />
        <input
          ref={field}
          type="text"
          role="combobox"
          aria-label={t("label")}
          aria-expanded="true"
          aria-controls={`${base}-list`}
          aria-autocomplete="list"
          aria-activedescendant={lit >= 0 ? optionId(lit) : undefined}
          value={query}
          placeholder={t("placeholder")}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="go"
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="placeholder:text-label min-w-0 flex-1 bg-transparent text-base outline-none sm:text-reading"
        />
        <DialogClose
          render={<Button variant="ghost" size="icon-sm" className="text-meta max-sm:size-11" />}
        >
          <XIcon />
          <span className="sr-only">{common("close")}</span>
        </DialogClose>
      </div>

      <div
        id={`${base}-list`}
        role="listbox"
        aria-label={t("label")}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 empty:hidden"
      >
        {groups.map((group, g) => (
          <div
            key={group.key}
            role="group"
            aria-labelledby={`${base}-${group.key}`}
            className="pt-2"
          >
            <div
              id={`${base}-${group.key}`}
              aria-hidden
              className="text-label px-2.5 pt-1 pb-1 text-2xs font-medium tracking-[0.04em] uppercase"
            >
              {label[group.key]}
            </div>
            {group.hits.map((hit, h) => {
              const index = starts[g]! + h;
              return (
                <SearchRow
                  key={hit.id}
                  id={optionId(index)}
                  hit={hit}
                  active={index === lit}
                  onPick={() => go(hit)}
                  onPoint={() => setActive(index)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Always there and only empty when there is nothing to say, so a
          screen reader hears the words when they come. */}
      <p role="status" className="text-meta px-4 text-2sm [&:not(:empty)]:py-3">
        {status}
      </p>
      <p
        aria-hidden
        className="border-hairline text-meta hidden shrink-0 border-t px-4 py-2 text-2xs sm:block"
      >
        {t("hint")}
      </p>
    </>
  );
}
