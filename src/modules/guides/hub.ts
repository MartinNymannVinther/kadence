import type { Feature, Features } from "@/core/features";

/**
 * What the open hub offers (ADR 0047): the calculators and the guides,
 * each with its page, and for the parked ones the installation flag it
 * waits for (ADR 0057). The words are in messages, `guides.hub.items`.
 *
 * Pure: the caller reads the installation's features and hands them in.
 */

export type HubKey = "energy" | "gearing" | "classes" | "equipment" | "food" | "programs";
export type HubItem = { key: HubKey; href: string; feature?: Feature };

export const HUB_CALCULATORS: readonly HubItem[] = [
  { key: "energy", href: "/calculators/energy", feature: "energyCalculator" },
  { key: "gearing", href: "/calculators/gearing" },
];

export const HUB_GUIDES: readonly HubItem[] = [
  { key: "classes", href: "/guides/classes" },
  { key: "equipment", href: "/guides/equipment" },
  { key: "food", href: "/guides/food", feature: "foodGuide" },
  { key: "programs", href: "/guides/programs" },
];

/** The items this installation shows: those that wait for nothing, and those it has turned on. */
export function shownItems(items: readonly HubItem[], on: Features): HubItem[] {
  return items.filter((item) => !item.feature || on[item.feature]);
}

/** Every topic shown, guides before calculators, as the cards that lead to the hub name them. */
export function shownTopics(on: Features): HubKey[] {
  return [...shownItems(HUB_GUIDES, on), ...shownItems(HUB_CALCULATORS, on)].map((i) => i.key);
}
