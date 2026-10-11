-- AI with a price (docs/adr/0089, backlog S-10, plan §5.1).
--
-- 1. What a model call spent: tokens and micro-euro on ai_calls.
--
-- The row is still written before the model is asked (reserve, ADR 0009),
-- and now completed after it answered: the provider's own token counts,
-- the model that answered, and the cost from the price list below. A call
-- that failed keeps nulls. billed_to says whose key paid: a workspace on
-- its own Mistral key (ADR 0006) pays its own bill, so only the
-- installation's calls count against the budget in part 3.
--
-- The index the monthly sum needs, (org_id, created_at), is
-- ai_calls_org_created_idx from drizzle/0044.
ALTER TABLE "ai_calls" ADD COLUMN "provider" text;
--> statement-breakpoint
ALTER TABLE "ai_calls" ADD COLUMN "model" text;
--> statement-breakpoint
ALTER TABLE "ai_calls" ADD COLUMN "tokens_in" integer;
--> statement-breakpoint
ALTER TABLE "ai_calls" ADD COLUMN "tokens_out" integer;
--> statement-breakpoint
ALTER TABLE "ai_calls" ADD COLUMN "cost_micro" bigint;
--> statement-breakpoint
ALTER TABLE "ai_calls" ADD COLUMN "billed_to" text DEFAULT 'installation' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_billed_to" CHECK ("ai_calls"."billed_to" in ('installation', 'workspace'));
--> statement-breakpoint
-- 2. The price list.
--
-- The installation's, not a team's: no org_id, like app_rate_limits
-- (drizzle/0043). Every workspace reads it to price its own calls; only a
-- migration writes it, so the application role gets SELECT and nothing
-- else, and its history is this file's history in git rather than rows in
-- the audit log (tests/rls/tenant-isolation.test.ts names it). An owner
-- who needs a new price before a release inserts a row with a later
-- valid_from; the newest row not after today wins.
--
-- Micro-euro per million tokens, as the provider publishes per million;
-- null is a price that is not known, and a call at it costs null, which
-- the Installation page shows as "pris ukendt". Seeded from
-- src/modules/ai/prices.ts, where the source and the day it was read sit
-- beside every number; tests/ai/prices-table.test.ts keeps the two equal.
CREATE TABLE "ai_prices" (
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_micro_per_mtok" bigint,
	"output_micro_per_mtok" bigint,
	"valid_from" date NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "ai_prices_provider_model_valid_from_pk" PRIMARY KEY("provider","model","valid_from")
);
--> statement-breakpoint
GRANT SELECT ON "ai_prices" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "ai_prices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "ai_prices" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_ai_prices ON "ai_prices" FOR SELECT TO kadence_app USING (true);
--> statement-breakpoint
INSERT INTO "ai_prices" ("provider", "model", "input_micro_per_mtok", "output_micro_per_mtok", "valid_from", "source") VALUES
  ('mistral', 'mistral-small-latest', 127500, 510000, '2026-10-11', 'https://docs.mistral.ai/models/pricing, read 2026-10-11; EUR as Mistral shows it (USD x 0.85)'),
  ('mistral', 'mistral-small-2603', 127500, 510000, '2026-10-11', 'https://docs.mistral.ai/models/pricing, read 2026-10-11; EUR as Mistral shows it (USD x 0.85)'),
  ('mistral', 'mistral-medium-latest', 1275000, 6375000, '2026-10-11', 'https://docs.mistral.ai/models/pricing, read 2026-10-11; EUR as Mistral shows it (USD x 0.85)'),
  ('mistral', 'mistral-medium-3', 1275000, 6375000, '2026-10-11', 'https://docs.mistral.ai/models/pricing, read 2026-10-11; EUR as Mistral shows it (USD x 0.85)'),
  ('mistral', 'mistral-medium-3-5', 1275000, 6375000, '2026-10-11', 'https://docs.mistral.ai/models/pricing, read 2026-10-11; EUR as Mistral shows it (USD x 0.85)'),
  ('mistral', 'mistral-large-latest', 425000, 1275000, '2026-10-11', 'https://docs.mistral.ai/models/pricing, read 2026-10-11; EUR as Mistral shows it (USD x 0.85)'),
  ('mistral', 'mistral-large-2512', 425000, 1275000, '2026-10-11', 'https://docs.mistral.ai/models/pricing, read 2026-10-11; EUR as Mistral shows it (USD x 0.85)'),
  ('mistral', 'mistral-large-4', NULL, NULL, '2026-10-11', 'https://docs.mistral.ai/models/pricing, read 2026-10-11; EUR as Mistral shows it (USD x 0.85); a sale price beside the original, no dates, so unknown'),
  ('mistral', 'mistral-large-4-0', NULL, NULL, '2026-10-11', 'https://docs.mistral.ai/models/pricing, read 2026-10-11; EUR as Mistral shows it (USD x 0.85); a sale price beside the original, no dates, so unknown'),
  ('mistral', 'ministral-14b-latest', 170000, 170000, '2026-10-11', 'https://docs.mistral.ai/models/pricing, read 2026-10-11; EUR as Mistral shows it (USD x 0.85)'),
  ('mistral', 'ministral-14b-2512', 170000, 170000, '2026-10-11', 'https://docs.mistral.ai/models/pricing, read 2026-10-11; EUR as Mistral shows it (USD x 0.85)'),
  ('mistral', 'ministral-8b-latest', 127500, 127500, '2026-10-11', 'https://docs.mistral.ai/models/pricing, read 2026-10-11; EUR as Mistral shows it (USD x 0.85)'),
  ('mistral', 'ministral-8b-2512', 127500, 127500, '2026-10-11', 'https://docs.mistral.ai/models/pricing, read 2026-10-11; EUR as Mistral shows it (USD x 0.85)'),
  ('mistral', 'ministral-3b-latest', 85000, 85000, '2026-10-11', 'https://docs.mistral.ai/models/pricing, read 2026-10-11; EUR as Mistral shows it (USD x 0.85)'),
  ('mistral', 'ministral-3b-2512', 85000, 85000, '2026-10-11', 'https://docs.mistral.ai/models/pricing, read 2026-10-11; EUR as Mistral shows it (USD x 0.85)'),
  ('ollama', '*', 0, 0, '2026-10-11', 'Ollama runs on the installation''s own machine; a call costs no money');
--> statement-breakpoint
-- 3. A monthly budget per workspace.
--
-- Replaces the shared roof (AI_DAILY_CALL_CAP, ADR 0009) as the thing
-- that stands between a busy club and everybody else's AI: each workspace
-- has its own month, the installation's default AI_MONTHLY_BUDGET_MICRO
-- unless the owner set another here. Null is the default.
--
-- Coaches write team_settings (drizzle/0003), so this one column is
-- guarded: the application role may not set or change it, whatever the
-- policies allow. Only set_ai_budget() below, which runs as its owner and
-- checks that the caller owns the installation, can. The audit trigger
-- on team_settings records the change either way.
ALTER TABLE "team_settings" ADD COLUMN "ai_budget_micro" bigint;
--> statement-breakpoint
ALTER TABLE "team_settings" ADD CONSTRAINT "team_settings_ai_budget" CHECK ("team_settings"."ai_budget_micro" >= 0);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION team_settings_budget_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  -- current_user is the role running the statement: kadence_app for the
  -- application, the function's owner inside set_ai_budget().
  IF current_user = 'kadence_app' AND (
    (TG_OP = 'INSERT' AND NEW.ai_budget_micro IS NOT NULL)
    OR (TG_OP = 'UPDATE' AND NEW.ai_budget_micro IS DISTINCT FROM OLD.ai_budget_micro)
  ) THEN
    RAISE EXCEPTION 'only the installation owner sets a workspace''s AI budget' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER team_settings_budget_guard
  BEFORE INSERT OR UPDATE ON "team_settings"
  FOR EACH ROW EXECUTE FUNCTION team_settings_budget_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_ai_budget(p_org text, p_budget_micro bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = app_current_user_id() AND u.platform_role = 'owner'
  ) THEN
    RAISE EXCEPTION 'only the installation owner sets an AI budget' USING ERRCODE = '42501';
  END IF;
  IF p_budget_micro IS NOT NULL AND p_budget_micro < 0 THEN
    RAISE EXCEPTION 'a budget is not negative' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = p_org) THEN
    RAISE EXCEPTION 'no such workspace' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO team_settings (org_id, ai_budget_micro) VALUES (p_org, p_budget_micro)
  ON CONFLICT (org_id) DO UPDATE SET ai_budget_micro = EXCLUDED.ai_budget_micro, updated_at = now();
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION set_ai_budget(text, bigint) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION set_ai_budget(text, bigint) TO kadence_app;
--> statement-breakpoint
-- 4. The owner's overview gains the month's AI cost, the calls without a
-- known price, and the budget, as three more columns after the others
-- (drizzle/0041's definition otherwise unchanged).
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
  pilot_minutes bigint,
  ai_cost_month_micro bigint,
  ai_unpriced_month bigint,
  ai_budget_micro bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Copenhagen')::date;
  v_monday date := v_today - (extract(isodow FROM v_today)::int - 1) - 7;
  v_sunday date := v_monday + 6;
  v_from timestamptz := v_monday::timestamp AT TIME ZONE 'Europe/Copenhagen';
  v_to timestamptz := (v_sunday + 1)::timestamp AT TIME ZONE 'Europe/Copenhagen';
  v_month timestamptz := date_trunc('month', now() AT TIME ZONE 'Europe/Copenhagen') AT TIME ZONE 'Europe/Copenhagen';
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
    pm.minutes_n,
    ai.cost_micro,
    ai.unpriced_n,
    (SELECT ts.ai_budget_micro FROM team_settings ts WHERE ts.org_id = o.id)
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
  -- This month's AI on the installation's key: what it cost, and how many
  -- calls used tokens at a price nobody knows (docs/adr/0089).
  CROSS JOIN LATERAL (
    SELECT
      coalesce(sum(a.cost_micro), 0)::bigint AS cost_micro,
      count(*) FILTER (WHERE a.tokens_in IS NOT NULL AND a.cost_micro IS NULL) AS unpriced_n
    FROM ai_calls a
    WHERE a.org_id = o.id AND a.created_at >= v_month AND a.billed_to = 'installation'
  ) ai
  WHERE NOT EXISTS (SELECT 1 FROM demo_workspaces d WHERE d.organization_id = o.id)
  ORDER BY o.created_at;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION platform_overview() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION platform_overview() TO kadence_app;
