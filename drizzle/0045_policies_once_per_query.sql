-- The policies ask who the caller is once per query, not once per row
-- (docs/adr/0083, backlog S-03, plan §5.0).
--
-- A policy that says `app_is_coach()` makes Postgres call the function for
-- every row it looks at: a coach's calendar of a few thousand sessions
-- asked the memberships table a few thousand times whether they were a
-- coach. Written `(SELECT app_is_coach())`, the call has nothing in it
-- that changes from row to row, so the planner makes it an InitPlan and
-- runs it once for the whole statement. The answer is the same: the
-- function is STABLE, and inside one statement it could never have
-- answered differently.
--
-- What is wrapped is the six helpers that take no argument: the context
-- (app_current_org_id, app_current_user_id), the roles (app_is_coach,
-- app_is_coach_somewhere, app_is_platform_owner) and the demo's room
-- (app_demo_room). The helpers that take a row's rider_id
-- (app_can_read_rider, app_can_write_rider, app_is_rider_self,
-- app_is_guardian_of, app_in_room) are left as they are: their argument
-- is the row, so a sub-select around them would still run per row, and
-- would only add a sub-plan to every call.
--
-- Done in place rather than written out policy by policy: every policy in
-- the public schema is read back as Postgres stored it and altered with
-- the same expression, the zero-argument calls wrapped and nothing else
-- touched. That keeps this migration right whatever the migrations before
-- it said, including ones landed beside it on another branch, and it is
-- safe to run twice: a call already inside a sub-select is left alone.
-- tests/rls/policies-once-per-query.test.ts fails a policy written later
-- with a bare call, and the whole RLS suite proves the answers did not
-- change.
DO $$
DECLARE
  p record;
  helpers text := 'app_current_org_id|app_current_user_id|app_is_coach|app_is_coach_somewhere|app_is_platform_owner|app_demo_room';
  -- A bare call: the helper's name, not preceded by a letter, digit,
  -- underscore or "SELECT ", followed by "()".
  bare text;
  qual text;
  checked text;
  statement text;
BEGIN
  bare := '(?<![[:alnum:]_])(?<!SELECT )(' || helpers || ')\(\)';
  FOR p IN
    SELECT pol.polname, cls.relname,
      pg_get_expr(pol.polqual, pol.polrelid) AS qual,
      pg_get_expr(pol.polwithcheck, pol.polrelid) AS checked
    FROM pg_policy pol
    JOIN pg_class cls ON cls.oid = pol.polrelid
    WHERE cls.relnamespace = 'public'::regnamespace
    ORDER BY cls.relname, pol.polname
  LOOP
    qual := regexp_replace(p.qual, bare, '(SELECT \1())', 'g');
    checked := regexp_replace(p.checked, bare, '(SELECT \1())', 'g');
    IF qual IS DISTINCT FROM p.qual OR checked IS DISTINCT FROM p.checked THEN
      statement := format('ALTER POLICY %I ON %I', p.polname, p.relname);
      IF qual IS NOT NULL THEN
        statement := statement || format(' USING (%s)', qual);
      END IF;
      IF checked IS NOT NULL THEN
        statement := statement || format(' WITH CHECK (%s)', checked);
      END IF;
      EXECUTE statement;
    END IF;
  END LOOP;
END
$$;
