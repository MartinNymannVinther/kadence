import { DCU_BIKE_SESSIONS } from "@/modules/dcu";
import { sessionsFor, type SeniorProfile } from "@/modules/paradigms";
import type { RulleSession, RulleTemplate } from "@/modules/rulle/service";
import { structureMinutes, type BikeStructure } from "@/modules/workouts/structure";

/**
 * What a rider can choose to ride (ADR 0035), under one id each: a planned
 * session by its own id, a session from the team's library as `team:` and
 * its id, one of DCU's as `dcu:` and its key, and for a senior one of
 * Kadence's for their profile as `kadence:` and its key (ADR 0092). Only a planned session is a
 * session in Kadence; the others are ridden as an ordinary ride, which the
 * import lands on a planned session if one fits, as it does any file.
 */

export type Picked = {
  id: string;
  kind: "planned" | "team" | "dcu" | "kadence";
  title: string;
  description: string;
  structure: BikeStructure;
  minutes: number;
  /** The planned session, when it is one: whose it is, its day, whether it is done. */
  session: RulleSession | null;
  /** DCU's or Kadence's words for when it belongs in a season, and the source. */
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

/**
 * Kadence's own sessions for a senior's profile (docs/adr/0092), offered
 * before DCU's to an adult; nothing for a rider in U17–U23.
 */
export function kadencePicks(locale: string, profile: SeniorProfile | null): Picked[] {
  if (!profile) return [];
  const lang = locale === "en" ? "en" : "da";
  return sessionsFor(profile).map((s) => ({
    id: `kadence:${s.key}`,
    kind: "kadence",
    title: s.name[lang],
    description: s.why[lang],
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
