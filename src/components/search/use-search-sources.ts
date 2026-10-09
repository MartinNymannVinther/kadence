"use client";

import { useTranslations } from "next-intl";
import { labelKey, type NavKey, type NavMenu } from "@/app/[locale]/(app)/nav-items";
import type { SettingsItem } from "@/app/[locale]/(app)/(narrow)/settings/settings-items";
import { durationText } from "@/components/training/duration";
import {
  riderHref,
  searchableRiders,
  templateHref,
  type Hit,
  type Searcher,
  type Sources,
} from "@/modules/search/groups";
import { HELP_TOPICS, helpHref } from "@/modules/search/help-topics";
import type { SearchIndex } from "@/modules/search/service";

/** What a row shows before its words: initials, the sport, or the place's own icon. */
export type Mark =
  | { kind: "rider"; name: string }
  | { kind: "template"; sport: string }
  | { kind: "place"; key: NavKey }
  | { kind: "settings" }
  | { kind: "help" };

export type PaletteHit = Hit & { mark: Mark };

/**
 * Everything Søg can find, in the reader's words: the riders and the
 * library from the index (empty until it has been read), the menu's places
 * as the menu names them — the child by first name, "Overblik" for a
 * coach — the settings tabs as the settings name them, and the sections
 * of Hjælp by their titles. Ids are unique across the groups, so a row
 * can be told apart wherever it lands.
 */
export function useSearchSources({
  index,
  menu,
  settings,
  who,
}: {
  index: SearchIndex | null;
  menu: NavMenu;
  settings: SettingsItem[];
  who: Searcher;
}): Sources<PaletteHit> {
  const nav = useTranslations("app.nav");
  const tabs = useTranslations("settings.nav");
  const help = useTranslations("help");
  const sports = useTranslations("training.sport");
  const duration = useTranslations("training.duration");

  const riders = searchableRiders(index?.riders ?? [], who).map((rider): PaletteHit => ({
    id: `rider:${rider.id}`,
    label: rider.name,
    meta: rider.id === who.riderId ? nav("me") : undefined,
    href: riderHref(rider.id, who),
    mark: { kind: "rider", name: rider.name },
  }));

  const templates = (index?.templates ?? []).map((template): PaletteHit => {
    const sport = sports.has(template.sport) ? sports(template.sport) : template.sport;
    return {
      id: `template:${template.id}`,
      label: template.name,
      meta:
        template.plannedMinutes > 0
          ? `${sport} · ${durationText(template.plannedMinutes, duration)}`
          : sport,
      href: templateHref(template.id),
      mark: { kind: "template", sport: template.sport },
    };
  });

  const places = [...menu.primary, ...menu.more].map((item): PaletteHit => ({
    id: `place:${item.key}`,
    label: item.text ?? nav(labelKey(item)),
    href: item.href,
    mark: { kind: "place", key: item.key },
  }));

  const settingsWord = nav("settings");
  const tabsHits = settings.map((item): PaletteHit => ({
    id: `settings:${item.key}`,
    label: tabs(item.key),
    meta: settingsWord,
    href: item.href,
    mark: { kind: "settings" },
  }));

  const helpHits = HELP_TOPICS.map((topic): PaletteHit => ({
    id: `help:${topic}`,
    label: help(`howTo.${topic}.title`),
    href: helpHref(topic),
    mark: { kind: "help" },
  }));

  return { riders, templates, menu: places, settings: tabsHits, help: helpHits };
}
