-- Stored rides read again with the corrected moving time (docs/adr/0096).
--
-- A device on smart recording writes a record every one to nine seconds,
-- and until the fix in src/modules/fit/timeline.ts every silence over five
-- seconds was read as a pause: a 31-minute run came out as 20 minutes
-- moving, and its load, averages and zones with it. New imports are right;
-- the rides already stored are corrected once, by the job
-- `activities.retime` (src/modules/devices/retime-job.ts), which this
-- migration puts in the queue so nobody has to run a script. The worker
-- container runs it, or the app's own worker where there is none.
--
-- Which workspaces have stored files, and one coach of each to read them
-- as, for that job with nobody signed in: the workspace's id and the
-- coach's user id, the owner before an admin and the earliest first, and
-- nothing else — no rider, no file, no name. Everything after it runs as
-- that coach, under the ordinary policies, as dcu_teams_due() does
-- (drizzle/0047). Refused from inside a workspace, so no request reaches it.
CREATE OR REPLACE FUNCTION workspaces_with_files()
RETURNS TABLE (org_id text, user_id text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF app_current_org_id() IS NOT NULL THEN
    RAISE EXCEPTION 'workspaces_with_files: not from a workspace' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT DISTINCT ON (m.organization_id) m.organization_id, m.user_id
    FROM memberships m
    WHERE m.role IN ('owner', 'admin')
      AND EXISTS (SELECT 1 FROM activity_files f WHERE f.org_id = m.organization_id)
    ORDER BY m.organization_id, (m.role = 'owner') DESC, m.created_at, m.user_id;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION workspaces_with_files() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION workspaces_with_files() TO kadence_app;
--> statement-breakpoint
-- The correction, queued once. The key `once` puts it under the queue's
-- dedupe index (drizzle/0047), and the NOT EXISTS keeps a second run of
-- this file from queueing it again while an earlier one is waiting, done
-- or given up. Three tries, as the kind says.
INSERT INTO jobs (kind, payload, run_at, max_attempts)
SELECT 'activities.retime', '{"key": "once"}'::jsonb, now(), 3
WHERE NOT EXISTS (SELECT 1 FROM jobs WHERE kind = 'activities.retime')
ON CONFLICT (kind, (coalesce(org_id, '')), ((payload ->> 'key')))
  WHERE done_at IS NULL AND attempts < max_attempts
  DO NOTHING;
