/**
 * When and where a session starts (docs/adr/0057), as one short line:
 * "17.30 · Klubhuset". The time comes from Postgres as "17:30:00"; Danish
 * writes it with a dot, English with a colon. Pure.
 */

export type TimePlace = {
  startTime?: string | null;
  meetingPlace?: string | null;
};

export function clockOf(startTime: string | null | undefined, locale: string): string | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(startTime ?? "");
  if (!match) return null;
  const hours = match[1]!.padStart(2, "0");
  return locale === "en" ? `${hours}:${match[2]}` : `${hours}.${match[2]}`;
}

export function timePlaceText(session: TimePlace, locale: string): string | null {
  const parts = [clockOf(session.startTime, locale), session.meetingPlace?.trim() || null].filter(
    (part): part is string => Boolean(part),
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}
