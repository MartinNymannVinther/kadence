/**
 * The rail's colour (docs/adr/0073): the sidebar and the phone's "Mere"
 * sheet in the family's dark moss, or on the paper the rest of the page
 * is on. Dark moss is the default; the choice is made under Indstillinger
 * → Profil and kept in a cookie, like the hidden sidebar (./sidebar-shell.tsx),
 * so the server paints the right rail on the first pass and nobody
 * watches it change colour on every page load. A preference, not a
 * tracker: it carries one word and nothing else.
 */

export const SIDEBAR_TONE_COOKIE = "kadence-sidebar-tone";

export type SidebarTone = "moss" | "paper";

export const SIDEBAR_TONES: readonly SidebarTone[] = ["moss", "paper"];

export const DEFAULT_SIDEBAR_TONE: SidebarTone = "moss";

/** The cookie's word as a tone; anything else, or nothing, is the default. */
export function sidebarToneFrom(value: string | undefined | null): SidebarTone {
  return value === "paper" ? "paper" : DEFAULT_SIDEBAR_TONE;
}

/** The class the rail wears for a tone; the paper rail wears the tokens as they are. */
export function sidebarToneClass(tone: SidebarTone): string | undefined {
  return tone === "moss" ? "sidebar-moss" : undefined;
}

/** A year, path-wide, same-site: the same shape as the hidden-sidebar cookie. */
export function sidebarToneCookie(tone: SidebarTone): string {
  return `${SIDEBAR_TONE_COOKIE}=${tone}; path=/; max-age=31536000; samesite=lax`;
}
