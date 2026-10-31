CREATE TABLE "device_inbox" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"file_name" text NOT NULL,
	"device_name" text,
	"sport" text,
	"bytes" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_inbox_provider" CHECK ("device_inbox"."provider" in ('wahoo','garmin','polar')),
	CONSTRAINT "device_inbox_sport" CHECK ("device_inbox"."sport" in ('bike','strength','other')),
	CONSTRAINT "device_inbox_device_name" CHECK (char_length("device_inbox"."device_name") <= 80),
	CONSTRAINT "device_inbox_size" CHECK (octet_length("device_inbox"."bytes") <= 26214400)
);
--> statement-breakpoint
ALTER TABLE "device_links" ADD COLUMN "refresh_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "device_links" ADD COLUMN "permissions" text[];--> statement-breakpoint
ALTER TABLE "device_inbox" ADD CONSTRAINT "device_inbox_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_inbox" ADD CONSTRAINT "device_inbox_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "device_inbox_activity_uq" ON "device_inbox" USING btree ("rider_id","provider","external_id");--> statement-breakpoint
-- Garmin on the Starter tier (docs/adr/0113). Garmin delivers by push
-- only, lets a ride's file be downloaded once, keeps a rider's refresh
-- token for a limited time, and tells Kadence what the rider lets it do.
--
-- device_links gains when the refresh token runs out and the rider's
-- permissions as Garmin last answered them (above). Its policies and its
-- audit trigger are unchanged.
--
-- device_inbox holds a ride's file between the download and the import,
-- so an import that fails for a moment is tried again from these bytes
-- rather than from Garmin, which would answer 410. A row lives minutes:
-- it goes in the transaction that imports the ride, or as soon as the
-- ride is refused for good. It is a rider's row like a ride's file, read
-- and written under the same rules as activity_files.
GRANT SELECT, INSERT, UPDATE, DELETE ON "device_inbox" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "device_inbox" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "device_inbox" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_device_inbox ON "device_inbox" FOR SELECT TO kadence_app
  USING (org_id = (SELECT app_current_org_id()) AND app_can_read_rider(rider_id, 'training'));
--> statement-breakpoint
CREATE POLICY app_write_device_inbox ON "device_inbox" FOR ALL TO kadence_app
  USING (org_id = (SELECT app_current_org_id()) AND app_can_write_rider(rider_id))
  WITH CHECK (org_id = (SELECT app_current_org_id()) AND app_can_write_rider(rider_id));
--> statement-breakpoint
CREATE TRIGGER audit_device_inbox
  AFTER INSERT OR UPDATE OR DELETE ON "device_inbox"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
-- The trail without files (drizzle/0042), with device_inbox.bytes named
-- beside activity_files.bytes. Otherwise unchanged.
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
    CASE WHEN v_actor IS NULL THEN 'system' ELSE 'user' END,
    TG_TABLE_NAME || '.' || lower(TG_OP),
    TG_TABLE_NAME,
    v_entity_id,
    audit_redact(v_before),
    audit_redact(v_after)
  );

  RETURN COALESCE(NEW, OLD);
END
$$;
--> statement-breakpoint
-- A file waiting for its import follows the rider's history to another
-- workspace with the link it came through (drizzle/0046, docs/adr/0081).
-- The list is the one from drizzle/0057, with device_inbox added.
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
-- Which connected links of a provider need the job `device.refresh`
-- (src/modules/devices/refresh-job.ts), for that job with nobody signed
-- in: `renew` when the refresh token runs out before p_before or nobody
-- knows when, `unknown_permissions` when the rider's permissions were
-- never read. Three ids and the two answers, nothing else, and only for
-- links device_link_owner (drizzle/0005) would also name: a rider with an
-- account, not archived, still a member. Everything after it runs as the
-- rider, under the ordinary policies. Refused from inside a workspace, so
-- no request reaches it.
CREATE OR REPLACE FUNCTION device_links_to_renew(p_provider text, p_before timestamptz)
RETURNS TABLE (org_id text, rider_id text, rider_user_id text, renew boolean, unknown_permissions boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF app_current_org_id() IS NOT NULL THEN
    RAISE EXCEPTION 'device_links_to_renew: not from a workspace' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT l.org_id, l.rider_id, r.user_id,
           (l.refresh_expires_at IS NULL OR l.refresh_expires_at < p_before),
           (l.permissions IS NULL)
    FROM device_links l
    JOIN riders r ON r.id = l.rider_id AND r.org_id = l.org_id
    WHERE l.provider = p_provider
      AND l.status = 'connected'
      AND (l.refresh_expires_at IS NULL OR l.refresh_expires_at < p_before OR l.permissions IS NULL)
      AND r.user_id IS NOT NULL
      AND NOT r.archived
      AND EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.organization_id = l.org_id AND m.user_id = r.user_id
      )
    ORDER BY l.refresh_expires_at NULLS FIRST, l.id
    LIMIT 1000;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION device_links_to_renew(text, timestamptz) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION device_links_to_renew(text, timestamptz) TO kadence_app;
--> statement-breakpoint
-- The caller's own links to a provider in every workspace, for "Slet min
-- konto" (src/modules/devices/exit.ts): a person who left a team keeps a
-- rider row there, and Garmin must be told before the account goes. Two
-- ids per link, and only links on rider rows whose account is the caller
-- (app.user_id); nothing for anybody else, and nothing without a caller.
-- The rest runs as the rider in each workspace, under the ordinary
-- policies.
CREATE OR REPLACE FUNCTION own_device_links(p_provider text)
RETURNS TABLE (org_id text, rider_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT l.org_id, l.rider_id
  FROM device_links l
  JOIN riders r ON r.id = l.rider_id AND r.org_id = l.org_id
  WHERE l.provider = p_provider
    AND r.user_id IS NOT NULL
    AND r.user_id = app_current_user_id()
  ORDER BY l.org_id
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION own_device_links(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION own_device_links(text) TO kadence_app;
