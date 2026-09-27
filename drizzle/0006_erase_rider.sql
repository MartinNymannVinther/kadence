-- A rider's right to erasure (GDPR art. 17; TECH-DEBT "A rider cannot yet
-- have their own trail erased"). Deleting the rider row removes their
-- training, check-ins, files, comments, guardians and device links by
-- cascade; the audit trail keeps the before-images of all of it, and it
-- is append-only for every role. So, as delete_workspace does for a whole
-- team, this function checks the caller itself — a coach of the active
-- team — steps around the append-only guard for exactly this
-- transaction, purges the rows about this rider, and records one
-- context-free row that an erasure happened, naming no one.
CREATE OR REPLACE FUNCTION erase_rider(p_rider text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org text := nullif(current_setting('app.org_id', true), '');
  v_user text := nullif(current_setting('app.user_id', true), '');
BEGIN
  IF v_org IS NULL OR NOT EXISTS (
    SELECT 1 FROM riders WHERE id = p_rider AND org_id = v_org
  ) THEN
    RAISE EXCEPTION 'erase_rider: not a rider of the active team';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE organization_id = v_org AND user_id = v_user AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'erase_rider: only a coach may erase a rider' USING ERRCODE = '42501';
  END IF;

  DELETE FROM riders WHERE id = p_rider AND org_id = v_org;

  PERFORM set_config('session_replication_role', 'replica', true);
  DELETE FROM audit_log
  WHERE org_id = v_org
    AND (
      (entity_type = 'riders' AND entity_id = p_rider)
      OR before_data ->> 'rider_id' = p_rider
      OR after_data ->> 'rider_id' = p_rider
    );
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO audit_log (org_id, actor_user_id, actor_type, action, entity_type, entity_id)
  VALUES (v_org, v_user, 'user', 'rider.erased', 'riders', NULL);
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION erase_rider(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION erase_rider(text) TO kadence_app;
