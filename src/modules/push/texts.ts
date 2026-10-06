import type { Note } from "./latest";

/**
 * A note in words (docs/adr/0060): title, body and where a tap goes, in
 * the person's language. The words are messages/*.json's, under
 * `reminders.notify`; this only picks which, and fills in names. Short,
 * plain, no exclamation marks, nothing on a lock screen a teammate
 * should not read: a session's title and who wrote, never the comment.
 */

export type Notification = { title: string; body: string; url: string };

/** A translator for `reminders.notify`, from next-intl on the server or in a test. */
export type Translate = (key: string, values?: Record<string, string>) => string;

export type NoteLocale = "da" | "en";

/** "Emmas", "Jonas'", "Emma og Jonas'" — "Emma's", "Emma and Jonas's". */
export function possessive(names: string[], locale: NoteLocale): string {
  const first = names.map((name) => name.trim().split(/\s+/)[0] ?? name);
  const list = new Intl.ListFormat(locale === "en" ? "en-GB" : "da-DK", {
    type: "conjunction",
  }).format(first);
  if (locale === "en") return `${list}'s`;
  return /[sxz]$/i.test(list) ? `${list}'` : `${list}s`;
}

/** A path in the app, in the reader's language: Danish has no prefix, English /en. */
export function localized(path: string, locale: NoteLocale): string {
  return locale === "en" ? `/en${path}` : path;
}

export function renderNote(note: Note | null, t: Translate, locale: NoteLocale): Notification {
  if (!note)
    return {
      title: t("fallbackTitle"),
      body: t("fallbackBody"),
      url: localized("/today", locale),
    };
  const url = localized(note.path, locale);
  switch (note.kind) {
    case "comment":
      return {
        title: note.title ? t("commentTitle", { title: note.title }) : t("commentTitlePlain"),
        body: note.author ? t("commentBody", { name: note.author }) : t("commentBodyPlain"),
        url,
      };
    case "plan":
      return { title: t("planTitle"), body: t("planBody"), url };
    case "checkin":
      return { title: t("checkinTitle"), body: t("checkinBody"), url };
    case "week":
      return {
        title: t("weekTitle", { owner: possessive(note.children, locale) }),
        body: t("weekBody"),
        url,
      };
  }
}
