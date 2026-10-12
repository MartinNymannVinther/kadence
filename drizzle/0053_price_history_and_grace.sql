-- A price list with a history, the plans' budgets for the workspaces on
-- them, and a week before door 2 locks (docs/adr/0090 and 0088, both
-- amended 12 October 2026; backlog S-12b, docs/plan-konto-og-priser.md
-- §2.2 and §2.4 with Martin's answers in §9).
--
-- 1. A price is a row from the day it takes effect. price_plans was keyed
-- by its plan alone, so a new price overwrote the old one; now the key is
-- the plan and its valid_from, the latest row that has come is today's,
-- and the older rows stay as the price an invoice was written from. A
-- row for a later day waits until that day.
ALTER TABLE "price_plans" DROP CONSTRAINT "price_plans_pkey";
--> statement-breakpoint
ALTER TABLE "price_plans" ADD CONSTRAINT "price_plans_key_valid_from_pk" PRIMARY KEY("key","valid_from");
--> statement-breakpoint
-- Today's row of a plan, and today's row of every plan: the one place that
-- says which row is today's, a Copenhagen day. With the caller's rights;
-- every runtime context may read price_plans.
CREATE OR REPLACE FUNCTION price_plan_now(p_key text) RETURNS SETOF price_plans
LANGUAGE sql STABLE SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT * FROM price_plans pp
  WHERE pp.key = p_key AND pp.valid_from <= (now() AT TIME ZONE 'Europe/Copenhagen')::date
  ORDER BY pp.valid_from DESC
  LIMIT 1
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION price_plans_now() RETURNS SETOF price_plans
LANGUAGE sql STABLE SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT DISTINCT ON (pp.key) * FROM price_plans pp
  WHERE pp.valid_from <= (now() AT TIME ZONE 'Europe/Copenhagen')::date
  ORDER BY pp.key, pp.valid_from DESC
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION price_plan_now(text), price_plans_now() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION price_plan_now(text), price_plans_now() TO kadence_app;
--> statement-breakpoint
-- The one sum (drizzle/0052), from today's row.
CREATE OR REPLACE FUNCTION plan_yearly_dkk(p_key text, p_riders integer) RETURNS integer
LANGUAGE sql STABLE SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT pp.price_year_dkk + CASE
    WHEN pp.per_rider_dkk IS NULL THEN 0
    ELSE greatest(coalesce(p_riders, 0) - coalesce(pp.included_riders, 0), 0) * pp.per_rider_dkk
  END
  FROM price_plan_now(p_key) pp
$$;
--> statement-breakpoint
-- What a workspace costs, and the owner's list, as in drizzle/0052 but
-- from today's row of the plan.
CREATE OR REPLACE FUNCTION workspace_price(p_org text)
RETURNS TABLE (
  plan_key text,
  price_year_dkk integer,
  riders integer,
  included_riders integer,
  per_rider_dkk integer,
  vat_included boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_org text := app_current_org_id();
  v_user text := app_current_user_id();
BEGIN
  IF NOT (
    (v_org IS NULL AND v_user IS NULL)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = v_user AND u.platform_role = 'owner')
    OR (v_org = p_org AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = p_org AND m.user_id = v_user AND m.role IN ('owner', 'admin')
    ))
  ) THEN
    RAISE EXCEPTION 'workspace_price: not a coach of the workspace' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT k.key, plan_yearly_dkk(k.key, n.riders), n.riders, pp.included_riders, pp.per_rider_dkk,
           coalesce(pp.vat_included, true)
    FROM organizations o
    CROSS JOIN LATERAL (SELECT workspace_price_key(o.kind, o.price_plan) AS key) k
    CROSS JOIN LATERAL (
      SELECT count(*)::integer AS riders FROM riders r WHERE r.org_id = o.id AND NOT r.archived
    ) n
    LEFT JOIN LATERAL price_plan_now(k.key) pp ON true
    WHERE o.id = p_org;
END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION billing_overview()
RETURNS TABLE (
  org_id text,
  name text,
  kind text,
  created_at timestamptz,
  plan text,
  plan_key text,
  trial_ends_at timestamptz,
  paid_until timestamptz,
  free_reason text,
  free_until timestamptz,
  riders integer,
  price_year_dkk integer,
  vat_included boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = app_current_user_id() AND u.platform_role = 'owner'
  ) THEN
    RAISE EXCEPTION 'only the installation owner sees what workspaces pay' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT o.id, CASE WHEN o.kind = 'personal' THEN NULL ELSE o.name END, o.kind, o.created_at,
           o.plan, k.key, o.trial_ends_at, o.paid_until, o.free_reason, o.free_until,
           n.riders, plan_yearly_dkk(k.key, n.riders), coalesce(pp.vat_included, true)
    FROM organizations o
    CROSS JOIN LATERAL (SELECT workspace_price_key(o.kind, o.price_plan) AS key) k
    CROSS JOIN LATERAL (
      SELECT count(*)::integer AS riders FROM riders r WHERE r.org_id = o.id AND NOT r.archived
    ) n
    LEFT JOIN LATERAL price_plan_now(k.key) pp ON true
    WHERE NOT EXISTS (SELECT 1 FROM demo_workspaces d WHERE d.organization_id = o.id)
    ORDER BY o.kind, o.created_at;
END
$$;
--> statement-breakpoint
-- 2. The owner sets a price from a day: today when none is given, never a
-- day that has passed. A second change on the same day replaces that
-- day's row; every earlier row stays. Owner-checked as in drizzle/0052,
-- and audited by the trigger on price_plans.
DROP FUNCTION set_price_plan(text, text, text, integer, integer, integer, bigint, bigint, boolean);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_price_plan(
  p_key text,
  p_name_da text,
  p_name_en text,
  p_price_year_dkk integer,
  p_per_rider_dkk integer,
  p_included_riders integer,
  p_ai_budget_micro bigint,
  p_file_quota_bytes bigint,
  p_vat_included boolean,
  p_valid_from date DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Copenhagen')::date;
  v_from date := coalesce(p_valid_from, (now() AT TIME ZONE 'Europe/Copenhagen')::date);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = app_current_user_id() AND u.platform_role = 'owner'
  ) THEN
    RAISE EXCEPTION 'only the installation owner sets a price' USING ERRCODE = '42501';
  END IF;
  IF p_key !~ '^[a-z][a-z0-9-]{0,29}$'
    OR length(trim(coalesce(p_name_da, ''))) NOT BETWEEN 1 AND 60
    OR length(trim(coalesce(p_name_en, ''))) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'a price needs a key and a name in both languages' USING ERRCODE = '22023';
  END IF;
  IF v_from < v_today OR v_from > v_today + 3650 THEN
    RAISE EXCEPTION 'a price takes effect today or on a later day' USING ERRCODE = '22023';
  END IF;
  IF (p_per_rider_dkk IS NULL) <> (p_included_riders IS NULL) THEN
    RAISE EXCEPTION 'a price per rider needs the riders it includes, and the other way' USING ERRCODE = '22023';
  END IF;
  INSERT INTO price_plans AS pp (key, name_da, name_en, price_year_dkk, per_rider_dkk, included_riders,
    ai_budget_micro, file_quota_bytes, vat_included, valid_from, source)
  VALUES (p_key, trim(p_name_da), trim(p_name_en), p_price_year_dkk, p_per_rider_dkk, p_included_riders,
    p_ai_budget_micro, p_file_quota_bytes, coalesce(p_vat_included, true), v_from, 'Installation')
  ON CONFLICT (key, valid_from) DO UPDATE SET
    name_da = EXCLUDED.name_da, name_en = EXCLUDED.name_en,
    price_year_dkk = EXCLUDED.price_year_dkk, per_rider_dkk = EXCLUDED.per_rider_dkk,
    included_riders = EXCLUDED.included_riders, ai_budget_micro = EXCLUDED.ai_budget_micro,
    file_quota_bytes = EXCLUDED.file_quota_bytes, vat_included = EXCLUDED.vat_included,
    source = EXCLUDED.source;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION
  set_price_plan(text, text, text, integer, integer, integer, bigint, bigint, boolean, date) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION
  set_price_plan(text, text, text, integer, integer, integer, bigint, bigint, boolean, date) TO kadence_app;
--> statement-breakpoint
-- 3. Door 2 is used at once and locks after seven days unconfirmed
-- (src/core/auth/verify-days.ts); the sweep now waits thirty days before
-- it deletes an account nobody confirmed, so the person who came back
-- after a fortnight finds what they made. Otherwise as drizzle/0050.
CREATE OR REPLACE FUNCTION delete_unverified_signup(p_user_id text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_user users%ROWTYPE;
  v_orgs text[];
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND
     OR NOT v_user.self_signup
     OR v_user.email_verified
     OR v_user.platform_role IS NOT NULL
     OR v_user.created_at >= now() - interval '30 days' THEN
    RETURN false;
  END IF;
  IF EXISTS (
    SELECT 1 FROM memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.user_id = p_user_id
      AND (o.kind <> 'personal' OR m.role <> 'owner'
           OR EXISTS (SELECT 1 FROM memberships x
                      WHERE x.organization_id = o.id AND x.user_id <> p_user_id))
  ) THEN
    RETURN false;
  END IF;

  SELECT coalesce(array_agg(organization_id), '{}') INTO v_orgs
  FROM memberships WHERE user_id = p_user_id;

  DELETE FROM organizations WHERE id = ANY(v_orgs);
  DELETE FROM users WHERE id = p_user_id;

  PERFORM set_config('session_replication_role', 'replica', true);
  DELETE FROM audit_log WHERE org_id = ANY(v_orgs);
  DELETE FROM audit_log
  WHERE org_id IS NULL
    AND (
      actor_user_id = p_user_id
      OR (entity_type = 'users' AND entity_id = p_user_id)
      OR (entity_type = 'organizations' AND entity_id = ANY(v_orgs))
      OR before_data ->> 'user_id' = p_user_id
      OR after_data ->> 'user_id' = p_user_id
    );
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO audit_log (org_id, actor_user_id, actor_type, action, entity_type, entity_id)
  VALUES (NULL, NULL, 'system', 'signup.expired', 'users', p_user_id);
  RETURN true;
END
$$;
