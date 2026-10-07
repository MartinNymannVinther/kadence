CREATE TABLE "week_plan_drafts" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"week_monday" date NOT NULL,
	"rider_id" text,
	"payload" jsonb NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "week_plan_drafts_scope_uq" UNIQUE NULLS NOT DISTINCT("org_id","week_monday","rider_id"),
	CONSTRAINT "week_plan_drafts_monday" CHECK (extract(isodow from "week_plan_drafts"."week_monday") = 1),
	CONSTRAINT "week_plan_drafts_payload" CHECK (jsonb_typeof("week_plan_drafts"."payload") = 'object' and octet_length("week_plan_drafts"."payload"::text) <= 524288)
);
--> statement-breakpoint
ALTER TABLE "week_plan_drafts" ADD CONSTRAINT "week_plan_drafts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_plan_drafts" ADD CONSTRAINT "week_plan_drafts_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_plan_drafts" ADD CONSTRAINT "week_plan_drafts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- The week planner's shared draft (backlog P2-05; ADR 0043, amended
-- 2026-10-07). A coach's half-made week is the team's coaches' to read and
-- change, and nobody else's: a rider or a parent reads none, not even a
-- draft begun from their own calendar, and a coach of another team neither
-- reads nor writes one. The last save wins; every save is audited, and the
-- draft is deleted when the week is laid in.
--
-- A draft for one rider names that rider in rider_id, and the rider must
-- be in the active team (app_can_write_rider, drizzle/0003), which is what
-- stops a row with this team's org_id from naming another team's rider.
-- The rider's erasure takes their drafts with it (rider_id's cascade, run
-- as the table's owner); the workspace's deletion takes them all (org_id's).
GRANT SELECT, INSERT, UPDATE, DELETE ON "week_plan_drafts" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "week_plan_drafts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "week_plan_drafts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_week_plan_drafts ON "week_plan_drafts" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach());
--> statement-breakpoint
CREATE POLICY app_insert_week_plan_drafts ON "week_plan_drafts" FOR INSERT TO kadence_app
  WITH CHECK (
    org_id = app_current_org_id() AND app_is_coach()
    AND (rider_id IS NULL OR app_can_write_rider(rider_id))
  );
--> statement-breakpoint
CREATE POLICY app_update_week_plan_drafts ON "week_plan_drafts" FOR UPDATE TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach())
  WITH CHECK (
    org_id = app_current_org_id() AND app_is_coach()
    AND (rider_id IS NULL OR app_can_write_rider(rider_id))
  );
--> statement-breakpoint
CREATE POLICY app_delete_week_plan_drafts ON "week_plan_drafts" FOR DELETE TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach());
--> statement-breakpoint
CREATE TRIGGER audit_week_plan_drafts
  AFTER INSERT OR UPDATE OR DELETE ON "week_plan_drafts"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
