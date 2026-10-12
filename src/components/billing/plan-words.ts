import { daysLeft, lastDay } from "@/modules/billing/dates";
import type { PlanState } from "@/modules/billing/which-plan";

/**
 * Which sentence says where a workspace stands (docs/adr/0090), as a key
 * of `billing.state` and the day it names. Pure: the subscription page
 * and Installation → Betaling say the same thing the same way.
 */

export type PlanStanding = {
  plan: PlanState;
  trialEndsAt: Date | null;
  paidUntil: Date | null;
  freeReason: string | null;
  freeUntil: Date | null;
};

export type StateKey =
  | "free"
  | "freeUntil"
  | "freeFirstSeason"
  | "freeYouth"
  | "trial"
  | "paid"
  | "expiredTrial"
  | "expiredPaid";

export type StateWords = { key: StateKey; day: string | null; days: number | null };

export function stateWords(p: PlanStanding, now: Date = new Date()): StateWords {
  const at = (end: Date | null) => (end ? lastDay(end) : null);
  switch (p.plan) {
    case "trial":
      return {
        key: "trial",
        day: at(p.trialEndsAt),
        days: p.trialEndsAt ? Math.max(0, daysLeft(p.trialEndsAt, now)) : null,
      };
    case "paid":
      return { key: "paid", day: at(p.paidUntil), days: null };
    case "expired": {
      const ends = [p.trialEndsAt, p.paidUntil].filter((d): d is Date => d !== null);
      const end = ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : null;
      return { key: p.paidUntil ? "expiredPaid" : "expiredTrial", day: at(end), days: null };
    }
    default:
      if (!p.freeUntil) return { key: "free", day: null, days: null };
      return {
        key:
          p.freeReason === "first-season"
            ? "freeFirstSeason"
            : p.freeReason === "youth"
              ? "freeYouth"
              : "freeUntil",
        day: at(p.freeUntil),
        days: null,
      };
  }
}
