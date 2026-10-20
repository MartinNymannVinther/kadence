CREATE TABLE "known_pains" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"place" text NOT NULL,
	"usual_level" smallint NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "known_pains_place" CHECK (char_length("known_pains"."place") between 1 and 40),
	CONSTRAINT "known_pains_usual_level" CHECK ("known_pains"."usual_level" between 1 and 2)
);
--> statement-breakpoint
ALTER TABLE "flag_resolutions" DROP CONSTRAINT "flag_resolutions_kind";--> statement-breakpoint
ALTER TABLE "checkins" ADD COLUMN "usual_pains" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "known_pains" ADD CONSTRAINT "known_pains_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "known_pains" ADD CONSTRAINT "known_pains_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "known_pains" ADD CONSTRAINT "known_pains_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "known_pains_rider_idx" ON "known_pains" USING btree ("org_id","rider_id");--> statement-breakpoint
ALTER TABLE "flag_resolutions" ADD CONSTRAINT "flag_resolutions_kind" CHECK ("flag_resolutions"."kind" in ('hours_above_corridor','hours_below_corridor','ramp','longest_ride','strength_spacing','compliance','wellbeing_talk','wellbeing_help','pain','sleep_short','sleep_below_minimum','mid_zone','known_pain_lasting'));--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_usual_pains" CHECK (jsonb_typeof("checkins"."usual_pains") = 'array' and jsonb_array_length("checkins"."usual_pains") <= 5);--> statement-breakpoint
-- Known pains (docs/adr/0097): something that always hurts a little, and
-- how much it usually does. Health data about one rider, so it is read as
-- the check-ins are — the coach, the rider, and a parent only when the
-- rider shares wellbeing (ADR 0011) — and written by the rider or a coach
-- (app_can_write_rider, drizzle/0003), which is also what stops a row with
-- this team's org_id from naming another team's rider. Every change is
-- audited. The rider's erasure takes them along (rider_id's cascade), and
-- the workspace's deletion all of them (org_id's). The context is asked
-- once per query, as a sub-select (drizzle/0045).
GRANT SELECT, INSERT, UPDATE, DELETE ON "known_pains" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "known_pains" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "known_pains" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_known_pains ON "known_pains" FOR SELECT TO kadence_app
  USING (org_id = (SELECT app_current_org_id()) AND app_can_read_rider(rider_id, 'wellbeing'));
--> statement-breakpoint
CREATE POLICY app_write_known_pains ON "known_pains" FOR ALL TO kadence_app
  USING (org_id = (SELECT app_current_org_id()) AND app_can_write_rider(rider_id))
  WITH CHECK (org_id = (SELECT app_current_org_id()) AND app_can_write_rider(rider_id));
--> statement-breakpoint
CREATE TRIGGER audit_known_pains
  AFTER INSERT OR UPDATE OR DELETE ON "known_pains"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
-- A rider's known pains are theirs and follow their history to another
-- workspace (drizzle/0046, docs/adr/0081), as the check-ins that name them
-- do. The list is the one from drizzle/0050, with known_pains added.
CREATE OR REPLACE FUNCTION move_rider_history_tables()
RETURNS TABLE (table_name text, action text)
LANGUAGE sql IMMUTABLE AS $$
  VALUES
    ('workout_templates', 'move'),
    ('planned_sessions', 'move'),
    ('activities', 'move'),
    ('upload_keys', 'move'),
    ('activity_files', 'move'),
    ('comments', 'move'),
    ('checkins', 'move'),
    ('known_pains', 'move'),
    ('rider_measurements', 'move'),
    ('rider_goals', 'move'),
    ('flag_resolutions', 'move'),
    ('season_plans', 'move'),
    ('race_results', 'move'),
    ('calendar_events', 'move'),
    ('device_links', 'move'),
    ('guardians', 'stay'),
    ('planned_session_deletions', 'stay'),
    ('week_plan_drafts', 'stay'),
    ('club_championship_entries', 'stay'),
    ('club_champions', 'stay'),
    ('consents', 'stay')
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION move_rider_history_tables() FROM PUBLIC;
