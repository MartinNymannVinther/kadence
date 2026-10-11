-- The trail without files (docs/adr/0088, docs/backlog.md S-04).
--
-- 1. audit_row_change() no longer turns a file into hex before it throws
--    it away. to_jsonb(NEW) on an activity_files row read the whole FIT
--    file (up to 25 MB) out of TOAST and wrote it as a hex string twice
--    its size, only for audit_redact() to drop the key afterwards. The
--    trigger now sets the heavy column to NULL on its own copy of the row
--    first — NEW and OLD are the trigger's variables, and an AFTER
--    trigger's row is already written, so the table keeps its bytes — and
--    to_jsonb never sees them. The columns are named, table by table:
--    activity_files.bytes, org_images.bytes and activities.streams.
--    tests/audit/files.test.ts fails a new bytea or streams column on an
--    audited table until it is named here too. audit_redact() keeps
--    'bytes' and 'streams' on its list as the safety net.
--
-- 2. A row deleted because its workspace is gone is not written to the
--    trail one by one. When a DELETE's own row names a workspace (org_id,
--    or organization_id on the auth tables) that no longer exists, the
--    deletion is a workspace's cascade, and whoever deleted the workspace
--    records it once: delete_workspace() below, the demo's clean-up and
--    scripts/delete-club.ts. Before this, every one of those rows was
--    written and then deleted again in the same transaction. Nothing an
--    application role can reach deletes a workspace: Better Auth's
--    organisation deletion is turned off (src/core/auth/auth.ts), and a
--    row's workspace exists for every ordinary delete, because org_id is
--    a foreign key on every table that carries it.
--
--    The obvious way, session_replication_role = replica around the
--    cascade, does not work: foreign keys are enforced by triggers too,
--    and in replica mode ON DELETE CASCADE does not fire. The test in
--    tests/audit/workspace-delete.test.ts shows the cascade still runs.
--
-- 3. delete_workspace() records one workspace.deleted event, with who did
--    it and how many rows each table held, and deletes the workspace's
--    audit rows as before.
--
-- 4. delete_expired_demo(): the demo's clean-up deletes an expired demo,
--    its throwaway accounts and every audit row about either, so a demo
--    leaves no trail. With DEMO=on the trail used to grow by a demo's
--    worth of rows for every visitor, forever.
--
-- 5. erase_rider() finds a rider's audit rows through an index instead of
--    reading the workspace's whole trail, and the export pages through a
--    workspace's trail by id.
--
-- RLS is unchanged.

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
  IF TG_TABLE_NAME IN ('activity_files', 'org_images') THEN
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

-- How many rows each table holds for a workspace, as one jsonb object of
-- the tables that hold any. Read just before a workspace is deleted, so
-- the one event that stays says what went. Every table with an org_id
-- (or Better Auth's organization_id) is counted, whatever is added later;
-- the trail itself and the demo's bookkeeping are not. Not granted to any
-- runtime role: it is called from the definer functions below and from
-- scripts/delete-club.ts, which runs as the superuser.
CREATE OR REPLACE FUNCTION workspace_row_counts(p_org_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_counts jsonb := '{}'::jsonb;
  v_table record;
  v_n bigint;
BEGIN
  FOR v_table IN
    SELECT c.relname AS table_name, a.attname AS column_name
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      AND a.attname IN ('org_id', 'organization_id') AND a.attnum > 0 AND NOT a.attisdropped
      AND c.relname NOT IN ('audit_log', 'demo_workspaces')
    ORDER BY c.relname
  LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE %I = $1', v_table.table_name, v_table.column_name)
      INTO v_n USING p_org_id;
    IF v_n > 0 THEN
      v_counts := v_counts || jsonb_build_object(v_table.table_name, v_n);
    END IF;
  END LOOP;
  RETURN v_counts;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION workspace_row_counts(text) FROM PUBLIC;
--> statement-breakpoint

-- Deleting a workspace (drizzle/0003), now with the cascade off the
-- trail: the audit trigger skips every row whose workspace is gone (see
-- audit_row_change above), the workspace's own audit rows are deleted as
-- before, and one context-free event says who deleted it and how much it
-- held. The owner check and its ERRCODE 42501 are unchanged
-- (src/modules/export/workspace.ts reads the code).
CREATE OR REPLACE FUNCTION delete_workspace(p_org_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_user text := nullif(current_setting('app.user_id', true), '');
  v_role text;
  v_counts jsonb;
BEGIN
  IF p_org_id IS NULL OR p_org_id <> nullif(current_setting('app.org_id', true), '') THEN
    RAISE EXCEPTION 'delete_workspace: not the active workspace';
  END IF;
  SELECT role INTO v_role FROM memberships WHERE organization_id = p_org_id AND user_id = v_user;
  IF v_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'delete_workspace: only the workspace owner may delete it'
      USING ERRCODE = '42501';
  END IF;

  v_counts := workspace_row_counts(p_org_id);

  DELETE FROM organizations WHERE id = p_org_id;

  PERFORM set_config('session_replication_role', 'replica', true);
  DELETE FROM audit_log WHERE org_id = p_org_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO audit_log (org_id, actor_user_id, actor_type, action, entity_type, entity_id, after_data)
  VALUES (NULL, v_user, 'user', 'workspace.deleted', 'organizations', p_org_id,
          jsonb_build_object('rows', v_counts));
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION delete_workspace(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION delete_workspace(text) TO kadence_app;
--> statement-breakpoint

-- An expired demo goes whole: the workspace, the throwaway accounts it
-- made (the visitor, the demo's rider and parent; demo_workspaces.user_id
-- and .accounts) and every audit row about either. The trail of a demo
-- is a stranger's sandbox, not the installation's history (ADR 0054), and
-- nothing records that it went.
--
-- Called by the clean-up as the auth role (src/modules/demo/service.ts).
-- It refuses anything that is not a demo whose time is up, by returning
-- false and doing nothing, so the role can never use it on a real club or
-- a demo that is still being shown. The row is locked, so two clean-ups
-- at once delete each demo once.
CREATE OR REPLACE FUNCTION delete_expired_demo(p_org_id text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_demo demo_workspaces%ROWTYPE;
  v_people text[];
BEGIN
  SELECT * INTO v_demo FROM demo_workspaces
  WHERE organization_id = p_org_id AND expires_at < now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT array_agg(DISTINCT person) INTO v_people FROM (
    SELECT v_demo.user_id AS person
    UNION ALL
    SELECT a ->> 'userId' FROM jsonb_array_elements(v_demo.accounts) a
  ) people
  WHERE person IS NOT NULL;

  DELETE FROM organizations WHERE id = p_org_id;
  DELETE FROM users WHERE id = ANY(v_people);

  PERFORM set_config('session_replication_role', 'replica', true);
  DELETE FROM audit_log WHERE org_id = p_org_id;
  -- The accounts' own rows carry no workspace: users and accounts, their
  -- passkeys and second factors, and the logins they made.
  DELETE FROM audit_log
  WHERE org_id IS NULL
    AND (
      actor_user_id = ANY(v_people)
      OR (entity_type = 'users' AND entity_id = ANY(v_people))
      OR before_data ->> 'user_id' = ANY(v_people)
      OR after_data ->> 'user_id' = ANY(v_people)
    );
  PERFORM set_config('session_replication_role', 'origin', true);
  RETURN true;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION delete_expired_demo(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION delete_expired_demo(text) TO kadence_auth;
--> statement-breakpoint

-- erase_rider() (drizzle/0006) looks for a rider's rows by
-- before_data/after_data ->> 'rider_id'. Partial, so the many rows that
-- name no rider take no room; the planner proves `x = $1` implies
-- `x IS NOT NULL` and uses them.
CREATE INDEX IF NOT EXISTS audit_log_before_rider_idx ON audit_log ((before_data ->> 'rider_id'))
  WHERE (before_data ->> 'rider_id') IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_log_after_rider_idx ON audit_log ((after_data ->> 'rider_id'))
  WHERE (after_data ->> 'rider_id') IS NOT NULL;
--> statement-breakpoint
-- The export reads a workspace's trail in pages by id (src/modules/export,
-- ADR 0088): this keeps each page an index range instead of a walk
-- through every other workspace's rows.
CREATE INDEX IF NOT EXISTS audit_log_org_id_idx ON audit_log (org_id, id);
