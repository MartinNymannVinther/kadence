CREATE TABLE "session_change_notes" (
	"change_id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"note" text NOT NULL,
	CONSTRAINT "session_change_notes_note" CHECK (char_length("session_change_notes"."note") between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "session_changes" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"planned_session_id" text,
	"kind" text NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date,
	"sport" text NOT NULL,
	"title" text NOT NULL,
	"planned_minutes" integer NOT NULL,
	"reason" text,
	"by_role" text NOT NULL,
	"changed_by" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_changes_kind" CHECK ("session_changes"."kind" in ('moved', 'skipped', 'unskipped')),
	CONSTRAINT "session_changes_reason" CHECK ("session_changes"."reason" is null or "session_changes"."reason" in ('ill','pain','tired','school','weather','time','travel','other')),
	CONSTRAINT "session_changes_by_role" CHECK ("session_changes"."by_role" in ('rider', 'coach')),
	CONSTRAINT "session_changes_to_date" CHECK (("session_changes"."kind" = 'moved') = ("session_changes"."to_date" is not null))
);
--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD COLUMN "skipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD COLUMN "skip_reason" text;--> statement-breakpoint
ALTER TABLE "session_change_notes" ADD CONSTRAINT "session_change_notes_change_id_session_changes_id_fk" FOREIGN KEY ("change_id") REFERENCES "public"."session_changes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_change_notes" ADD CONSTRAINT "session_change_notes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_change_notes" ADD CONSTRAINT "session_change_notes_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_changes" ADD CONSTRAINT "session_changes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_changes" ADD CONSTRAINT "session_changes_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_changes" ADD CONSTRAINT "session_changes_planned_session_id_planned_sessions_id_fk" FOREIGN KEY ("planned_session_id") REFERENCES "public"."planned_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_changes" ADD CONSTRAINT "session_changes_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_change_notes_rider_idx" ON "session_change_notes" USING btree ("org_id","rider_id");--> statement-breakpoint
CREATE INDEX "session_changes_rider_idx" ON "session_changes" USING btree ("org_id","rider_id","changed_at");--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_skip" CHECK (("planned_sessions"."skip_reason" is null or "planned_sessions"."skipped_at" is not null) and ("planned_sessions"."skip_reason" is null or "planned_sessions"."skip_reason" in ('ill','pain','tired','school','weather','time','travel','other')));--> statement-breakpoint
-- Why a session was moved or skipped (docs/adr/0117). A row is a record of
-- what somebody did: read by whoever reads the rider's training, a parent
-- included; written by whoever may change the rider's plan, as themselves
-- and in their own role; never changed or removed by the app. It goes with
-- the rider or the workspace, by cascade.
GRANT SELECT, INSERT ON "session_changes" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "session_changes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "session_changes" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_session_changes ON "session_changes" FOR SELECT TO kadence_app
  USING (org_id = (SELECT app_current_org_id()) AND app_can_read_rider(rider_id, 'training'));
--> statement-breakpoint
CREATE POLICY app_insert_session_changes ON "session_changes" FOR INSERT TO kadence_app
  WITH CHECK (
    org_id = (SELECT app_current_org_id())
    AND app_can_write_rider(rider_id)
    AND changed_by = (SELECT app_current_user_id())
    AND by_role = CASE
      WHEN EXISTS (
        SELECT 1 FROM riders r
        WHERE r.id = session_changes.rider_id AND r.user_id = (SELECT app_current_user_id())
      ) THEN 'rider'
      ELSE 'coach'
    END
  );
--> statement-breakpoint
CREATE TRIGGER audit_session_changes
  AFTER INSERT OR UPDATE OR DELETE ON "session_changes"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
-- The words beside a change are between the rider and the coaches: read
-- and written only by those who may change the rider's plan, so a parent
-- who reads the change never reads them.
GRANT SELECT, INSERT ON "session_change_notes" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "session_change_notes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "session_change_notes" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_session_change_notes ON "session_change_notes" FOR SELECT TO kadence_app
  USING (org_id = (SELECT app_current_org_id()) AND app_can_write_rider(rider_id));
--> statement-breakpoint
CREATE POLICY app_insert_session_change_notes ON "session_change_notes" FOR INSERT TO kadence_app
  WITH CHECK (
    org_id = (SELECT app_current_org_id())
    AND app_can_write_rider(rider_id)
    AND EXISTS (
      SELECT 1 FROM session_changes c
      WHERE c.id = session_change_notes.change_id
        AND c.rider_id = session_change_notes.rider_id
        AND c.changed_by = (SELECT app_current_user_id())
    )
  );
--> statement-breakpoint
CREATE TRIGGER audit_session_change_notes
  AFTER INSERT OR UPDATE OR DELETE ON "session_change_notes"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
-- Why a rider's sessions were moved or skipped is part of their training
-- history and follows it to another workspace (drizzle/0046, docs/adr/0081).
-- The list is the latest one, with the two tables added.
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
    ('device_inbox', 'move'),
    ('device_workouts', 'move'),
    ('session_changes', 'move'),
    ('session_change_notes', 'move'),
    ('guardians', 'stay'),
    ('planned_session_deletions', 'stay'),
    ('week_plan_drafts', 'stay'),
    ('club_championship_entries', 'stay'),
    ('club_champions', 'stay'),
    ('consents', 'stay')
$$;
