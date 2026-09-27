-- Security for the product tables: grants, forced row-level security, the
-- rider policies, audit triggers, and the privileged operations the
-- application role is allowed through functions that check the caller
-- themselves. See docs/adr/0002, 0003 and 0011.

-- The application role may read and write the product tables; RLS decides
-- which rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "team_settings", "riders", "guardians", "rider_measurements", "season_plans",
  "workout_templates", "planned_sessions", "activities", "activity_files",
  "checkins", "calendar_events", "comments", "device_links"
TO kadence_app;
--> statement-breakpoint
ALTER TABLE "team_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "team_settings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "riders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "riders" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "guardians" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "guardians" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rider_measurements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rider_measurements" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "season_plans" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "season_plans" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "workout_templates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "workout_templates" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "planned_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "planned_sessions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "activities" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "activity_files" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "activity_files" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "checkins" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "checkins" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "calendar_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "comments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "device_links" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "device_links" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Who the caller is to a rider. SECURITY DEFINER (owned by the migration
-- superuser) so a policy on one table can ask about memberships, riders
-- and guardians without those tables' own policies recursing into it.
-- Each answers only about the caller in the active workspace, taken from
-- the transaction-local context: no context, no answer but false.
CREATE OR REPLACE FUNCTION app_is_coach() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE organization_id = app_current_org_id()
      AND user_id = app_current_user_id()
      AND role IN ('owner', 'admin')
  )
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_is_rider_self(p_rider text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM riders
    WHERE id = p_rider
      AND org_id = app_current_org_id()
      AND user_id = app_current_user_id()
  )
$$;
--> statement-breakpoint
-- A guardian sees a rider's data only once the rider has confirmed the
-- link, only for what the rider shares, and — from the year the rider
-- turns 18 — only if the rider has confirmed the link again as an adult.
-- p_scope: 'profile' (the rider's name and class), 'training' or
-- 'wellbeing'.
CREATE OR REPLACE FUNCTION app_is_guardian_of(p_rider text, p_scope text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM guardians g JOIN riders r ON r.id = g.rider_id
    WHERE g.rider_id = p_rider
      AND g.org_id = app_current_org_id()
      AND r.org_id = g.org_id
      AND g.user_id = app_current_user_id()
      AND g.confirmed_at IS NOT NULL
      AND (r.birth_year + 18 > extract(year FROM now())::int OR g.confirmed_as_adult)
      AND CASE p_scope
        WHEN 'profile' THEN true
        WHEN 'training' THEN r.share_training
        WHEN 'wellbeing' THEN r.share_wellbeing
        ELSE false
      END
  )
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_can_read_rider(p_rider text, p_scope text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_is_coach() OR app_is_rider_self(p_rider) OR app_is_guardian_of(p_rider, p_scope)
$$;
--> statement-breakpoint
-- Writing a rider's data takes a coach or the rider; a guardian reads.
-- The rider must also be in the active workspace, which is what stops a
-- row with this workspace's org_id from naming another workspace's rider.
CREATE OR REPLACE FUNCTION app_can_write_rider(p_rider text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM riders WHERE id = p_rider AND org_id = app_current_org_id())
    AND (app_is_coach() OR app_is_rider_self(p_rider))
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_is_coach(), app_is_rider_self(text), app_is_guardian_of(text, text),
  app_can_read_rider(text, text), app_can_write_rider(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_is_coach(), app_is_rider_self(text), app_is_guardian_of(text, text),
  app_can_read_rider(text, text), app_can_write_rider(text) TO kadence_app;
--> statement-breakpoint

-- The team's own tables: every member reads, coaches write.
CREATE POLICY app_read_team_settings ON "team_settings" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id());
--> statement-breakpoint
CREATE POLICY app_write_team_settings ON "team_settings" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach())
  WITH CHECK (org_id = app_current_org_id() AND app_is_coach());
--> statement-breakpoint
CREATE POLICY app_read_workout_templates ON "workout_templates" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id());
--> statement-breakpoint
CREATE POLICY app_write_workout_templates ON "workout_templates" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach())
  WITH CHECK (org_id = app_current_org_id() AND app_is_coach());
--> statement-breakpoint

-- Riders: the coaches, the rider, and the rider's confirmed guardians see
-- the row; teammates do not. Coaches add and remove riders; a rider may
-- change their own row (their thresholds, what they share) but never
-- make it someone else's.
CREATE POLICY app_read_riders ON "riders" FOR SELECT TO kadence_app
  USING (
    org_id = app_current_org_id()
    AND (app_is_coach() OR user_id = app_current_user_id() OR app_is_guardian_of(id, 'profile'))
  );
--> statement-breakpoint
CREATE POLICY app_insert_riders ON "riders" FOR INSERT TO kadence_app
  WITH CHECK (org_id = app_current_org_id() AND app_is_coach());
--> statement-breakpoint
CREATE POLICY app_update_riders ON "riders" FOR UPDATE TO kadence_app
  USING (org_id = app_current_org_id() AND (app_is_coach() OR user_id = app_current_user_id()))
  WITH CHECK (
    org_id = app_current_org_id() AND (app_is_coach() OR user_id = app_current_user_id())
  );
--> statement-breakpoint
CREATE POLICY app_delete_riders ON "riders" FOR DELETE TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach());
--> statement-breakpoint

-- Guardians: seen by the coaches, the rider and the guardian. A coach or
-- the rider adds one; only the rider can confirm it (the trigger below);
-- coach, rider or the guardian themselves can end it.
CREATE POLICY app_read_guardians ON "guardians" FOR SELECT TO kadence_app
  USING (
    org_id = app_current_org_id()
    AND (app_is_coach() OR app_is_rider_self(rider_id) OR user_id = app_current_user_id())
  );
--> statement-breakpoint
CREATE POLICY app_insert_guardians ON "guardians" FOR INSERT TO kadence_app
  WITH CHECK (org_id = app_current_org_id() AND app_can_write_rider(rider_id));
--> statement-breakpoint
CREATE POLICY app_update_guardians ON "guardians" FOR UPDATE TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_write_rider(rider_id))
  WITH CHECK (org_id = app_current_org_id() AND app_can_write_rider(rider_id));
--> statement-breakpoint
CREATE POLICY app_delete_guardians ON "guardians" FOR DELETE TO kadence_app
  USING (
    org_id = app_current_org_id()
    AND (app_can_write_rider(rider_id) OR user_id = app_current_user_id())
  );
--> statement-breakpoint
-- The confirmation is the rider's alone, and a link cannot be moved to
-- another rider or handed to another person once someone holds it. A
-- policy cannot compare a row before and after; a trigger can. Writes
-- without a context (migrations, the claim function below, tests as the
-- superuser) are not a caller and pass.
CREATE OR REPLACE FUNCTION guardians_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF app_current_user_id() IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF (NEW.confirmed_at IS NOT NULL OR NEW.confirmed_as_adult) AND NOT app_is_rider_self(NEW.rider_id) THEN
      RAISE EXCEPTION 'guardians: only the rider can confirm a guardian' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.rider_id IS DISTINCT FROM OLD.rider_id
    OR (OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION 'guardians: a link cannot change hands' USING ERRCODE = '42501';
  END IF;
  IF (NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at
      OR NEW.confirmed_as_adult IS DISTINCT FROM OLD.confirmed_as_adult)
    AND NOT app_is_rider_self(NEW.rider_id) THEN
    RAISE EXCEPTION 'guardians: only the rider can confirm a guardian' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER guardians_guard
  BEFORE INSERT OR UPDATE ON "guardians"
  FOR EACH ROW EXECUTE FUNCTION guardians_guard();
--> statement-breakpoint

-- A rider's data, by what it is. Training (the plan, what was done, the
-- files, the season, the conversation) is shared with guardians unless the
-- rider says no; wellbeing (check-ins, height, weight) only if the rider
-- says yes. Coaches and the rider write; guardians read.
CREATE POLICY app_read_rider_measurements ON "rider_measurements" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_read_rider(rider_id, 'wellbeing'));
--> statement-breakpoint
CREATE POLICY app_write_rider_measurements ON "rider_measurements" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_write_rider(rider_id))
  WITH CHECK (org_id = app_current_org_id() AND app_can_write_rider(rider_id));
--> statement-breakpoint
CREATE POLICY app_read_checkins ON "checkins" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_read_rider(rider_id, 'wellbeing'));
--> statement-breakpoint
CREATE POLICY app_write_checkins ON "checkins" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_write_rider(rider_id))
  WITH CHECK (org_id = app_current_org_id() AND app_can_write_rider(rider_id));
--> statement-breakpoint
CREATE POLICY app_read_season_plans ON "season_plans" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_read_rider(rider_id, 'training'));
--> statement-breakpoint
CREATE POLICY app_write_season_plans ON "season_plans" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_write_rider(rider_id))
  WITH CHECK (org_id = app_current_org_id() AND app_can_write_rider(rider_id));
--> statement-breakpoint
CREATE POLICY app_read_activities ON "activities" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_read_rider(rider_id, 'training'));
--> statement-breakpoint
CREATE POLICY app_write_activities ON "activities" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_write_rider(rider_id))
  WITH CHECK (org_id = app_current_org_id() AND app_can_write_rider(rider_id));
--> statement-breakpoint
CREATE POLICY app_read_activity_files ON "activity_files" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_read_rider(rider_id, 'training'));
--> statement-breakpoint
CREATE POLICY app_write_activity_files ON "activity_files" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_write_rider(rider_id))
  WITH CHECK (
    org_id = app_current_org_id()
    AND app_can_write_rider(rider_id)
    AND EXISTS (SELECT 1 FROM "activities" a WHERE a.id = activity_files.activity_id AND a.rider_id = activity_files.rider_id)
  );
--> statement-breakpoint
CREATE POLICY app_read_planned_sessions ON "planned_sessions" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_read_rider(rider_id, 'training'));
--> statement-breakpoint
CREATE POLICY app_write_planned_sessions ON "planned_sessions" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_write_rider(rider_id))
  WITH CHECK (
    org_id = app_current_org_id()
    AND app_can_write_rider(rider_id)
    AND (template_id IS NULL OR EXISTS (SELECT 1 FROM "workout_templates" w WHERE w.id = planned_sessions.template_id))
    AND (activity_id IS NULL OR EXISTS (
      SELECT 1 FROM "activities" a
      WHERE a.id = planned_sessions.activity_id AND a.rider_id = planned_sessions.rider_id
    ))
  );
--> statement-breakpoint

-- The calendar: a team event (no rider) is every member's to read and the
-- coaches' to write; a rider's own (an exam, a day ill) follows the rider.
CREATE POLICY app_read_calendar_events ON "calendar_events" FOR SELECT TO kadence_app
  USING (
    org_id = app_current_org_id()
    AND (rider_id IS NULL OR app_can_read_rider(rider_id, 'training'))
  );
--> statement-breakpoint
CREATE POLICY app_write_calendar_events ON "calendar_events" FOR ALL TO kadence_app
  USING (
    org_id = app_current_org_id()
    AND (CASE WHEN rider_id IS NULL THEN app_is_coach() ELSE app_can_write_rider(rider_id) END)
  )
  WITH CHECK (
    org_id = app_current_org_id()
    AND (CASE WHEN rider_id IS NULL THEN app_is_coach() ELSE app_can_write_rider(rider_id) END)
  );
--> statement-breakpoint

-- The conversation: everyone who may read the rider's training reads it;
-- coaches and the rider write, each under their own name; an author edits
-- their own words, and a coach may take a comment down.
CREATE POLICY app_read_comments ON "comments" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_read_rider(rider_id, 'training'));
--> statement-breakpoint
CREATE POLICY app_insert_comments ON "comments" FOR INSERT TO kadence_app
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
CREATE POLICY app_update_comments ON "comments" FOR UPDATE TO kadence_app
  USING (org_id = app_current_org_id() AND author_id = app_current_user_id())
  WITH CHECK (
    org_id = app_current_org_id()
    AND author_id = app_current_user_id()
    AND app_can_write_rider(rider_id)
  );
--> statement-breakpoint
CREATE POLICY app_delete_comments ON "comments" FOR DELETE TO kadence_app
  USING (
    org_id = app_current_org_id()
    AND (author_id = app_current_user_id() OR app_is_coach())
  );
--> statement-breakpoint

-- Device links hold sealed tokens: the rider manages their own, a coach
-- can see that a link exists and how it is doing, and nobody else.
CREATE POLICY app_read_device_links ON "device_links" FOR SELECT TO kadence_app
  USING (
    org_id = app_current_org_id() AND (app_is_coach() OR app_is_rider_self(rider_id))
  );
--> statement-breakpoint
CREATE POLICY app_write_device_links ON "device_links" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_rider_self(rider_id))
  WITH CHECK (org_id = app_current_org_id() AND app_is_rider_self(rider_id));
--> statement-breakpoint
CREATE POLICY app_delete_device_links_coach ON "device_links" FOR DELETE TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach());
--> statement-breakpoint

-- The audit trail carries every row before and after it changed, which in
-- Kadence means riders' check-ins and training. The foundation lets every
-- member read the workspace's trail; here only the coaches do.
DROP POLICY IF EXISTS app_select_audit ON "audit_log";
--> statement-breakpoint
CREATE POLICY app_select_audit ON "audit_log" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach());
--> statement-breakpoint

-- The trail keeps who changed what, not the raw files, the thinned samples
-- or sealed device tokens: they are large, or secret, and say nothing a
-- person reads in a trail.
CREATE OR REPLACE FUNCTION audit_redact(data jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN data IS NULL THEN NULL
    ELSE data - ARRAY[
      'password', 'token', 'secret', 'backup_codes',
      'access_token', 'refresh_token', 'id_token', 'value',
      'key_hash', 'token_hash', 'api_key_cipher',
      'bytes', 'streams', 'access_token_sealed', 'refresh_token_sealed'
    ]
  END
$$;
--> statement-breakpoint

CREATE TRIGGER audit_team_settings
  AFTER INSERT OR UPDATE OR DELETE ON "team_settings"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_riders
  AFTER INSERT OR UPDATE OR DELETE ON "riders"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_guardians
  AFTER INSERT OR UPDATE OR DELETE ON "guardians"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_rider_measurements
  AFTER INSERT OR UPDATE OR DELETE ON "rider_measurements"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_season_plans
  AFTER INSERT OR UPDATE OR DELETE ON "season_plans"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_workout_templates
  AFTER INSERT OR UPDATE OR DELETE ON "workout_templates"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_planned_sessions
  AFTER INSERT OR UPDATE OR DELETE ON "planned_sessions"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_activities
  AFTER INSERT OR UPDATE OR DELETE ON "activities"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_activity_files
  AFTER INSERT OR UPDATE OR DELETE ON "activity_files"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_checkins
  AFTER INSERT OR UPDATE OR DELETE ON "checkins"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_calendar_events
  AFTER INSERT OR UPDATE OR DELETE ON "calendar_events"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_comments
  AFTER INSERT OR UPDATE OR DELETE ON "comments"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_device_links
  AFTER INSERT OR UPDATE OR DELETE ON "device_links"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint

-- Joining by invitation links the new member to the rider or guardian row
-- a coach prepared for them. The application role cannot see those rows
-- yet (they are not the caller's until linked), so the link is made here,
-- and only for an invitation this caller accepted, to this workspace, sent
-- to the caller's own address.
CREATE OR REPLACE FUNCTION claim_invitation_links(p_invitation text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user text := app_current_user_id();
  v_org text := app_current_org_id();
  v_count integer := 0;
  v_n integer;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RETURN 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM invitations i JOIN users u ON lower(u.email) = lower(i.email)
    WHERE i.id = p_invitation AND i.organization_id = v_org
      AND i.status = 'accepted' AND u.id = v_user
  ) OR NOT EXISTS (
    SELECT 1 FROM memberships WHERE organization_id = v_org AND user_id = v_user
  ) THEN
    RETURN 0;
  END IF;
  UPDATE riders SET user_id = v_user
    WHERE invitation_id = p_invitation AND org_id = v_org AND user_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM riders r2 WHERE r2.org_id = v_org AND r2.user_id = v_user);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_count := v_count + v_n;
  UPDATE guardians SET user_id = v_user
    WHERE invitation_id = p_invitation AND org_id = v_org AND user_id IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_count + v_n;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION claim_invitation_links(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION claim_invitation_links(text) TO kadence_app;
--> statement-breakpoint

-- Deleting a workspace: the one thing the application role may do that RLS
-- and grants would otherwise forbid, wrapped in a function that checks the
-- caller itself. Dogma 3 says everything a workspace owns can be deleted
-- again completely, and that includes the audit rows about it: they carry
-- every rider's training and check-ins before and after each change, and a
-- team that leaves must not leave a shadow. The append-only guard is
-- stepped around for exactly this transaction, and one context-free row
-- records that the deletion happened.
--
-- The owner check raises with ERRCODE 42501 (insufficient_privilege), which
-- is what src/modules/export/workspace.ts matches; the wording is free to
-- change. The active-workspace check keeps plpgsql's default P0001 on
-- purpose: it is a backstop against a call the application cannot make.
CREATE OR REPLACE FUNCTION delete_workspace(p_org_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user text := nullif(current_setting('app.user_id', true), '');
  v_role text;
BEGIN
  IF p_org_id IS NULL OR p_org_id <> nullif(current_setting('app.org_id', true), '') THEN
    RAISE EXCEPTION 'delete_workspace: not the active workspace';
  END IF;
  SELECT role INTO v_role FROM memberships WHERE organization_id = p_org_id AND user_id = v_user;
  IF v_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'delete_workspace: only the workspace owner may delete it'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM organizations WHERE id = p_org_id;

  PERFORM set_config('session_replication_role', 'replica', true);
  DELETE FROM audit_log WHERE org_id = p_org_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO audit_log (org_id, actor_user_id, actor_type, action, entity_type, entity_id)
  VALUES (NULL, v_user, 'user', 'workspace.deleted', 'organizations', p_org_id);
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION delete_workspace(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION delete_workspace(text) TO kadence_app;
