import { DCU_BIKE_SESSIONS } from "@/modules/dcu";
import type { RulleSession, RulleTemplate } from "@/modules/rulle/service";
import { structureMinutes, type BikeStructure } from "@/modules/workouts/structure";

/**
 * What a rider can choose to ride (ADR 0035), under one id each: a planned
 * session by its own id, a session from the team's library as `team:` and
 * its id, one of DCU's as `dcu:` and its key. Only a planned session is a
 * session in Kadence; the others are ridden as an ordinary ride, which the
 * import lands on a planned session if one fits, as it does any file.
 */

export type Picked = {
  id: string;
  kind: "planned" | "team" | "dcu";
  title: string;
  description: string;
  structure: BikeStructure;
  minutes: number;
  /** The planned session, when it is one: whose it is, its day, whether it is done. */
  session: RulleSession | null;
  /** DCU's words for when it belongs in a season, and where DCU says so. */
  when: string | null;
  source: string | null;
};

export function plannedPick(session: RulleSession): Picked {
  return {
    id: session.id,
    kind: "planned",
    title: session.title,
    description: session.description,
    structure: session.structure,
    minutes: structureMinutes(session.structure),
    session,
    when: null,
    source: null,
  };
}

export function teamPicks(library: RulleTemplate[]): Picked[] {
  return library.map((t) => ({
    id: `team:${t.id}`,
    kind: "team",
    title: t.title,
    description: t.description,
    structure: t.structure,
    minutes: structureMinutes(t.structure),
    session: null,
    when: null,
    source: null,
  }));
}

export function dcuPicks(locale: string): Picked[] {
  const lang = locale === "en" ? "en" : "da";
  return DCU_BIKE_SESSIONS.map((s) => ({
    id: `dcu:${s.key}`,
    kind: "dcu",
    title: s.name[lang],
    description: "",
    structure: s.structure,
    minutes: structureMinutes(s.structure),
    session: null,
    when: s.when[lang],
    source: s.source,
  }));
}

/** The choice behind an id among those there are; null for a free ride, or an id no longer there. */
export function pickOf(id: string | null, all: Picked[]): Picked | null {
  return id === null ? null : (all.find((p) => p.id === id) ?? null);
}
