CREATE TABLE "device_workouts" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"planned_session_id" text,
	"provider" text NOT NULL,
	"external_workout_id" text,
	"external_schedule_id" text,
	"scheduled_on" date NOT NULL,
	"content_hash" text DEFAULT '' NOT NULL,
	"sent_at" timestamp with time zone,
	"last_error" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_workouts_provider" CHECK ("device_workouts"."provider" in ('wahoo','garmin','polar')),
	CONSTRAINT "device_workouts_ids" CHECK (char_length("device_workouts"."external_workout_id") <= 100 and char_length("device_workouts"."external_schedule_id") <= 100),
	CONSTRAINT "device_workouts_hash" CHECK (char_length("device_workouts"."content_hash") <= 64),
	CONSTRAINT "device_workouts_error" CHECK (char_length("device_workouts"."last_error") <= 40)
);
--> statement-breakpoint
ALTER TABLE "device_links" ADD COLUMN "auto_send" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "device_workouts" ADD CONSTRAINT "device_workouts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_workouts" ADD CONSTRAINT "device_workouts_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_workouts" ADD CONSTRAINT "device_workouts_planned_session_id_planned_sessions_id_fk" FOREIGN KEY ("planned_session_id") REFERENCES "public"."planned_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "device_workouts_session_uq" ON "device_workouts" USING btree ("planned_session_id","provider");--> statement-breakpoint
CREATE INDEX "device_workouts_rider_idx" ON "device_workouts" USING btree ("rider_id","provider");--> statement-breakpoint
-- Planned sessions onto the rider's Garmin (docs/adr/0114). Kadence keeps
-- the rider's bike sessions for the next seven days on their Garmin
-- calendar through Garmin's Training API, by itself unless the rider
-- turns it off, and a session is still sent when the rider or a coach
-- presses "Send til Garmin".
--
-- device_links gains auto_send (above): the rider's own choice, on by
-- default. The link's policies already let only the rider write it.
--
-- device_workouts remembers what was sent: Garmin's ids for the workout
-- and its schedule, the day, and a hash of the workout as sent, so a
-- session is sent again only when what the rider would ride changed. It
-- is a row about a rider like a comment on a session: read by whoever may
-- read the rider's training, written by the rider or a coach, and a row
-- may name only one of the rider's own sessions. A deleted session leaves
-- the row with no session, so the workout can still be taken off Garmin.
GRANT SELECT, INSERT, UPDATE, DELETE ON "device_workouts" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "device_workouts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "device_workouts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_device_workouts ON "device_workouts" FOR SELECT TO kadence_app
  USING (org_id = (SELECT app_current_org_id()) AND app_can_read_rider(rider_id, 'training'));
--> statement-breakpoint
CREATE POLICY app_write_device_workouts ON "device_workouts" FOR ALL TO kadence_app
  USING (org_id = (SELECT app_current_org_id()) AND app_can_write_rider(rider_id))
  WITH CHECK (
    org_id = (SELECT app_current_org_id())
    AND app_can_write_rider(rider_id)
    AND (planned_session_id IS NULL OR EXISTS (
      SELECT 1 FROM "planned_sessions" p
      WHERE p.id = device_workouts.planned_session_id AND p.rider_id = device_workouts.rider_id
    ))
  );
--> statement-breakpoint
CREATE TRIGGER audit_device_workouts
  AFTER INSERT OR UPDATE OR DELETE ON "device_workouts"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
-- What was sent follows the rider's history to another workspace, with
-- the sessions it names and the link it went through (drizzle/0046,
-- docs/adr/0081). The list is the one from drizzle/0061, with
-- device_workouts added after the sessions and the link.
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
    ('guardians', 'stay'),
    ('planned_session_deletions', 'stay'),
    ('week_plan_drafts', 'stay'),
    ('club_championship_entries', 'stay'),
    ('club_champions', 'stay'),
    ('consents', 'stay')
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION move_rider_history_tables() FROM PUBLIC;
--> statement-breakpoint
-- Which connected links of a provider the job `device.workouts`
-- (src/modules/devices/workouts-job.ts) looks at, for that job with
-- nobody signed in: `send` when the rider lets Kadence send by itself
-- (auto_send), granted workout import, and Garmin has not refused Kadence
-- workouts for the link; links that do not send are named only while they
-- hold rows from before p_today, which the job drops without asking
-- Garmin. Three ids and one answer, nothing else, and only for links
-- device_link_owner (drizzle/0005) would also name: a rider with an
-- account, not archived, still a member. Everything after it runs as the
-- rider, under the ordinary policies. Refused from inside a workspace, so
-- no request reaches it.
CREATE OR REPLACE FUNCTION device_links_to_sync(p_provider text, p_today date)
RETURNS TABLE (org_id text, rider_id text, rider_user_id text, send boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF app_current_org_id() IS NOT NULL THEN
    RAISE EXCEPTION 'device_links_to_sync: not from a workspace' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT s.org_id, s.rider_id, s.user_id, s.send
    FROM (
      SELECT l.id, l.org_id, l.rider_id, r.user_id,
             (l.auto_send
               AND 'WORKOUT_IMPORT' = ANY(coalesce(l.permissions, '{}'::text[]))
               AND l.last_error <> 'workouts_refused') AS send
      FROM device_links l
      JOIN riders r ON r.id = l.rider_id AND r.org_id = l.org_id
      WHERE l.provider = p_provider
        AND l.status = 'connected'
        AND r.user_id IS NOT NULL
        AND NOT r.archived
        AND EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.organization_id = l.org_id AND m.user_id = r.user_id
        )
    ) s
    WHERE s.send OR EXISTS (
      SELECT 1 FROM device_workouts w
      WHERE w.rider_id = s.rider_id AND w.provider = p_provider AND w.scheduled_on < p_today
    )
    ORDER BY s.id
    LIMIT 2000;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION device_links_to_sync(text, date) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION device_links_to_sync(text, date) TO kadence_app;
