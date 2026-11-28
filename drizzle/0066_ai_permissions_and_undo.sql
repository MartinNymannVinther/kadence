CREATE TABLE "ai_actions" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"connection_id" text,
	"tool" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"kind" text NOT NULL,
	"before" jsonb,
	"after_stamp" timestamp with time zone,
	"file_meta" jsonb,
	"file_bytes" "bytea",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"undone_at" timestamp with time zone,
	CONSTRAINT "ai_actions_entity" CHECK ("ai_actions"."entity" in ('planned_session', 'activity', 'checkin')),
	CONSTRAINT "ai_actions_kind" CHECK ("ai_actions"."kind" in ('created', 'updated', 'deleted')),
	CONSTRAINT "ai_actions_tool" CHECK (char_length("ai_actions"."tool") between 1 and 64)
);
--> statement-breakpoint
ALTER TABLE "session_changes" ADD COLUMN "via" text DEFAULT 'app' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_connections" ADD COLUMN "permissions" text[] DEFAULT array['read_sessions','read_rides','read_checkins','read_form','read_season']::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_connection_id_ai_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."ai_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_actions_user_idx" ON "ai_actions" USING btree ("org_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_actions_created_idx" ON "ai_actions" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "session_changes" ADD CONSTRAINT "session_changes_via" CHECK ("session_changes"."via" in ('app', 'ai'));--> statement-breakpoint
ALTER TABLE "ai_connections" ADD CONSTRAINT "ai_connections_permissions" CHECK ("ai_connections"."permissions" <@ array['read_sessions','read_rides','read_checkins','read_form','read_season','write_checkin','write_ride_feedback','write_move_skip','write_sessions','delete_sessions','delete_manual','delete_rides','delete_checkins']::text[]);
--> statement-breakpoint
-- What a person's own assistant wrote or deleted, for the person to undo
-- (docs/adr/0120). The person's own rows in the workspace, nobody else's:
-- not a coach, not a parent. Written once; afterwards only the undo is
-- noted, once. The sweep below takes rows past 30 days.
GRANT SELECT, INSERT, UPDATE ON "ai_actions" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "ai_actions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "ai_actions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_own_ai_actions ON "ai_actions" FOR ALL TO kadence_app
  USING (org_id = (SELECT app_current_org_id()) AND user_id = (SELECT app_current_user_id()))
  WITH CHECK (
    org_id = (SELECT app_current_org_id())
    AND user_id = (SELECT app_current_user_id())
    AND app_can_write_rider(rider_id)
  );
--> statement-breakpoint
CREATE OR REPLACE FUNCTION ai_actions_only_undo() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF (to_jsonb(NEW) - 'undone_at') IS DISTINCT FROM (to_jsonb(OLD) - 'undone_at')
     OR OLD.undone_at IS NOT NULL THEN
    RAISE EXCEPTION 'ai_actions: only an undo may be written, once' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER ai_actions_only_undo
  BEFORE UPDATE ON "ai_actions"
  FOR EACH ROW EXECUTE FUNCTION ai_actions_only_undo();
--> statement-breakpoint
CREATE TRIGGER audit_ai_actions
  AFTER INSERT OR UPDATE OR DELETE ON "ai_actions"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
-- The undo window is 30 days; past it, the before-pictures and files go,
-- across workspaces, and nothing else.
CREATE OR REPLACE FUNCTION ai_actions_sweep() RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
  WITH gone AS (
    DELETE FROM ai_actions WHERE created_at < now() - interval '30 days' RETURNING 1
  )
  SELECT count(*)::int FROM gone
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION ai_actions_sweep() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION ai_actions_sweep() TO kadence_app;
--> statement-breakpoint
-- A change an assistant made says so, and only then: the channel the
-- request came in by decides, not the caller (docs/adr/0120).
DROP POLICY app_insert_session_changes ON "session_changes";
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
    AND via = CASE WHEN current_setting('app.channel', true) = 'mcp' THEN 'ai' ELSE 'app' END
  );
--> statement-breakpoint
-- An assistant's undo log is the person's in the workspace it was made in,
-- and stays there when the rider's history moves (drizzle/0046).
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
    ('ai_actions', 'stay'),
    ('consents', 'stay')
$$;
--> statement-breakpoint
-- The audit trail keeps who changed what in the undo log, never its copy
-- of a row or a ride's file (docs/adr/0120). The function is the one from
-- drizzle/0063, with ai_actions added to the heavy columns.
CREATE OR REPLACE FUNCTION audit_row_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_org text := nullif(current_setting('app.org_id', true), '');
  v_actor text := nullif(current_setting('app.user_id', true), '');
  v_before jsonb;
  v_after jsonb;
  v_entity_id text;
  v_row_org text;
BEGIN
  -- The heavy columns, emptied on the trigger's copy of the row before it
  -- becomes jsonb. Each name is only resolved on its own table.
  IF TG_TABLE_NAME IN ('activity_files', 'org_images', 'device_inbox') THEN
    IF TG_OP <> 'DELETE' THEN NEW.bytes := NULL; END IF;
    IF TG_OP <> 'INSERT' THEN OLD.bytes := NULL; END IF;
  ELSIF TG_TABLE_NAME = 'activities' THEN
    IF TG_OP <> 'DELETE' THEN NEW.streams := NULL; END IF;
    IF TG_OP <> 'INSERT' THEN OLD.streams := NULL; END IF;
  ELSIF TG_TABLE_NAME = 'ai_actions' THEN
    -- The undo log's picture of a row and a ride's file (drizzle/0066):
    -- the rows themselves are audited where they live.
    IF TG_OP <> 'DELETE' THEN NEW.file_bytes := NULL; NEW.before := NULL; END IF;
    IF TG_OP <> 'INSERT' THEN OLD.file_bytes := NULL; OLD.before := NULL; END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
  ELSE
    v_before := to_jsonb(OLD);
    -- A row going with its workspace: the workspace's deletion is the
    -- event, recorded once by whoever deleted it.
    IF TG_TABLE_NAME <> 'organizations' THEN
      v_row_org := coalesce(v_before ->> 'org_id', v_before ->> 'organization_id');
      IF v_row_org IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM organizations WHERE id = v_row_org) THEN
        RETURN OLD;
      END IF;
    END IF;
  END IF;

  IF v_org IS NULL THEN
    v_org := coalesce(
      v_after ->> 'org_id',
      v_before ->> 'org_id',
      v_after ->> 'organization_id',
      v_before ->> 'organization_id'
    );
    IF v_org IS NULL AND TG_TABLE_NAME = 'organizations' THEN
      v_org := coalesce(v_after ->> 'id', v_before ->> 'id');
    END IF;
  END IF;

  v_entity_id := coalesce(v_after ->> 'id', v_before ->> 'id');

  INSERT INTO audit_log (
    org_id, actor_user_id, actor_type, action,
    entity_type, entity_id, before_data, after_data
  )
  VALUES (
    v_org,
    v_actor,
    CASE
      WHEN v_actor IS NULL THEN 'system'
      WHEN current_setting('app.channel', true) = 'mcp' THEN 'ai_connection'
      ELSE 'user'
    END,
    TG_TABLE_NAME || '.' || lower(TG_OP),
    TG_TABLE_NAME,
    v_entity_id,
    audit_redact(v_before),
    audit_redact(v_after)
  );

  RETURN COALESCE(NEW, OLD);
END
$$;
