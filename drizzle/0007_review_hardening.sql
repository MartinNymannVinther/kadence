-- Hardening after the first security review (docs/adr/0019). Each block
-- names the finding it closes.

-- 1. A SECURITY DEFINER function with `search_path = public` resolves an
-- unqualified name through pg_temp first, where any role with TEMPORARY
-- can create a table called `memberships` and make app_is_coach() say yes.
-- pg_temp goes last for every definer function, and the runtime roles lose
-- the right to create temporary tables at all.
ALTER FUNCTION ai_calls_last_day() SET search_path = pg_catalog, public, pg_temp;
--> statement-breakpoint
ALTER FUNCTION app_can_read_rider(text, text) SET search_path = pg_catalog, public, pg_temp;
--> statement-breakpoint
ALTER FUNCTION app_can_write_rider(text) SET search_path = pg_catalog, public, pg_temp;
--> statement-breakpoint
ALTER FUNCTION app_is_coach() SET search_path = pg_catalog, public, pg_temp;
--> statement-breakpoint
ALTER FUNCTION app_is_guardian_of(text, text) SET search_path = pg_catalog, public, pg_temp;
--> statement-breakpoint
ALTER FUNCTION app_is_rider_self(text) SET search_path = pg_catalog, public, pg_temp;
--> statement-breakpoint
ALTER FUNCTION audit_row_change() SET search_path = pg_catalog, public, pg_temp;
--> statement-breakpoint
ALTER FUNCTION claim_invitation_links(text) SET search_path = pg_catalog, public, pg_temp;
--> statement-breakpoint
ALTER FUNCTION delete_workspace(text) SET search_path = pg_catalog, public, pg_temp;
--> statement-breakpoint
ALTER FUNCTION device_link_owner(text, text) SET search_path = pg_catalog, public, pg_temp;
--> statement-breakpoint
ALTER FUNCTION erase_rider(text) SET search_path = pg_catalog, public, pg_temp;
--> statement-breakpoint
ALTER FUNCTION guardians_guard() SET search_path = pg_catalog, public, pg_temp;
--> statement-breakpoint
DO $$
BEGIN
  EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
END
$$;
--> statement-breakpoint

-- 2. What a parent sees of the rider row. The row carries thresholds (FTP,
-- pulse) as well as the name; a parent reads it under the training scope,
-- which the rider can switch off, not under a scope the rider cannot.
DROP POLICY IF EXISTS app_read_riders ON "riders";
--> statement-breakpoint
CREATE POLICY app_read_riders ON "riders" FOR SELECT TO kadence_app
  USING (
    org_id = app_current_org_id()
    AND (app_is_coach() OR user_id = app_current_user_id() OR app_is_guardian_of(id, 'training'))
  );
--> statement-breakpoint

-- 3. Who may change which column of a rider row. The sharing is the
-- rider's alone (ADR 0011) — not the coach's; the rider may change their
-- thresholds and their sharing, and nothing else of their own row (not
-- the birth year that decides when a parent's link lapses, not archived,
-- not the class). A changed birth year withdraws every guardian's
-- confirmation, so a coach's correction can never reopen a lapsed link.
CREATE OR REPLACE FUNCTION riders_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_user text := app_current_user_id();
  v_self boolean;
BEGIN
  IF v_user IS NULL THEN
    RETURN NEW;
  END IF;
  v_self := OLD.user_id IS NOT DISTINCT FROM v_user;
  IF (NEW.share_training IS DISTINCT FROM OLD.share_training
      OR NEW.share_wellbeing IS DISTINCT FROM OLD.share_wellbeing) AND NOT v_self THEN
    RAISE EXCEPTION 'riders: only the rider decides what the parents see' USING ERRCODE = '42501';
  END IF;
  IF v_self AND NOT app_is_coach() AND (
      NEW.name IS DISTINCT FROM OLD.name
      OR NEW.birth_year IS DISTINCT FROM OLD.birth_year
      OR NEW.sex IS DISTINCT FROM OLD.sex
      OR NEW.category_override IS DISTINCT FROM OLD.category_override
      OR NEW.archived IS DISTINCT FROM OLD.archived
      OR NEW.invitation_id IS DISTINCT FROM OLD.invitation_id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION 'riders: a rider changes only thresholds and sharing' USING ERRCODE = '42501';
  END IF;
  IF NEW.birth_year IS DISTINCT FROM OLD.birth_year THEN
    UPDATE guardians SET confirmed_at = NULL, confirmed_as_adult = false WHERE rider_id = NEW.id;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER riders_guard
  BEFORE UPDATE ON "riders"
  FOR EACH ROW EXECUTE FUNCTION riders_guard();
--> statement-breakpoint

-- 4. A guardian link: withdrawing a confirmation is anyone's who may write
-- the link (it only takes access away); giving one is the rider's, and
-- only for a link a person already holds; and the first time a person
-- takes a link, any confirmation made before goes — the rider confirms the
-- person, not a name a coach typed.
CREATE OR REPLACE FUNCTION guardians_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.confirmed_at := NULL;
    NEW.confirmed_as_adult := false;
  END IF;
  IF app_current_user_id() IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF (NEW.confirmed_at IS NOT NULL OR NEW.confirmed_as_adult) THEN
      RAISE EXCEPTION 'guardians: only the rider can confirm a guardian' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.rider_id IS DISTINCT FROM OLD.rider_id
    OR (OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION 'guardians: a link cannot change hands' USING ERRCODE = '42501';
  END IF;
  IF (NEW.confirmed_at IS NOT NULL AND NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at)
    OR (NEW.confirmed_as_adult AND NOT OLD.confirmed_as_adult) THEN
    IF NOT app_is_rider_self(NEW.rider_id) OR NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'guardians: only the rider can confirm a guardian, once a person holds the link'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint

-- 5. A comment moved by its author must still name the author's own
-- rider's session or activity, as a new one must.
DROP POLICY IF EXISTS app_update_comments ON "comments";
--> statement-breakpoint
CREATE POLICY app_update_comments ON "comments" FOR UPDATE TO kadence_app
  USING (org_id = app_current_org_id() AND author_id = app_current_user_id())
  WITH CHECK (
    org_id = app_current_org_id()
    AND author_id = app_current_user_id()
    AND app_can_write_rider(rider_id)
    AND (planned_session_id IS NULL OR EXISTS (
      SELECT 1 FROM "planned_sessions" p WHERE p.id = comments.planned_session_id AND p.rider_id = comments.rider_id
    ))
    AND (activity_id IS NULL OR EXISTS (
      SELECT 1 FROM "activities" a WHERE a.id = comments.activity_id AND a.rider_id = comments.rider_id
    ))
  );
--> statement-breakpoint

-- 6. The application writes audit rows in its caller's name only.
DROP POLICY IF EXISTS app_insert_audit ON "audit_log";
--> statement-breakpoint
CREATE POLICY app_insert_audit ON "audit_log" FOR INSERT TO kadence_app
  WITH CHECK (org_id = app_current_org_id() AND actor_user_id = app_current_user_id());
--> statement-breakpoint

-- 7. The team's model and its key are the coaches' to change; every member
-- may read which model is in use.
DROP POLICY IF EXISTS app_tenant_workspace_llm_settings ON "workspace_llm_settings";
--> statement-breakpoint
CREATE POLICY app_read_workspace_llm_settings ON "workspace_llm_settings" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id());
--> statement-breakpoint
CREATE POLICY app_write_workspace_llm_settings ON "workspace_llm_settings" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach())
  WITH CHECK (org_id = app_current_org_id() AND app_is_coach());
