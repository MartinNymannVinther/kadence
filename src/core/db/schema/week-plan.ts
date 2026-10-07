import { sql } from "drizzle-orm";
import { check, date, jsonb, pgTable, text, unique } from "drizzle-orm/pg-core";
import { domainId, users } from "./foundation";
import { riders } from "./team";
import { tenant, timestamps } from "./shared";

/**
 * The week planner's draft, shared by the team's coaches (ADR 0043,
 * amended 2026-10-07; backlog P2-05): the week as it is being made, kept
 * on the server per team and week so an assistant coach sees and changes
 * the week the head coach is planning, instead of making it again. The
 * last one to save stands by it; there is no editing at the same time.
 *
 * `rider_id` is the planner's scope: empty for the team's plan, a rider's
 * id for a plan begun from that rider's calendar (ADR 0059), which is kept
 * apart from the team's for the same week. The rider is checked by the
 * database (drizzle/0035) and the drafts go with the rider when the rider
 * is erased.
 *
 * `payload` is the planner's draft in the shape the server is sent when
 * the week is laid in — `{ riderIds, items }`, each item a PlanItemInput
 * (src/modules/training/week-plan.ts). The application validates it with
 * that schema on the way in and again on the way out; the database only
 * bounds its kind and size. Coaches alone read and write it, and every
 * save is audited. The row is deleted when the week is laid in.
 */
export const weekPlanDrafts = pgTable(
  "week_plan_drafts",
  {
    id: domainId("id"),
    orgId: tenant(),
    /** The Monday of the week the draft plans. */
    weekMonday: date("week_monday").notNull(),
    /** Null for the team's plan; the rider's id for a plan begun from their calendar. */
    riderId: text("rider_id").references(() => riders.id, { onDelete: "cascade" }),
    payload: jsonb("payload").notNull(),
    /** Who saved it last: the planner says "Sidst gemt af …". */
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    // One draft per team, week and scope; the team's own (no rider) counts as one.
    unique("week_plan_drafts_scope_uq").on(t.orgId, t.weekMonday, t.riderId).nullsNotDistinct(),
    check("week_plan_drafts_monday", sql`extract(isodow from ${t.weekMonday}) = 1`),
    check(
      "week_plan_drafts_payload",
      sql`jsonb_typeof(${t.payload}) = 'object' and octet_length(${t.payload}::text) <= 524288`,
    ),
  ],
);

export type WeekPlanDraftRow = typeof weekPlanDrafts.$inferSelect;
