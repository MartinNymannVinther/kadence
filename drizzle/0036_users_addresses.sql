-- Members read each other's names, not their addresses (docs/adr/0070).
--
-- The foundation's users policy (drizzle/0001, app_select_org_members)
-- lets any member of the active team read the whole row of everyone on
-- it: the name, which comments and cards need, and the address, which no
-- page shows a rider or a parent (docs/adr/0019). The address now leaves
-- the application role's reach at the column rather than at the row: the
-- role keeps SELECT on id and name and loses every other column, so a
-- query that bypasses the services — `select email from users`, a where
-- clause on it, `select *` — is refused by Postgres itself, whatever
-- the row policy would have said. The policies are unchanged.
REVOKE SELECT ON "users" FROM kadence_app;
--> statement-breakpoint
GRANT SELECT (id, name) ON "users" TO kadence_app;
--> statement-breakpoint

-- The addresses the caller may read, handed back by one SECURITY DEFINER
-- function (owned by the migration role, so it reads the column the
-- application role no longer can). It takes no arguments, so there is
-- nothing to aim it with, and answers from the transaction-local context
-- alone:
--
--   - the caller's own address, always;
--   - every member of the active team, when the caller coaches it — the
--     members page, the export and the list "Inviter hele holdet";
--   - for a rider, the people who hold a guardian link to the rider's own
--     row, because the rider confirms a person, not a name a coach typed,
--     and sees that account's name and address first (docs/adr/0019).
--
-- A parent gets their own address and nothing else: not the rider's, not
-- the coach's. No context, no rows. STABLE, not IMMUTABLE: it reads
-- tables. A SQL-language body would be inlined by the planner if it were
-- not SECURITY DEFINER, which would run it as the caller and fail on the
-- column; prosecdef blocks inlining. pg_temp last, as drizzle/0007.
CREATE OR REPLACE FUNCTION team_member_addresses() RETURNS TABLE (user_id text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT u.id, u.email
  FROM users u
  WHERE app_current_user_id() IS NOT NULL
    AND (
      u.id = app_current_user_id()
      OR (
        app_is_coach()
        AND u.id IN (
          SELECT m.user_id FROM memberships m WHERE m.organization_id = app_current_org_id()
        )
      )
      OR u.id IN (
        SELECT g.user_id
        FROM guardians g
        JOIN riders r ON r.id = g.rider_id
        WHERE r.org_id = app_current_org_id()
          AND g.org_id = r.org_id
          AND r.user_id = app_current_user_id()
          AND g.user_id IS NOT NULL
      )
    )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION team_member_addresses() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION team_member_addresses() TO kadence_app;
