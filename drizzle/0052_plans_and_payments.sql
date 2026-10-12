-- A price, a trial and an invoice by hand (docs/adr/0090, backlog S-12a,
-- docs/plan-konto-og-priser.md §4 with Martin's answers in §9).
--
-- 1. The tables and columns (drizzle-kit's part).
--
-- organizations.plan is what the workspace pays: 'free' (the default,
-- and every workspace's while BILLING=off), 'trial' until trial_ends_at,
-- 'paid' until paid_until, or 'expired', in which the workspace reads and
-- exports and writes nothing new (src/modules/billing/plan.ts). free_until
-- is a free workspace with a date: a club's first season, a young rider
-- alone until their last U19 season ends; when it passes the daily job
-- makes it a trial. price_plan names the row of price_plans the workspace
-- is priced by; null is the one its kind gives. Like kind (drizzle/0041),
-- no request sets any of these: the registration sets them on the auth
-- role right after the workspace is made, and afterwards only the
-- functions below move them.
CREATE TABLE "payments" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"amount_dkk" integer NOT NULL,
	"vat_dkk" integer NOT NULL,
	"invoice_no" text NOT NULL,
	"period_from" date NOT NULL,
	"period_to" date NOT NULL,
	"registered_by" text NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	CONSTRAINT "payments_amount" CHECK ("payments"."amount_dkk" >= 0),
	CONSTRAINT "payments_vat" CHECK ("payments"."vat_dkk" >= 0 and "payments"."vat_dkk" <= "payments"."amount_dkk"),
	CONSTRAINT "payments_period" CHECK ("payments"."period_to" >= "payments"."period_from"),
	CONSTRAINT "payments_invoice_no" CHECK (length("payments"."invoice_no") between 1 and 100)
);
--> statement-breakpoint
CREATE TABLE "price_plans" (
	"key" text PRIMARY KEY NOT NULL,
	"name_da" text NOT NULL,
	"name_en" text NOT NULL,
	"price_year_dkk" integer NOT NULL,
	"per_rider_dkk" integer,
	"included_riders" integer,
	"ai_budget_micro" bigint NOT NULL,
	"file_quota_bytes" bigint NOT NULL,
	"vat_included" boolean DEFAULT true NOT NULL,
	"valid_from" date DEFAULT current_date NOT NULL,
	"source" text,
	CONSTRAINT "price_plans_price" CHECK ("price_plans"."price_year_dkk" >= 0),
	CONSTRAINT "price_plans_per_rider" CHECK ("price_plans"."per_rider_dkk" is null or "price_plans"."per_rider_dkk" >= 0),
	CONSTRAINT "price_plans_included" CHECK ("price_plans"."included_riders" is null or "price_plans"."included_riders" >= 0),
	CONSTRAINT "price_plans_ai_budget" CHECK ("price_plans"."ai_budget_micro" >= 0),
	CONSTRAINT "price_plans_file_quota" CHECK ("price_plans"."file_quota_bytes" >= 0)
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "price_plan" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "trial_ends_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "paid_until" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "free_reason" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "free_until" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "payments_org_idx" ON "payments" USING btree ("org_id","registered_at");
--> statement-breakpoint
CREATE INDEX "organizations_plan_idx" ON "organizations" USING btree ("plan");
--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_plan" CHECK ("organizations"."plan" in ('free', 'trial', 'paid', 'expired'));
--> statement-breakpoint
-- 2. The price list.
--
-- The installation's, like ai_prices (drizzle/0049): no org_id, read by
-- the application role, which prices a workspace and will show the open
-- price page. Unlike ai_prices the owner changes it from Installation
-- (backlog S-12b), so its changes are audited, and only set_price_plan()
-- below writes it. Seeded with Martin's yes of 12 October 2026 (plan
-- §3.3, §9.1): a rider alone 290 kr. a year; a club 1,200 kr. a year for
-- up to 20 riders and 50 kr. for each rider beyond; a rider alone who is
-- at most U19 this season free (src/modules/billing/which-plan.ts). All
-- with VAT. AI budgets in micro-euro, file quotas in decimal bytes.
GRANT SELECT ON "price_plans" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "price_plans" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "price_plans" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_price_plans ON "price_plans" FOR SELECT TO kadence_app USING (true);
--> statement-breakpoint
CREATE TRIGGER audit_price_plans
  AFTER INSERT OR UPDATE OR DELETE ON "price_plans"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
INSERT INTO "price_plans" ("key", "name_da", "name_en", "price_year_dkk", "per_rider_dkk", "included_riders", "ai_budget_micro", "file_quota_bytes", "vat_included", "valid_from", "source") VALUES
  ('person', 'Rytter alene', 'Rider alone', 290, NULL, NULL, 5000000, 2000000000, true, '2026-10-12', 'docs/plan-konto-og-priser.md §3.3; Martin''s yes, 12 October 2026'),
  ('club', 'Klub', 'Club', 1200, 50, 20, 5000000, 20000000000, true, '2026-10-12', 'docs/plan-konto-og-priser.md §3.3; Martin''s yes, 12 October 2026'),
  ('youth', 'Ung rytter alene', 'Young rider alone', 0, NULL, NULL, 2000000, 2000000000, true, '2026-10-12', 'docs/plan-konto-og-priser.md §3.3; Martin''s yes, 12 October 2026');
--> statement-breakpoint
-- 3. Payments.
--
-- A workspace's own rows, read by its owner — the person who gets the
-- invoice — and by the installation's owner, who registered them; a coach
-- who is not the owner and everybody else see none. Nobody writes one
-- through a policy: only set_payment() below, which checks the caller owns
-- the installation. Audited, under the workspace.
GRANT SELECT ON "payments" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_payments ON "payments" FOR SELECT TO kadence_app
  USING (
    (
      org_id = (select app_current_org_id())
      AND EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.organization_id = payments.org_id
          AND m.user_id = (select app_current_user_id())
          AND m.role = 'owner'
      )
    )
    OR (select app_is_platform_owner())
  );
--> statement-breakpoint
CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON "payments"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
-- 4. What a workspace costs: two plain functions, with the caller's
-- rights, that the definers below and the application share, so there is
-- one sum. src/modules/billing/which-plan.ts holds the same sum for the
-- pages and tests/billing keeps the two equal.
CREATE OR REPLACE FUNCTION workspace_price_key(p_kind text, p_price_plan text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT coalesce(p_price_plan, CASE WHEN p_kind = 'personal' THEN 'person' ELSE 'club' END)
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION plan_yearly_dkk(p_key text, p_riders integer) RETURNS integer
LANGUAGE sql STABLE SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT pp.price_year_dkk + CASE
    WHEN pp.per_rider_dkk IS NULL THEN 0
    ELSE greatest(coalesce(p_riders, 0) - coalesce(pp.included_riders, 0), 0) * pp.per_rider_dkk
  END
  FROM price_plans pp WHERE pp.key = p_key
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION workspace_price_key(text, text), plan_yearly_dkk(text, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION workspace_price_key(text, text), plan_yearly_dkk(text, integer) TO kadence_app;
--> statement-breakpoint
-- 5. The installation's owner, and nobody else, moves a workspace's plan
-- and its prices, as set_ai_budget() (drizzle/0049) sets a budget: the
-- caller's app.user_id must be the owner's. A demo is never priced and
-- never paid for; it is free and thrown away. The audit trigger on
-- organizations records each change under the workspace.
CREATE OR REPLACE FUNCTION set_payment(
  p_org text,
  p_amount_dkk integer,
  p_vat_dkk integer,
  p_invoice_no text,
  p_from date,
  p_to date,
  p_note text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_id text;
  v_until timestamptz;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = app_current_user_id() AND u.platform_role = 'owner'
  ) THEN
    RAISE EXCEPTION 'only the installation owner registers a payment' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = p_org) THEN
    RAISE EXCEPTION 'no such workspace' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM demo_workspaces d WHERE d.organization_id = p_org) THEN
    RAISE EXCEPTION 'a demo is never paid for' USING ERRCODE = '22023';
  END IF;
  IF p_amount_dkk IS NULL OR p_vat_dkk IS NULL OR p_amount_dkk < 0 OR p_vat_dkk < 0
    OR p_vat_dkk > p_amount_dkk OR p_from IS NULL OR p_to IS NULL OR p_to < p_from
    OR length(trim(coalesce(p_invoice_no, ''))) NOT BETWEEN 1 AND 100
    OR length(coalesce(p_note, '')) > 500 THEN
    RAISE EXCEPTION 'a payment needs an amount, its VAT, an invoice number and a period' USING ERRCODE = '22023';
  END IF;
  INSERT INTO payments (org_id, amount_dkk, vat_dkk, invoice_no, period_from, period_to, registered_by, note)
  VALUES (p_org, p_amount_dkk, p_vat_dkk, trim(p_invoice_no), p_from, p_to, app_current_user_id(),
          nullif(trim(coalesce(p_note, '')), ''))
  RETURNING id INTO v_id;
  -- Paid through the period's last day, a Copenhagen day: until the
  -- midnight that ends it. A payment for an earlier period never shortens
  -- what a later one paid for.
  v_until := (p_to + 1)::timestamp AT TIME ZONE 'Europe/Copenhagen';
  UPDATE organizations o SET
    paid_until = greatest(o.paid_until, v_until),
    plan = CASE WHEN greatest(o.paid_until, v_until) > now() THEN 'paid' ELSE o.plan END,
    free_reason = CASE WHEN greatest(o.paid_until, v_until) > now() THEN NULL ELSE o.free_reason END,
    free_until = CASE WHEN greatest(o.paid_until, v_until) > now() THEN NULL ELSE o.free_until END
  WHERE o.id = p_org;
  RETURN v_id;
END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_plan_free(p_org text, p_reason text, p_until timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = app_current_user_id() AND u.platform_role = 'owner'
  ) THEN
    RAISE EXCEPTION 'only the installation owner makes a workspace free' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = p_org) THEN
    RAISE EXCEPTION 'no such workspace' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM demo_workspaces d WHERE d.organization_id = p_org) THEN
    RAISE EXCEPTION 'a demo is free already' USING ERRCODE = '22023';
  END IF;
  IF length(trim(coalesce(p_reason, ''))) NOT BETWEEN 1 AND 60
    OR (p_until IS NOT NULL AND p_until <= now()) THEN
    RAISE EXCEPTION 'free needs a reason, and a date that has not passed' USING ERRCODE = '22023';
  END IF;
  UPDATE organizations SET plan = 'free', free_reason = trim(p_reason), free_until = p_until
  WHERE id = p_org;
END
$$;
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
  p_vat_included boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
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
  INSERT INTO price_plans AS pp (key, name_da, name_en, price_year_dkk, per_rider_dkk, included_riders,
    ai_budget_micro, file_quota_bytes, vat_included, valid_from, source)
  VALUES (p_key, trim(p_name_da), trim(p_name_en), p_price_year_dkk, p_per_rider_dkk, p_included_riders,
    p_ai_budget_micro, p_file_quota_bytes, coalesce(p_vat_included, true),
    (now() AT TIME ZONE 'Europe/Copenhagen')::date, 'Installation')
  ON CONFLICT (key) DO UPDATE SET
    name_da = EXCLUDED.name_da, name_en = EXCLUDED.name_en,
    price_year_dkk = EXCLUDED.price_year_dkk, per_rider_dkk = EXCLUDED.per_rider_dkk,
    included_riders = EXCLUDED.included_riders, ai_budget_micro = EXCLUDED.ai_budget_micro,
    file_quota_bytes = EXCLUDED.file_quota_bytes, vat_included = EXCLUDED.vat_included,
    valid_from = EXCLUDED.valid_from, source = EXCLUDED.source;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION set_payment(text, integer, integer, text, date, date, text),
  set_plan_free(text, text, timestamptz),
  set_price_plan(text, text, text, integer, integer, integer, bigint, bigint, boolean) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION set_payment(text, integer, integer, text, date, date, text),
  set_plan_free(text, text, timestamptz),
  set_price_plan(text, text, text, integer, integer, integer, bigint, bigint, boolean) TO kadence_app;
--> statement-breakpoint
-- 6. What a workspace costs, for whoever may know: its owner and its
-- other coaches (Indstillinger → Abonnement), the installation's owner,
-- and the daily job, which runs with nobody signed in and no workspace
-- (src/modules/billing/notices.ts) and puts the price in the mail. One
-- row: the plan's key, the yearly price for the riders the workspace has
-- now, the riders, what the plan includes and whether VAT is in it.
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
    LEFT JOIN price_plans pp ON pp.key = k.key
    WHERE o.id = p_org;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION workspace_price(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION workspace_price(text) TO kadence_app;
--> statement-breakpoint
-- 7. The installation's owner's list under Installation → Betaling: every
-- workspace but the demos, with its plan, its dates, its riders and its
-- price. A personal workspace comes without its name, which is a
-- person's (drizzle/0041); the page calls it "Enkeltperson".
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
    LEFT JOIN price_plans pp ON pp.key = k.key
    WHERE NOT EXISTS (SELECT 1 FROM demo_workspaces d WHERE d.organization_id = o.id)
    ORDER BY o.kind, o.created_at;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION billing_overview() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION billing_overview() TO kadence_app;
--> statement-breakpoint
-- 8. The daily job (src/modules/billing/jobs.ts), with nobody signed in
-- and no workspace in its context; refused from a request, which always
-- has one, like file_tombstones_due (drizzle/0051).
--
-- expire_workspaces() moves what time has moved, and answers the rows it
-- moved: a trial past trial_ends_at and a paid workspace past paid_until
-- become 'expired'; a free workspace whose free_until has passed (a
-- club's first season, a young rider's last U19 season) becomes a trial
-- of p_trial_days days (TRIAL_DAYS), or stays free with no date when the
-- installation gives no trial. Nothing is ever deleted for it, and a demo
-- is never touched.
CREATE OR REPLACE FUNCTION expire_workspaces(p_trial_days integer)
RETURNS TABLE (org_id text, plan_before text, plan_after text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF app_current_org_id() IS NOT NULL THEN
    RAISE EXCEPTION 'expire_workspaces: not from a workspace' USING ERRCODE = '42501';
  END IF;
  IF p_trial_days IS NULL OR p_trial_days < 0 OR p_trial_days > 3650 THEN
    RAISE EXCEPTION 'expire_workspaces: a trial is 0 to 3650 days' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
    WITH due AS (
      SELECT o.id, o.plan AS plan_was,
        CASE
          WHEN o.plan IN ('trial', 'paid') THEN 'expired'
          WHEN p_trial_days > 0 THEN 'trial'
          ELSE 'free'
        END AS plan_now
      FROM organizations o
      WHERE NOT EXISTS (SELECT 1 FROM demo_workspaces d WHERE d.organization_id = o.id)
        AND (
          (o.plan = 'trial' AND o.trial_ends_at IS NOT NULL AND o.trial_ends_at <= now())
          OR (o.plan = 'paid' AND o.paid_until IS NOT NULL AND o.paid_until <= now())
          OR (o.plan = 'free' AND o.free_until IS NOT NULL AND o.free_until <= now())
        )
      FOR UPDATE OF o
    ),
    moved AS (
      UPDATE organizations o SET
        plan = due.plan_now,
        trial_ends_at = CASE WHEN due.plan_now = 'trial' THEN now() + make_interval(days => p_trial_days)
                             ELSE o.trial_ends_at END,
        free_until = CASE WHEN due.plan_was = 'free' THEN NULL ELSE o.free_until END,
        free_reason = CASE WHEN due.plan_was = 'free' AND due.plan_now = 'trial' THEN NULL ELSE o.free_reason END,
        price_plan = CASE WHEN due.plan_was = 'free' AND o.price_plan = 'youth' THEN NULL ELSE o.price_plan END
      FROM due
      WHERE o.id = due.id
      RETURNING o.id, due.plan_was, due.plan_now
    )
    SELECT moved.id, moved.plan_was, moved.plan_now FROM moved ORDER BY moved.id;
END
$$;
--> statement-breakpoint
-- The mails that are due (src/modules/billing/notices.ts): for each owner
-- of each workspace, which kind and the moment it is about. Counted in
-- Copenhagen days to the last day the trial or the payment covers: 'trial-7'
-- from 7 to 2 days before, 'trial-1' on the last two days, 'paid-14' from
-- 14 days before, and 'expired' from its last day for 14 days. Whether one already
-- went is the job's to remember (the counters, keyed by the moment), so a
-- new trial or a new payment is a new mail. The workspace and the
-- person's id, and nothing else: the job reads the address and the
-- workspace's name as the owner, under the ordinary policies, as the
-- parents' week does (drizzle/0048).
CREATE OR REPLACE FUNCTION billing_notices_due()
RETURNS TABLE (org_id text, user_id text, kind text, ends_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Copenhagen')::date;
BEGIN
  IF app_current_org_id() IS NOT NULL THEN
    RAISE EXCEPTION 'billing_notices_due: not from a workspace' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    WITH ends AS (
      SELECT o.id, o.plan,
        CASE o.plan
          WHEN 'trial' THEN o.trial_ends_at
          WHEN 'paid' THEN o.paid_until
          WHEN 'expired' THEN greatest(o.trial_ends_at, o.paid_until)
        END AS ends_at
      FROM organizations o
      WHERE o.plan IN ('trial', 'paid', 'expired')
        AND NOT EXISTS (SELECT 1 FROM demo_workspaces d WHERE d.organization_id = o.id)
    ),
    days AS (
      SELECT e.id, e.plan, e.ends_at,
        ((e.ends_at - interval '1 millisecond') AT TIME ZONE 'Europe/Copenhagen')::date - v_today AS left_n
      FROM ends e WHERE e.ends_at IS NOT NULL
    ),
    kinds AS (
      SELECT d.id, d.ends_at,
        CASE
          WHEN d.plan = 'trial' AND d.left_n BETWEEN 2 AND 7 THEN 'trial-7'
          WHEN d.plan = 'trial' AND d.left_n BETWEEN 0 AND 1 THEN 'trial-1'
          WHEN d.plan = 'paid' AND d.left_n BETWEEN 0 AND 14 THEN 'paid-14'
          WHEN d.plan = 'expired' AND d.left_n BETWEEN -14 AND 0 THEN 'expired'
        END AS kind
      FROM days d
    )
    SELECT k.id, m.user_id, k.kind, k.ends_at
    FROM kinds k
    JOIN memberships m ON m.organization_id = k.id AND m.role = 'owner'
    WHERE k.kind IS NOT NULL
    ORDER BY k.id, m.user_id;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION expire_workspaces(integer), billing_notices_due() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION expire_workspaces(integer), billing_notices_due() TO kadence_app;
