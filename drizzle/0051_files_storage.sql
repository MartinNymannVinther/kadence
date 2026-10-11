-- Files in the database or in an EU object store, with quotas
-- (docs/adr/0087, backlog S-09, plan §5.1).
--
-- 1. Where a ride's file is. activity_files.bytes was the file; it may now
--    be null when the file is an object in an S3-compatible store and the
--    row keeps its key instead, `<org id>/<rider id>/<sha256>.fit`. Exactly
--    one of the two is set. size_bytes is the file's size whichever place
--    holds it, filled by a trigger from the bytes when they are in the
--    row, so a sum over a workspace never reads a file. RLS on the row is
--    unchanged: the row decides who may read, and the application fetches
--    the object only after the row was read under the caller's policies.
--    audit_row_change() already empties `bytes` on its copy (drizzle/0042);
--    the key is an id and is recorded like any other column.
ALTER TABLE "activity_files" ALTER COLUMN "bytes" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "activity_files" ADD COLUMN "storage_key" text;
--> statement-breakpoint
ALTER TABLE "activity_files" ADD COLUMN "size_bytes" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- The size of every file already here. Under replica mode so the audit
-- trigger does not write a trail row per file for a column it has never
-- seen; nothing else here is a trigger's business (no foreign key changes).
-- At today's size (under a gigabyte of files) this is seconds.
SET session_replication_role = replica;
--> statement-breakpoint
UPDATE "activity_files" SET "size_bytes" = octet_length("bytes") WHERE "bytes" IS NOT NULL;
--> statement-breakpoint
SET session_replication_role = origin;
--> statement-breakpoint
ALTER TABLE "activity_files" ADD CONSTRAINT "activity_files_one_place" CHECK (("activity_files"."bytes" is null) <> ("activity_files"."storage_key" is null));
--> statement-breakpoint
ALTER TABLE "activity_files" ADD CONSTRAINT "activity_files_size" CHECK ("activity_files"."size_bytes" >= 0);
--> statement-breakpoint
-- The tombstone job asks whether a key is still held, and the move job
-- asks for a rider's keys that do not yet name their new workspace.
CREATE INDEX "activity_files_storage_key_idx" ON "activity_files" USING btree ("storage_key");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION activity_files_size() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NEW.bytes IS NOT NULL THEN
    NEW.size_bytes := octet_length(NEW.bytes);
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER activity_files_size_trg
  BEFORE INSERT OR UPDATE ON "activity_files"
  FOR EACH ROW EXECUTE FUNCTION activity_files_size();
--> statement-breakpoint

-- 2. Tombstones: objects whose row is gone. The database cannot delete
--    from an object store. When a file's row is deleted — by the rider, by
--    erase_rider(), by delete_workspace()'s cascade — or its key changes
--    (the move job), a trigger writes the old key here, and the job
--    files.tombstones deletes the objects and these rows every fifteen
--    minutes. The application also writes a key here before it uploads an
--    object, and deletes it in the transaction that writes the row, so an
--    upload whose transaction never commits leaves an object the job
--    removes. The job leaves keys younger than a few minutes alone for
--    that reason. The installation's table like jobs (drizzle/0047): no
--    org_id (a deleted workspace's keys must outlive it), one policy for
--    the application role, no audit trigger (named in
--    tests/rls/tenant-isolation.test.ts): a key is two ids and a hash.
CREATE TABLE "file_tombstones" (
	"storage_key" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON "file_tombstones" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "file_tombstones" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "file_tombstones" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_all_file_tombstones ON "file_tombstones" FOR ALL TO kadence_app
  USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION file_tombstone() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.storage_key IS NOT NULL THEN
      INSERT INTO file_tombstones (storage_key) VALUES (OLD.storage_key) ON CONFLICT DO NOTHING;
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.storage_key IS NOT NULL AND OLD.storage_key IS DISTINCT FROM NEW.storage_key THEN
    INSERT INTO file_tombstones (storage_key) VALUES (OLD.storage_key) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER file_tombstone_on_delete
  AFTER DELETE ON "activity_files"
  FOR EACH ROW EXECUTE FUNCTION file_tombstone();
--> statement-breakpoint
CREATE TRIGGER file_tombstone_on_rekey
  AFTER UPDATE OF "storage_key" ON "activity_files"
  FOR EACH ROW EXECUTE FUNCTION file_tombstone();
--> statement-breakpoint
-- Fires under session_replication_role = replica as well, which the
-- definer functions that erase and move use for one transaction: an
-- object must never be left without its row and without a tombstone.
ALTER TABLE "activity_files" ENABLE ALWAYS TRIGGER file_tombstone_on_delete;
--> statement-breakpoint
ALTER TABLE "activity_files" ENABLE ALWAYS TRIGGER file_tombstone_on_rekey;
--> statement-breakpoint
-- The keys whose objects the job may delete now: older than p_grace, and
-- held by no row (a tombstone whose key a row holds again is a reservation
-- that was kept, and goes without touching the object). Locked for the
-- caller's transaction with SKIP LOCKED, so two workers never delete the
-- same object and an upload reserving the same key waits for the delete.
-- Only for a process with no workspace in its context — the worker — and
-- refused with 42501 from a request, which always has one.
CREATE OR REPLACE FUNCTION file_tombstones_due(p_limit integer, p_grace interval DEFAULT interval '5 minutes')
RETURNS SETOF text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF app_current_org_id() IS NOT NULL THEN
    RAISE EXCEPTION 'file_tombstones_due: not from a workspace' USING ERRCODE = '42501';
  END IF;
  DELETE FROM file_tombstones t
  WHERE t.created_at < now() - p_grace
    AND EXISTS (SELECT 1 FROM activity_files f WHERE f.storage_key = t.storage_key);
  RETURN QUERY
    SELECT t.storage_key FROM file_tombstones t
    WHERE t.created_at < now() - p_grace
    ORDER BY t.created_at
    LIMIT greatest(p_limit, 0)
    FOR UPDATE SKIP LOCKED;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION file_tombstones_due(integer, interval) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION file_tombstones_due(integer, interval) TO kadence_app;
--> statement-breakpoint

-- 3. Moving the files already in the database out to objects
--    (scripts/migrate-files.ts, the job files.migrate): the rows that still
--    hold bytes, oldest first, and the one update that makes a row point
--    at its object instead. Both only for a process with no workspace in
--    its context, as above; the job verifies the object's sha256 before it
--    calls the second. The audit trigger records the update without the
--    bytes (drizzle/0042), as the system.
CREATE OR REPLACE FUNCTION activity_files_in_rows(p_limit integer)
RETURNS TABLE (id text, org_id text, rider_id text, sha256 text, bytes bytea)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF app_current_org_id() IS NOT NULL THEN
    RAISE EXCEPTION 'activity_files_in_rows: not from a workspace' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT f.id, f.org_id, f.rider_id, f.sha256, f.bytes FROM activity_files f
    WHERE f.bytes IS NOT NULL
    ORDER BY f.created_at, f.id
    LIMIT greatest(p_limit, 0);
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION activity_files_in_rows(integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION activity_files_in_rows(integer) TO kadence_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION activity_file_moved_out(p_id text, p_key text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_n integer;
BEGIN
  IF app_current_org_id() IS NOT NULL THEN
    RAISE EXCEPTION 'activity_file_moved_out: not from a workspace' USING ERRCODE = '42501';
  END IF;
  UPDATE activity_files SET storage_key = p_key, bytes = NULL
  WHERE id = p_id AND bytes IS NOT NULL
    AND p_key = org_id || '/' || rider_id || '/' || sha256 || '.fit';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n > 0;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION activity_file_moved_out(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION activity_file_moved_out(text, text) TO kadence_app;
--> statement-breakpoint
-- How many files are in rows and how many are objects, across the
-- installation, for scripts/migrate-files.ts: two counts, no file.
CREATE OR REPLACE FUNCTION activity_files_places()
RETURNS TABLE (in_rows bigint, as_objects bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF app_current_org_id() IS NOT NULL THEN
    RAISE EXCEPTION 'activity_files_places: not from a workspace' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT count(*) FILTER (WHERE f.bytes IS NOT NULL), count(*) FILTER (WHERE f.storage_key IS NOT NULL)
    FROM activity_files f;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION activity_files_places() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION activity_files_places() TO kadence_app;
--> statement-breakpoint

-- 4. A quota per workspace. team_settings.file_quota_bytes is how much
--    file the workspace may hold; null is the installation's default for
--    its kind (FILES_QUOTA_CLUB_BYTES, FILES_QUOTA_PERSONAL_BYTES). Like
--    ai_budget_micro (drizzle/0049) only the installation's owner sets it:
--    the guard trigger refuses the application role, and set_file_quota()
--    checks the caller owns the installation. workspace_file_usage() adds
--    the workspace's files up for any member of it — a rider sees only
--    their own rows under RLS, and the quota is the workspace's — and
--    answers three numbers and a word, nothing about any file.
ALTER TABLE "team_settings" ADD COLUMN "file_quota_bytes" bigint;
--> statement-breakpoint
ALTER TABLE "team_settings" ADD CONSTRAINT "team_settings_file_quota" CHECK ("team_settings"."file_quota_bytes" >= 0);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION team_settings_budget_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  -- current_user is the role running the statement: kadence_app for the
  -- application, the function's owner inside set_ai_budget() and
  -- set_file_quota().
  IF current_user = 'kadence_app' AND (
    (TG_OP = 'INSERT' AND (NEW.ai_budget_micro IS NOT NULL OR NEW.file_quota_bytes IS NOT NULL))
    OR (TG_OP = 'UPDATE' AND (
      NEW.ai_budget_micro IS DISTINCT FROM OLD.ai_budget_micro
      OR NEW.file_quota_bytes IS DISTINCT FROM OLD.file_quota_bytes
    ))
  ) THEN
    RAISE EXCEPTION 'only the installation owner sets a workspace''s AI budget or file quota' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_file_quota(p_org text, p_quota_bytes bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = app_current_user_id() AND u.platform_role = 'owner'
  ) THEN
    RAISE EXCEPTION 'only the installation owner sets a file quota' USING ERRCODE = '42501';
  END IF;
  IF p_quota_bytes IS NOT NULL AND p_quota_bytes < 0 THEN
    RAISE EXCEPTION 'a quota is not negative' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = p_org) THEN
    RAISE EXCEPTION 'no such workspace' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO team_settings (org_id, file_quota_bytes) VALUES (p_org, p_quota_bytes)
  ON CONFLICT (org_id) DO UPDATE SET file_quota_bytes = EXCLUDED.file_quota_bytes, updated_at = now();
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION set_file_quota(text, bigint) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION set_file_quota(text, bigint) TO kadence_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION workspace_file_usage()
RETURNS TABLE (used_bytes bigint, quota_bytes bigint, kind text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_org text := app_current_org_id();
BEGIN
  IF v_org IS NULL OR NOT EXISTS (
    SELECT 1 FROM memberships m WHERE m.organization_id = v_org AND m.user_id = app_current_user_id()
  ) THEN
    RAISE EXCEPTION 'workspace_file_usage: not a member of the active workspace' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT
      (SELECT coalesce(sum(f.size_bytes), 0)::bigint FROM activity_files f WHERE f.org_id = v_org),
      (SELECT ts.file_quota_bytes FROM team_settings ts WHERE ts.org_id = v_org),
      (SELECT o.kind FROM organizations o WHERE o.id = v_org);
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION workspace_file_usage() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION workspace_file_usage() TO kadence_app;
--> statement-breakpoint

-- 5. The owner's overview counts files by size_bytes, and gains the
--    workspace's quota as one more column after the others (drizzle/0049's
--    definition otherwise unchanged).
DROP FUNCTION IF EXISTS platform_overview();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION platform_overview()
RETURNS TABLE (
  org_id text,
  name text,
  kind text,
  created_at timestamptz,
  coaches bigint,
  riders bigint,
  parents bigint,
  members bigint,
  last_seen timestamptz,
  file_bytes bigint,
  ai_calls_day bigint,
  pilot_week date,
  pilot_riders bigint,
  pilot_checked_in bigint,
  pilot_sessions bigint,
  pilot_receipts bigint,
  pilot_minutes bigint,
  ai_cost_month_micro bigint,
  ai_unpriced_month bigint,
  ai_budget_micro bigint,
  file_quota_bytes bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Copenhagen')::date;
  v_monday date := v_today - (extract(isodow FROM v_today)::int - 1) - 7;
  v_sunday date := v_monday + 6;
  v_from timestamptz := v_monday::timestamp AT TIME ZONE 'Europe/Copenhagen';
  v_to timestamptz := (v_sunday + 1)::timestamp AT TIME ZONE 'Europe/Copenhagen';
  v_month timestamptz := date_trunc('month', now() AT TIME ZONE 'Europe/Copenhagen') AT TIME ZONE 'Europe/Copenhagen';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = app_current_user_id() AND u.platform_role = 'owner'
  ) THEN
    RAISE EXCEPTION 'only the installation owner sees the overview' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    o.id,
    CASE WHEN o.kind = 'personal' THEN NULL ELSE o.name END,
    o.kind,
    o.created_at,
    (SELECT count(*) FROM memberships m WHERE m.organization_id = o.id AND m.role IN ('owner', 'admin')),
    (SELECT count(*) FROM riders r WHERE r.org_id = o.id AND NOT r.archived),
    (SELECT count(DISTINCT g.user_id) FROM guardians g WHERE g.org_id = o.id AND g.confirmed_at IS NOT NULL),
    (SELECT count(*) FROM memberships m WHERE m.organization_id = o.id),
    (SELECT max(s.updated_at) FROM sessions s JOIN memberships m ON m.user_id = s.user_id WHERE m.organization_id = o.id),
    (SELECT coalesce(sum(f.size_bytes), 0)::bigint FROM activity_files f WHERE f.org_id = o.id),
    (SELECT count(*) FROM ai_calls a WHERE a.org_id = o.id AND a.created_at > now() - interval '1 day'),
    v_monday,
    pr.riders_n,
    pr.checked_in_n,
    ps.sessions_n,
    ps.receipts_n,
    pm.minutes_n,
    ai.cost_micro,
    ai.unpriced_n,
    (SELECT ts.ai_budget_micro FROM team_settings ts WHERE ts.org_id = o.id),
    (SELECT ts.file_quota_bytes FROM team_settings ts WHERE ts.org_id = o.id)
  FROM organizations o
  -- The week's riders, and how many of them checked in on four days.
  CROSS JOIN LATERAL (
    SELECT
      count(*) AS riders_n,
      count(*) FILTER (WHERE (
        SELECT count(*) FROM checkins c
        WHERE c.rider_id = r.id AND c.on_date BETWEEN v_monday AND v_sunday
      ) >= 4) AS checked_in_n
    FROM riders r
    WHERE r.org_id = o.id
      AND NOT r.archived
      AND (r.created_at AT TIME ZONE 'Europe/Copenhagen')::date <= v_monday
  ) pr
  -- Their sessions that week, and how many carry a receipt.
  CROSS JOIN LATERAL (
    SELECT count(*) AS sessions_n, count(p.activity_id) AS receipts_n
    FROM planned_sessions p
    JOIN riders r ON r.id = p.rider_id
    WHERE p.org_id = o.id
      AND p.on_date BETWEEN v_monday AND v_sunday
      AND NOT r.archived
      AND (r.created_at AT TIME ZONE 'Europe/Copenhagen')::date <= v_monday
  ) ps
  -- The coaches' planning stretches: a row starts a new stretch when the
  -- same coach's previous one is 10 minutes or more before it; a stretch
  -- lasts from its first row to its last, at least 2 minutes.
  CROSS JOIN LATERAL (
    SELECT coalesce(round(sum(greatest(st.secs, 120)) / 60), 0)::bigint AS minutes_n
    FROM (
      SELECT extract(epoch FROM max(e.moment) - min(e.moment)) AS secs
      FROM (
        SELECT g.actor, g.moment, sum(g.starts) OVER (PARTITION BY g.actor ORDER BY g.moment, g.id) AS stretch
        FROM (
          SELECT
            a.id,
            a.actor_user_id AS actor,
            a.created_at AS moment,
            CASE
              WHEN a.created_at - lag(a.created_at) OVER (PARTITION BY a.actor_user_id ORDER BY a.created_at, a.id)
                < interval '10 minutes' THEN 0
              ELSE 1
            END AS starts
          FROM audit_log a
          WHERE a.org_id = o.id
            AND a.created_at >= v_from
            AND a.created_at < v_to
            AND a.entity_type IN ('planned_sessions', 'training_blocks', 'training_block_items', 'season_plans')
            AND a.actor_user_id IN (
              SELECT m.user_id FROM memberships m
              WHERE m.organization_id = o.id AND m.role IN ('owner', 'admin')
            )
        ) g
      ) e
      GROUP BY e.actor, e.stretch
    ) st
  ) pm
  -- This month's AI on the installation's key: what it cost, and how many
  -- calls used tokens at a price nobody knows (docs/adr/0089).
  CROSS JOIN LATERAL (
    SELECT
      coalesce(sum(a.cost_micro), 0)::bigint AS cost_micro,
      count(*) FILTER (WHERE a.tokens_in IS NOT NULL AND a.cost_micro IS NULL) AS unpriced_n
    FROM ai_calls a
    WHERE a.org_id = o.id AND a.created_at >= v_month AND a.billed_to = 'installation'
  ) ai
  WHERE NOT EXISTS (SELECT 1 FROM demo_workspaces d WHERE d.organization_id = o.id)
  ORDER BY o.created_at;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION platform_overview() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION platform_overview() TO kadence_app;
