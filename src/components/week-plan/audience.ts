import type { WorkspaceKind } from "@/core/access/personal";
import { possessive, type NoteLocale } from "@/modules/push/texts";

/**
 * Whom the week planner lays a week in for, as its words say it (ADR
 * 0080, 0059 amended 2026-10-12). A club plans for riders, as a team:
 * "Læg ugen ind hos 3 ryttere", each session a group session so "Ret
 * alle" reaches them. A personal workspace is one person's training: the
 * owner's own ("din kalender") or, for a parent, their child's ("Emmas
 * kalender"), with no rider to choose. Only the words differ; the week is
 * laid in the same way. A club with one rider keeps the club's words: a
 * team may grow. The same goes for where the week starts: "Hent sidste
 * uge" fetches your sessions, and the AI proposes your week. Pure, so the
 * words can be tested without React.
 */

export type PlanAudience = { kind: "team" } | { kind: "self" } | { kind: "child"; name: string };

export function planAudience(o: {
  workspace: WorkspaceKind;
  /** The person's own rider row in this workspace, if they ride. */
  selfRiderId: string | null;
  riders: { id: string; name: string }[];
}): PlanAudience {
  const [only] = o.riders;
  if (o.workspace !== "personal" || o.riders.length !== 1 || !only) return { kind: "team" };
  return only.id === o.selfRiderId ? { kind: "self" } : { kind: "child", name: only.name };
}

/** A message under `weekPlan`, and what fills it in. */
export type Words = { key: string; values: Record<string, string | number> };

export type ApplyWords = {
  summary: Words;
  confirm: Words;
  /** What the apply section says while there is nothing to lay in. */
  empty: string;
  /** Whether the planner asks whom the week is for. */
  chooseRiders: boolean;
};

/** The words for each audience, under `weekPlan`: one week, and several in a row. */
export const APPLY_KEYS = {
  team: {
    summary: ["apply.summary", "apply.summaryWeeks"],
    confirm: ["apply.confirm", "apply.confirmWeeks"],
    applied: "applied",
    empty: "apply.empty",
  },
  self: {
    summary: ["apply.summaryOwn", "apply.summaryOwnWeeks"],
    confirm: ["apply.confirmOwn", "apply.confirmOwnWeeks"],
    applied: "appliedOwn",
    empty: "apply.emptyOne",
  },
  child: {
    summary: ["apply.summaryChild", "apply.summaryChildWeeks"],
    confirm: ["apply.confirmChild", "apply.confirmChildWeeks"],
    applied: "appliedChild",
    empty: "apply.emptyOne",
  },
} as const;

/** "Emmas" for a parent's child; nothing for the others. */
function ownerOf(audience: PlanAudience, locale: NoteLocale): { owner?: string } {
  return audience.kind === "child" ? { owner: possessive([audience.name], locale) } : {};
}

/** The apply section's words for a week of `sessions` laid in for `riders` over `weeks`. */
export function applyWords(
  audience: PlanAudience,
  counts: { sessions: number; riders: number; weeks: number },
  locale: NoteLocale,
): ApplyWords {
  const keys = APPLY_KEYS[audience.kind];
  const many = counts.weeks === 1 ? 0 : 1;
  const values = { ...counts, ...ownerOf(audience, locale) };
  return {
    summary: { key: keys.summary[many], values },
    confirm: { key: keys.confirm[many], values },
    empty: keys.empty,
    chooseRiders: audience.kind === "team",
  };
}

/** The note once the week is laid in: `count` sessions in all, for `riders`. */
export function appliedWords(
  audience: PlanAudience,
  counts: { count: number; riders: number },
  locale: NoteLocale,
): Words {
  return {
    key: APPLY_KEYS[audience.kind].applied,
    values: { ...counts, ...ownerOf(audience, locale) },
  };
}

/** Where the week starts, in the audience's words: last week, and the AI's panel. */
export const START_KEYS = {
  team: {
    lastOne: "start.lastOne",
    aiTitle: "ai.title",
    aiHint: "ai.hint",
    aiHintSenior: "ai.hintSenior",
  },
  self: {
    lastOne: "start.lastOwn",
    aiTitle: "ai.titleOwn",
    aiHint: "ai.hintOwn",
    aiHintSenior: "ai.hintSeniorOwn",
  },
  child: {
    lastOne: "start.lastChild",
    aiTitle: "ai.titleChild",
    aiHint: "ai.hintChild",
    aiHintSenior: "ai.hintSeniorChild",
  },
} as const;

export type StartWords = {
  /** "Hent sidste uge" for one rider; a team of several has its own words (`start.lastMany`). */
  lastOne: Words;
  aiTitle: Words;
  /** What the AI is given, for a DCU class-year or a training profile. */
  aiHint: (senior: boolean) => Words;
};

export function startWords(audience: PlanAudience, locale: NoteLocale): StartWords {
  const keys = START_KEYS[audience.kind];
  // "Emmas" and "Emma": a language may want either.
  const values =
    audience.kind === "child"
      ? { ...ownerOf(audience, locale), name: firstName(audience.name) }
      : {};
  return {
    lastOne: { key: keys.lastOne, values },
    aiTitle: { key: keys.aiTitle, values },
    aiHint: (senior) => ({ key: senior ? keys.aiHintSenior : keys.aiHint, values }),
  };
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
