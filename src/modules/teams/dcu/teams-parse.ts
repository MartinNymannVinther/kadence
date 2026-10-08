import type { DcuTeam, TeamLevel } from "../types";
import { htmlToLines } from "./html";

/**
 * Cykling Danmark's list of registered teams, read from its page
 * (cyklingdanmark.dk/klubber-teams/om-teams, docs/research/teams.md).
 * The page is prose with headings — "UCI Continental Teams", "DCU
 * eliteherrer - landevej", "U19-herrer - landevej" — and under each a
 * run of teams as three lines: the name, "Moderklub: …" and "Team
 * Manager: … // address" (the UCI teams write "Kontakt:" on a line of
 * its own). Read as lines of text, not as markup, so a change of
 * template that keeps the words keeps working.
 *
 * Pure.
 */

const HEADINGS: Array<{ test: RegExp; level: Exclude<TeamLevel, "foreign"> }> = [
  { test: /^uci continental teams?$/i, level: "uciContinental" },
  { test: /^dcu ?eliteherrer/i, level: "dcuEliteMen" },
  { test: /^dcu ?elitekvinder/i, level: "dcuEliteWomen" },
  { test: /^u19-?herrer/i, level: "u19Men" },
  { test: /^u19-?kvinder/i, level: "u19Women" },
];

/** Headings of other disciplines end the road part of the list. */
const END = /^(bane|gravel|mtb|cross|bmx|cyklecross|kontakt)$/i;
const START = /^danske teams$/i;
const YEAR = /^20\d\d$/;
const PARENT = /^moderklub:\s*(.*)$/i;
const MANAGER = /^team manager:\s*(.*?)\s*(?:\/\/\s*(.*))?$/i;
const CONTACT = /^kontakt:\s*(.*)$/i;
const EMAIL = /\S+@\S+\.\S+/;

export function parseDcuTeams(html: string): DcuTeam[] {
  const lines = htmlToLines(html);
  const from = lines.findIndex((l) => START.test(l));
  const teams: DcuTeam[] = [];
  let level: DcuTeam["level"] | null = null;
  let current: DcuTeam | null = null;
  const close = () => {
    if (current) teams.push(current);
    current = null;
  };
  for (const line of lines.slice(from < 0 ? 0 : from + 1)) {
    if (END.test(line)) break;
    const heading = HEADINGS.find((h) => h.test.test(line));
    if (heading) {
      close();
      level = heading.level;
      continue;
    }
    if (!level || YEAR.test(line)) continue;
    const parent = PARENT.exec(line);
    const manager = MANAGER.exec(line);
    const contact = CONTACT.exec(line);
    if (parent && current) current.parentClub = parent[1]!.trim() || null;
    else if (manager && current) {
      current.manager = manager[1]!.trim() || null;
      current.contact = manager[2]?.trim() || null;
    } else if (contact && current) current.contact = contact[1]!.trim() || null;
    // A contact address on a line of its own follows a "//" the line before.
    else if (EMAIL.test(line) && current && !current.contact && !line.includes(" ")) {
      current.contact = line.trim();
    } else {
      close();
      current = {
        level,
        name: line.replace(/\s+/g, " ").trim(),
        parentClub: null,
        manager: null,
        contact: null,
      };
    }
  }
  close();
  return teams.filter((t) => t.name.length > 1 && t.name.length <= 80);
}
