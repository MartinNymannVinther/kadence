-- The history follows the rider (docs/adr/0081, backlog S-02). A rider who
-- joins a team from a personal workspace, or leaves a team for one, takes
-- their training with them: every row carrying their rider_id moves from
-- one workspace's rider row to the other's. This is the first function
-- that writes across two organizations, so it is one function, it moves
-- only what the caller owns on both sides, and it is all or nothing.
--
-- What moves and what stays is one list, read by the function itself and
-- by the meta-test in tests/rls/history-move.test.ts, which fails the
-- moment a table with rider_id is in neither column. A table stays when
-- its rows are the team's rather than the rider's: a parent's link is to
-- the team's rider row and is confirmed again on the new team (ADR 0011);
-- a session a coach deleted, a coach's draft of a week and the club
-- championship mean nothing in another workspace.
CREATE OR REPLACE FUNCTION move_rider_history_tables()
RETURNS TABLE (table_name text, action text)
LANGUAGE sql IMMUTABLE AS $$
  VALUES
    -- Moved, in this order. Rows reference each other only within the set
    -- (a file its activity, a comment its session), and org_id and
    -- rider_id are the only columns that change.
    ('workout_templates', 'move'),
    ('planned_sessions', 'move'),
    ('activities', 'move'),
    ('upload_keys', 'move'),
    ('activity_files', 'move'),
    ('comments', 'move'),
    ('checkins', 'move'),
    ('rider_measurements', 'move'),
    ('rider_goals', 'move'),
    ('flag_resolutions', 'move'),
    ('season_plans', 'move'),
    -- A result before its race, so the race is still the rider's when the
    -- result asks whether it moves along.
    ('race_results', 'move'),
    ('calendar_events', 'move'),
    ('device_links', 'move'),
    -- Stays with the team.
    ('guardians', 'stay'),
    ('planned_session_deletions', 'stay'),
    ('week_plan_drafts', 'stay'),
    ('club_championship_entries', 'stay'),
    ('club_champions', 'stay')
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION move_rider_history_tables() FROM PUBLIC;
--> statement-breakpoint

-- Moves one rider's history from one rider row to another, in a different
-- workspace. Refuses, with ERRCODE 42501 and a plain word in DETAIL that
-- the service turns into a sentence, unless:
--   not_own_rider      the caller's app.user_id is riders.user_id on both
--                      rows (a missing row gets the same answer, so the
--                      function cannot be used to find out whether an id
--                      exists);
--   same_workspace     the two rows are in different workspaces;
--   not_member         the caller is a member of both;
--   target_has_history the target has no planned session, activity or
--                      check-in yet;
--   would_collide      no unique key would collide (HINT names the table).
-- Coaches cannot pull a history to their team and nobody moves another's.
--
-- The rows move under session_replication_role = replica, as delete_workspace
-- and erase_rider step around a trigger for one transaction: the row
-- trigger would copy every moved row — check-ins included — into the
-- target workspace's trail as before and after images. Instead one counted
-- line per table is written on both sides, rider.history_moved_out on the
-- source and rider.history_moved_in on the target, {table, rows} and never
-- a row. Foreign keys on org_id and rider_id hold because both targets are
-- checked to exist first and nothing else changes; unique indexes are not
-- triggers and still apply. The target rider row takes the source's
-- thresholds and UCI ID where it has none of its own, and the rider's
-- sharing choices as they are; sex and the class override are a coach's
-- fields (drizzle/0018) and follow only into a workspace the rider coaches
-- themselves — their own. That update runs before the switch, so the
-- ordinary trigger and the riders guard apply to it as to any change.
--
-- Three references are cut rather than carried across: a session's
-- template_id and a template's copied_from when the template is the
-- library's (the session keeps its own structure and title); and a race
-- result whose race is a team event stays, since the event does.
CREATE OR REPLACE FUNCTION move_rider_history(p_from_rider text, p_to_rider text)
RETURNS TABLE (table_name text, rows_moved integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_user text := app_current_user_id();
  v_from riders%ROWTYPE;
  v_to riders%ROWTYPE;
  v_table text;
  v_n integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'move_rider_history: no caller' USING ERRCODE = '42501', DETAIL = 'not_own_rider';
  END IF;
  SELECT * INTO v_from FROM riders WHERE id = p_from_rider;
  SELECT * INTO v_to FROM riders WHERE id = p_to_rider;
  IF v_from.id IS NULL OR v_to.id IS NULL
     OR v_from.user_id IS DISTINCT FROM v_user OR v_to.user_id IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'move_rider_history: the rider moves only their own history'
      USING ERRCODE = '42501', DETAIL = 'not_own_rider';
  END IF;
  IF v_from.org_id = v_to.org_id THEN
    RAISE EXCEPTION 'move_rider_history: the two rows are in the same workspace'
      USING ERRCODE = '42501', DETAIL = 'same_workspace';
  END IF;
  IF (SELECT count(DISTINCT organization_id) FROM memberships
      WHERE user_id = v_user AND organization_id IN (v_from.org_id, v_to.org_id)) <> 2 THEN
    RAISE EXCEPTION 'move_rider_history: the caller must be a member of both workspaces'
      USING ERRCODE = '42501', DETAIL = 'not_member';
  END IF;
  IF EXISTS (SELECT 1 FROM planned_sessions WHERE rider_id = v_to.id)
     OR EXISTS (SELECT 1 FROM activities WHERE rider_id = v_to.id)
     OR EXISTS (SELECT 1 FROM checkins WHERE rider_id = v_to.id) THEN
    RAISE EXCEPTION 'move_rider_history: the target rider already has history'
      USING ERRCODE = '42501', DETAIL = 'target_has_history';
  END IF;

  -- Unique keys that would collide on the target. Checked here so the
  -- answer is a plain word; a key missed here still fails the whole
  -- transaction as a unique violation, and nothing moves.
  IF EXISTS (SELECT 1 FROM season_plans s JOIN season_plans t
             ON t.rider_id = v_to.id AND t.season_start_year = s.season_start_year
             WHERE s.rider_id = v_from.id) THEN
    RAISE EXCEPTION 'move_rider_history: a season plan for the same season exists on the target'
      USING ERRCODE = '42501', DETAIL = 'would_collide', HINT = 'season_plans';
  END IF;
  IF EXISTS (SELECT 1 FROM flag_resolutions s JOIN flag_resolutions t
             ON t.rider_id = v_to.id AND t.kind = s.kind AND t.week_monday = s.week_monday
             WHERE s.rider_id = v_from.id) THEN
    RAISE EXCEPTION 'move_rider_history: a flag resolution for the same week exists on the target'
      USING ERRCODE = '42501', DETAIL = 'would_collide', HINT = 'flag_resolutions';
  END IF;
  IF EXISTS (SELECT 1 FROM device_links s JOIN device_links t
             ON t.rider_id = v_to.id AND t.provider = s.provider
             WHERE s.rider_id = v_from.id) THEN
    RAISE EXCEPTION 'move_rider_history: a device link for the same provider exists on the target'
      USING ERRCODE = '42501', DETAIL = 'would_collide', HINT = 'device_links';
  END IF;
  IF EXISTS (SELECT 1 FROM race_results s JOIN race_results t
             ON t.rider_id = v_to.id AND t.source = s.source AND t.source_ref = s.source_ref
             WHERE s.rider_id = v_from.id) THEN
    RAISE EXCEPTION 'move_rider_history: a race result with the same reference exists on the target'
      USING ERRCODE = '42501', DETAIL = 'would_collide', HINT = 'race_results';
  END IF;

  -- The rider row: what the rider carries about themselves. Audited by the
  -- row trigger, as any change to a rider row is.
  UPDATE riders t SET
    ftp_watts = coalesce(t.ftp_watts, v_from.ftp_watts),
    threshold_hr = coalesce(t.threshold_hr, v_from.threshold_hr),
    max_hr = coalesce(t.max_hr, v_from.max_hr),
    resting_hr = coalesce(t.resting_hr, v_from.resting_hr),
    thresholds_on = coalesce(t.thresholds_on, v_from.thresholds_on),
    sex = CASE WHEN app_is_coach() THEN coalesce(t.sex, v_from.sex) ELSE t.sex END,
    category_override = CASE WHEN app_is_coach() THEN coalesce(t.category_override, v_from.category_override)
                             ELSE t.category_override END,
    uci_id = CASE
      WHEN t.uci_id IS NOT NULL THEN t.uci_id
      WHEN v_from.uci_id IS NULL THEN NULL
      WHEN EXISTS (SELECT 1 FROM riders o WHERE o.org_id = t.org_id AND o.uci_id = v_from.uci_id) THEN NULL
      ELSE v_from.uci_id
    END,
    share_training = v_from.share_training,
    share_wellbeing = v_from.share_wellbeing,
    updated_at = now()
  WHERE t.id = v_to.id;

  PERFORM set_config('session_replication_role', 'replica', true);

  -- References that would otherwise point back into the workspace left;
  -- part of the move, so under the same switch.
  UPDATE planned_sessions p SET template_id = NULL
  WHERE p.rider_id = v_from.id AND p.template_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM workout_templates w WHERE w.id = p.template_id AND w.rider_id = v_from.id);
  UPDATE workout_templates w SET copied_from = NULL
  WHERE w.rider_id = v_from.id AND w.copied_from IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM workout_templates o WHERE o.id = w.copied_from AND o.rider_id = v_from.id);

  FOR v_table IN SELECT m.table_name FROM move_rider_history_tables() m WHERE m.action = 'move' LOOP
    IF v_table = 'race_results' THEN
      EXECUTE format(
        'UPDATE %I SET org_id = $1, rider_id = $2 WHERE rider_id = $3
           AND EXISTS (SELECT 1 FROM calendar_events e WHERE e.id = event_id AND e.rider_id = $3)',
        v_table) USING v_to.org_id, v_to.id, v_from.id;
    ELSE
      EXECUTE format('UPDATE %I SET org_id = $1, rider_id = $2 WHERE rider_id = $3', v_table)
        USING v_to.org_id, v_to.id, v_from.id;
    END IF;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN
      INSERT INTO audit_log (org_id, actor_user_id, actor_type, action, entity_type, entity_id, after_data)
      VALUES
        (v_from.org_id, v_user, 'user', 'rider.history_moved_out', v_table, v_from.id,
         jsonb_build_object('table', v_table, 'rows', v_n)),
        (v_to.org_id, v_user, 'user', 'rider.history_moved_in', v_table, v_to.id,
         jsonb_build_object('table', v_table, 'rows', v_n));
    END IF;
    table_name := v_table;
    rows_moved := v_n;
    RETURN NEXT;
  END LOOP;
  PERFORM set_config('session_replication_role', 'origin', true);
  RETURN;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION move_rider_history(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION move_rider_history(text, text) TO kadence_app;
