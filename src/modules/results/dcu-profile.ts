/**
 * Reads a rider's page at Cykling Danmark's member portal
 * (dcumedlem.sportstiming.dk/profile/<UCI ID>) into the races they rode.
 *
 * The page is one table: a heading row per discipline, class and year
 * ("Landevej - U17 (2026)"), then a row per result — the race, linked to
 * its result list at Sportstiming, the date ("13. september 2026"), the
 * place and DCU's points — and a total. Above it stand the member's name
 * and birth year. Kadence keeps the race, the date, the class and the
 * place, and checks the birth year against the rider's; the points it
 * leaves (ADR 0039).
 *
 * The page is untrusted input. It refuses rather than guesses: a page
 * that is not the profile of the UCI ID that was asked for is refused
 * whole, and a row that does not read cleanly — no link to Sportstiming,
 * a date it does not know — is skipped and counted, never filled in.
 *
 * Pure: imports nothing, tested on its own.
 */

export type DcuResult = {
  /** Sportstiming's event and round, "17626:101613": the result's own key. */
  sourceRef: string;
  race: string;
  discipline: string;
  raceClass: string;
  racedOn: string;
  place: number | null;
  /** What stood where the place goes when it was not a number. */
  placeNote: string;
  resultUrl: string;
};

/** Who the page is about, as the portal prints it above the results. */
export type DcuPerson = { name: string; birthYear: number | null };

export type DcuProfile = { person: DcuPerson; results: DcuResult[]; skipped: number };

export class DcuPageError extends Error {
  constructor(readonly code: "not_profile" | "wrong_rider") {
    super(`dcu profile: ${code}`);
    this.name = "DcuPageError";
  }
}

const RESULT_URL =
  /^https:\/\/www\.sportstiming\.dk\/event\/([0-9]{1,10})\/results(?:\?round=([0-9]{1,10}))?$/;
const SECTION = /^(.{1,40}?) - (.{1,40}) \(([0-9]{4})\)$/;
const MONTHS: Record<string, number> = {
  januar: 1, january: 1, jan: 1,
  februar: 2, february: 2, feb: 2,
  marts: 3, march: 3, mar: 3,
  april: 4, apr: 4,
  maj: 5, may: 5,
  juni: 6, june: 6, jun: 6,
  juli: 7, july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, october: 10, okt: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
}; // prettier-ignore

const NAMED: Record<string, string> = {
  amp: "&", nbsp: " ", quot: '"', apos: "'", lt: "<", gt: ">",
  aelig: "æ", oslash: "ø", aring: "å", AElig: "Æ", Oslash: "Ø", Aring: "Å",
}; // prettier-ignore

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]{1,6}|#[0-9]{1,7}|[a-z]{2,8});/gi, (whole, ref: string) => {
    if (ref[0] === "#") {
      const code =
        ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : Number(ref.slice(1));
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    return NAMED[ref] ?? whole;
  });
}

/** The visible text of a piece of markup, entities decoded and spaces collapsed. */
function text(html: string): string {
  return decode(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function cells(row: string, tag: "td" | "th"): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  for (const m of row.matchAll(re)) out.push(m[1] ?? "");
  return out;
}

/** "13. september 2026" → "2026-09-13", or null for anything else. */
export function danishDate(raw: string): string | null {
  const m = /^([0-9]{1,2})\.? ([a-zæøå]{3,9})\.? ([0-9]{4})$/i.exec(raw.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS[m[2]!.toLowerCase()];
  const year = Number(m[3]);
  if (!month || day < 1 || year < 2000 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

function placeOf(raw: string): { place: number | null; placeNote: string } {
  const value = raw.replace(/\.$/, "").trim();
  if (/^[0-9]{1,4}$/.test(value) && Number(value) >= 1) {
    return { place: Number(value), placeNote: "" };
  }
  return { place: null, placeNote: value.slice(0, 12) };
}

function resultRow(row: string, section: { discipline: string; raceClass: string }) {
  const tds = cells(row, "td");
  if (tds.length < 4) return null;
  const link = /<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(tds[0]!);
  if (!link) return null;
  const url = decode(link[1]!);
  const ref = RESULT_URL.exec(url);
  const race = text(link[2]!).slice(0, 200);
  const racedOn = danishDate(text(tds[2]!));
  if (!ref || !race || !racedOn) return null;
  return {
    sourceRef: `${ref[1]}:${ref[2] ?? ""}`,
    race,
    discipline: section.discipline,
    raceClass: section.raceClass,
    racedOn,
    ...placeOf(text(tds[3]!)),
    resultUrl: url,
  } satisfies DcuResult;
}

/**
 * The races on the profile page of `uciId`. Throws DcuPageError when the
 * page is not a member's profile, or is someone else's.
 */
export function parseDcuProfile(html: string, uciId: string): DcuProfile {
  const page = text(html);
  const id = /UCI ID ([0-9 ]{11,20})/.exec(page);
  if (!id) throw new DcuPageError("not_profile");
  if (id[1]!.replace(/ /g, "") !== uciId) throw new DcuPageError("wrong_rider");
  // "Benjamin Hove Vinther" in the heading, "M, 2011" just before the UCI ID.
  const born = /(?:^|\s)(?:[A-ZÆØÅ]{1,2}, )?((?:19|20)[0-9]{2}) UCI ID /.exec(page);
  const heading = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const person = {
    name: heading ? text(heading[1]!).slice(0, 120) : "",
    birthYear: born ? Number(born[1]) : null,
  };

  const results: DcuResult[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  const table = /<table\b[^>]*class="[^"]*\btable-hover\b[^"]*"[^>]*>([\s\S]*?)<\/table>/i.exec(
    html,
  );
  if (!table) return { person, results, skipped };

  let section: { discipline: string; raceClass: string } | null = null;
  for (const m of table[1]!.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = m[1]!;
    const heads = cells(row, "th");
    if (heads.length > 0) {
      const heading = SECTION.exec(text(heads[0]!));
      section = heading ? { discipline: heading[1]!, raceClass: heading[2]! } : null;
      continue;
    }
    if (!section) {
      if (cells(row, "td").length > 0) skipped++;
      continue;
    }
    const result = resultRow(row, section);
    if (!result) {
      skipped++;
      continue;
    }
    if (seen.has(result.sourceRef)) continue;
    seen.add(result.sourceRef);
    results.push(result);
  }
  return { person, results, skipped };
}
