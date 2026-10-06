import { z } from "zod";
import { isBirthYear } from "./birth-year";

/**
 * "Inviter hele holdet": the list a coach pastes, read line by line
 * before anything is created (docs/adr/0064). One rider a line, then
 * their parents after semicolons:
 *
 *     Emma Holm, 2010, emma@holm.dk; Anne Holm, anne@holm.dk; Peter Holm
 *
 * Within a person, commas (or a spreadsheet's tabs) separate the name,
 * the birth year and the address, in any order; a four-digit number is
 * the year and a word with @ is the address, so "Emma Holm 2010" reads
 * too. The year may be left out when the list has one for everybody.
 * An address is what makes an invitation link (Better Auth binds each
 * to one), so a person without one is created without a link.
 *
 * Every line that cannot be read is refused with its line number and a
 * reason, and so is the whole list when it is empty or too long; a list
 * with a refusal creates nothing. Blank lines are skipped and counted.
 * A brother and a sister share their parents, so the same parent with
 * the same name and address may stand on two lines and gets one link.
 *
 * Pure: imports nothing from the database. The dialog reads the list
 * with it as the coach types, and the server reads it again.
 */

export const MAX_RIDERS = 40;
export const MAX_PARENTS = 2;
export const NAME_MAX = 120;
/** Longest the raw text may be: forty full lines and room to spare. */
export const TEXT_MAX = 40_000;

export type ListPerson = { name: string; email: string | null };
export type ListRider = ListPerson & { birthYear: number };
export type ListLine = { line: number; rider: ListRider; parents: ListPerson[] };

/** Why a line is refused; each has its sentence under `riders.bulk.problem`. */
export const LINE_PROBLEM_CODES = [
  "noName",
  "twoNames",
  "nameTooLong",
  "unreadable",
  "noYear",
  "badYear",
  "twoYears",
  "parentYear",
  "badEmail",
  "twoEmails",
  "tooManyParents",
  "sameName",
  "sameEmail",
  "twiceOnLine",
  // Found against the team by the service (bulk-invite.ts), not here.
  "onTeam",
  "emailMember",
  "emailInvited",
] as const;

export type LineProblemCode = (typeof LINE_PROBLEM_CODES)[number];

export type LineProblem = {
  line: number;
  code: LineProblemCode;
  /** The word, year or address the problem is about. */
  value?: string;
  /** The line it clashes with. */
  other?: number;
};

/** Why the whole list is refused; each has its sentence under `riders.bulk.list`. */
export const LIST_PROBLEM_CODES = ["empty", "tooMany", "sharedYear", "tooManyWaiting"] as const;

export type ListProblemCode = (typeof LIST_PROBLEM_CODES)[number];

export type ParsedList = {
  /** The lines that can be created; all of them only when `problems` is empty. */
  lines: ListLine[];
  problems: LineProblem[];
  listProblem: ListProblemCode | null;
  /** Blank lines, skipped. */
  blank: number;
};

const email = z.email().max(320);
const YEAR = /^\d{4}$/;
const SHOWN = 60;

/** A name as it is compared: spaces collapsed, case folded. */
export function nameKey(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLocaleLowerCase("da");
}

/** The addresses that get a link, each once — a parent of two riders too. */
export function addressesIn(lines: ListLine[]): string[] {
  const all = lines.flatMap((l) => [l.rider.email, ...l.parents.map((p) => p.email)]);
  return [...new Set(all.filter((e): e is string => e !== null))];
}

type Found = Omit<LineProblem, "line">;
type Person = { person: ListPerson; year: number | null; problems: Found[] };

function readPerson(part: string, thisYear: number, rider: boolean): Person {
  const names: string[] = [];
  const years: string[] = [];
  const emails: string[] = [];
  const problems: Found[] = [];
  for (const field of part.split(/[,\t]/)) {
    const words: string[] = [];
    for (const token of field.trim().split(/\s+/).filter(Boolean)) {
      if (YEAR.test(token)) years.push(token);
      else if (token.includes("@")) emails.push(token.replace(/^<|>$/g, "").toLowerCase());
      else if (/\d/.test(token))
        problems.push({ code: "unreadable", value: token.slice(0, SHOWN) });
      else words.push(token);
    }
    if (words.length > 0) names.push(words.join(" "));
  }

  const name = names[0] ?? "";
  if (names.length === 0) problems.push({ code: "noName" });
  else if (names.length > 1) problems.push({ code: "twoNames", value: names[1]!.slice(0, SHOWN) });
  else if (name.length > NAME_MAX) problems.push({ code: "nameTooLong" });

  let year: number | null = null;
  if (!rider && years.length > 0) problems.push({ code: "parentYear" });
  else if (years.length > 1) problems.push({ code: "twoYears" });
  else if (years.length === 1) {
    year = Number(years[0]);
    if (!isBirthYear(year, thisYear)) problems.push({ code: "badYear", value: years[0] });
  }

  let address: string | null = null;
  if (emails.length > 1) problems.push({ code: "twoEmails" });
  else if (emails.length === 1) {
    if (email.safeParse(emails[0]).success) address = emails[0]!;
    else problems.push({ code: "badEmail", value: emails[0]!.slice(0, SHOWN) });
  }

  return { person: { name, email: address }, year, problems };
}

export function parseTeamList(
  text: string,
  options: { sharedYear: number | null; thisYear: number },
): ParsedList {
  const raw = text.trimEnd().split(/\r?\n/);
  const filled = raw
    .map((content, index) => ({ content, line: index + 1 }))
    .filter((l) => l.content.trim() !== "");
  const blank = raw.length - filled.length;
  const refuse = (listProblem: ListProblemCode): ParsedList => ({
    lines: [],
    problems: [],
    listProblem,
    blank,
  });
  if (filled.length === 0) return refuse("empty");
  if (filled.length > MAX_RIDERS) return refuse("tooMany");
  const { sharedYear, thisYear } = options;
  if (sharedYear !== null && !isBirthYear(sharedYear, thisYear)) return refuse("sharedYear");

  const lines: ListLine[] = [];
  const problems: LineProblem[] = [];
  const riderNames = new Map<string, number>();
  const addresses = new Map<string, { line: number; parent: boolean; key: string }>();

  for (const { content, line } of filled) {
    const here: Found[] = [];
    const [riderPart = "", ...rest] = content.split(";");
    const parentParts = rest.filter((part) => part.trim() !== "");

    const rider = readPerson(riderPart, thisYear, true);
    here.push(...rider.problems);
    const birthYear = rider.year ?? sharedYear;
    if (birthYear === null && !here.some((p) => p.code === "twoYears"))
      here.push({ code: "noYear" });

    if (parentParts.length > MAX_PARENTS) here.push({ code: "tooManyParents" });
    const parents = parentParts.slice(0, MAX_PARENTS).map((part) => {
      const parent = readPerson(part, thisYear, false);
      here.push(...parent.problems);
      return parent.person;
    });

    if (rider.person.name) {
      const key = nameKey(rider.person.name);
      const seen = riderNames.get(key);
      if (seen !== undefined)
        here.push({ code: "sameName", value: rider.person.name, other: seen });
      else riderNames.set(key, line);
    }
    const [first, second] = parents;
    if (first?.name && second?.name && nameKey(first.name) === nameKey(second.name)) {
      here.push({ code: "twiceOnLine", value: second.name });
    }

    const people = [
      { person: rider.person, parent: false },
      ...parents.map((person) => ({ person, parent: true })),
    ];
    const onThisLine = new Set<string>();
    for (const { person, parent } of people) {
      if (!person.email) continue;
      if (onThisLine.has(person.email)) {
        here.push({ code: "twiceOnLine", value: person.email });
        continue;
      }
      onThisLine.add(person.email);
      const key = nameKey(person.name);
      const seen = addresses.get(person.email);
      if (!seen) addresses.set(person.email, { line, parent, key });
      // Siblings' parent: the same person, by the same name, on another line.
      else if (!(parent && seen.parent && seen.key === key)) {
        here.push({ code: "sameEmail", value: person.email, other: seen.line });
      }
    }

    problems.push(...here.map((p) => ({ line, ...p })));
    if (here.length === 0 && birthYear !== null) {
      lines.push({ line, rider: { ...rider.person, birthYear }, parents });
    }
  }

  return { lines, problems, listProblem: null, blank };
}
