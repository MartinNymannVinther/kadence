import { daysLeft, lastDay, TRIAL_BANNER_DAYS } from "./dates";
import type { PlanState } from "./which-plan";

/**
 * What the pages say about a workspace's plan (docs/adr/0090). Pure, so
 * the rule is tested without a page:
 *
 * - expired: a stripe at the top of every page — the trial or the
 *   subscription has ended, what still works (see and take out), and the
 *   way to Abonnement;
 * - a trial in its last week: the same stripe, quieter, with the days left;
 * - any trial: a line under Indstillinger and on Abonnement with the days
 *   left, and nothing at the top until the last week;
 * - free or paid: nothing.
 */

export type PlanFacts = {
  plan: PlanState;
  trialEndsAt: Date | null;
  paidUntil: Date | null;
};

export type PlanBanner =
  | { kind: "expired"; wasTrial: boolean; lastDay: string | null }
  | { kind: "trialEnding"; daysLeft: number; lastDay: string };

export type TrialLine = { daysLeft: number; lastDay: string };

/** The end that ran out: the later of the trial's and the payment's. */
function endOf(facts: PlanFacts): Date | null {
  const ends = [facts.trialEndsAt, facts.paidUntil].filter((d): d is Date => d !== null);
  return ends.length === 0 ? null : new Date(Math.max(...ends.map((d) => d.getTime())));
}

export function trialLine(facts: PlanFacts, now: Date = new Date()): TrialLine | null {
  if (facts.plan !== "trial" || !facts.trialEndsAt) return null;
  return {
    daysLeft: Math.max(0, daysLeft(facts.trialEndsAt, now)),
    lastDay: lastDay(facts.trialEndsAt),
  };
}

export function planBanner(facts: PlanFacts, now: Date = new Date()): PlanBanner | null {
  if (facts.plan === "expired") {
    const end = endOf(facts);
    return {
      kind: "expired",
      wasTrial: facts.paidUntil === null,
      lastDay: end ? lastDay(end) : null,
    };
  }
  const line = trialLine(facts, now);
  if (line && line.daysLeft <= TRIAL_BANNER_DAYS)
    return { kind: "trialEnding", daysLeft: line.daysLeft, lastDay: line.lastDay };
  return null;
}
