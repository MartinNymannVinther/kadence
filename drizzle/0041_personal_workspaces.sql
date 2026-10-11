-- A person alone (docs/adr/0080, backlog S-01): a workspace is a club or
-- one person's own training. organizations.kind says which; only our
-- server code sets it (src/core/auth/register-personal.ts), right after
-- Better Auth has created the row, and a before-hook on
-- /organization/create and /organization/update refuses a body that
-- carries it. An application and the invitation its approval mints carry
-- what a personal workspace needs: the rider's birth year, whether it is
-- for the applicant or their child, and the child's name (ADR 0004: the
-- tables stay without org_id, on the auth role only).
ALTER TABLE "access_invitations" ADD COLUMN "kind" text DEFAULT 'club' NOT NULL;--> statement-breakpoint
ALTER TABLE "access_invitations" ADD COLUMN "birth_year" integer;--> statement-breakpoint
ALTER TABLE "access_invitations" ADD COLUMN "for_whom" text;--> statement-breakpoint
ALTER TABLE "access_invitations" ADD COLUMN "child_name" text;--> statement-breakpoint
ALTER TABLE "access_invitations" ADD COLUMN "child_email" text;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "kind" text DEFAULT 'club' NOT NULL;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "birth_year" integer;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "for_whom" text;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "child_name" text;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "child_email" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "kind" text DEFAULT 'club' NOT NULL;--> statement-breakpoint
CREATE INDEX "organizations_kind_idx" ON "organizations" USING btree ("kind");--> statement-breakpoint
ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitations_kind" CHECK ("access_invitations"."kind" in ('club', 'personal'));--> statement-breakpoint
ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitations_for_whom" CHECK ("access_invitations"."for_whom" is null or "access_invitations"."for_whom" in ('me', 'child'));--> statement-breakpoint
ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitations_birth_year" CHECK ("access_invitations"."birth_year" is null or "access_invitations"."birth_year" between 1900 and 2200);--> statement-breakpoint
ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitations_personal" CHECK ("access_invitations"."kind" = 'club' or ("access_invitations"."birth_year" is not null and "access_invitations"."for_whom" is not null));--> statement-breakpoint
ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitations_child" CHECK ("access_invitations"."for_whom" is distinct from 'child' or "access_invitations"."child_name" is not null);--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_kind" CHECK ("access_requests"."kind" in ('club', 'personal'));--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_for_whom" CHECK ("access_requests"."for_whom" is null or "access_requests"."for_whom" in ('me', 'child'));--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_birth_year" CHECK ("access_requests"."birth_year" is null or "access_requests"."birth_year" between 1900 and 2200);--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_personal" CHECK ("access_requests"."kind" = 'club' or ("access_requests"."birth_year" is not null and "access_requests"."for_whom" is not null));--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_child" CHECK ("access_requests"."for_whom" is distinct from 'child' or "access_requests"."child_name" is not null);--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_kind" CHECK ("organizations"."kind" in ('club', 'personal'));--> statement-breakpoint
-- The owner's overview (drizzle/0019, 0031; docs/adr/0048, 0066) gains the
-- workspace's kind, so Installation can show clubs one by one and persons
-- as one line of counts. A personal workspace's name is a person's first
-- name, so it never leaves the database: the row carries no name. The
-- guard, the search_path and the grants are as before. A function's result
-- columns cannot change in place, so it is dropped and created again.
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
  pilot_minutes bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Copenhagen')::date;
  v_monday date := v_today - (extract(isodow FROM v_today)::int - 1) - 7;
  v_sunday date := v_monday + 6;
  v_from timestamptz := v_monday::timestamp AT TIME ZONE 'Europe/Copenhagen';
  v_to timestamptz := (v_sunday + 1)::timestamp AT TIME ZONE 'Europe/Copenhagen';
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
    (SELECT coalesce(sum(octet_length(f.bytes)), 0)::bigint FROM activity_files f WHERE f.org_id = o.id),
    (SELECT count(*) FROM ai_calls a WHERE a.org_id = o.id AND a.created_at > now() - interval '1 day'),
    v_monday,
    pr.riders_n,
    pr.checked_in_n,
    ps.sessions_n,
    ps.receipts_n,
    pm.minutes_n
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
  WHERE NOT EXISTS (SELECT 1 FROM demo_workspaces d WHERE d.organization_id = o.id)
  ORDER BY o.created_at;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION platform_overview() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION platform_overview() TO kadence_app;
