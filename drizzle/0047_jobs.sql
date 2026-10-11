-- A table of jobs, and the worker that runs them (docs/adr/0085, backlog
-- S-06, plan §5.1).
--
-- Reminders ran on a timer in the app, a provider's webhook was answered
-- and then worked through with Next's after(), readings from Cykling
-- Danmark waited in a line in memory, and the teams page and the demos
-- were refreshed and cleaned up when somebody happened to visit. A deploy
-- in the middle lost the work, and a second instance ran every timer
-- twice. Here the work is a row: written before anybody is told it will
-- be done, taken by one worker at a time with FOR UPDATE SKIP LOCKED,
-- leased for five minutes, and tried again with a growing wait when it
-- fails. A job is never lost; a job may run twice, so every handler is
-- idempotent (the ADR says how each one is).
--
-- The table is the installation's, like app_rate_limits (drizzle/0043):
-- the worker reads every team's jobs, with nobody signed in. RLS is
-- enabled and forced with one policy for the application role, so the
-- meta-test holds for it as for every table, and the auth role and
-- anybody else get nothing. org_id says whose work a job is, so a deleted
-- workspace takes its jobs with it; the handler still runs as the
-- workspace's own people, under the ordinary policies.
--
-- No audit trigger, named in tests/rls/tenant-isolation.test.ts: a job
-- is machinery, not something anybody owns, and its payload holds ids,
-- days, counts and short words only, never a name, an address or
-- anything about health (src/core/jobs/payload.ts, and a test over every
-- kind). What a job does to a team's rows is audited where it lands.
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"org_id" text,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"locked_by" text,
	"locked_until" timestamp with time zone,
	"started_at" timestamp with time zone,
	"done_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_attempts_check" CHECK ("attempts" >= 0 AND "max_attempts" >= 1)
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- What the worker asks for: the jobs that are not done, by when they are due.
CREATE INDEX "jobs_due_idx" ON "jobs" USING btree ("run_at") WHERE "done_at" IS NULL;
--> statement-breakpoint
-- A team's jobs of a kind, and the cascade when the team goes.
CREATE INDEX "jobs_kind_org_idx" ON "jobs" USING btree ("kind", "org_id");
--> statement-breakpoint
-- The same work is not waiting twice: one undone job per kind, team and
-- key (src/core/jobs/queue.ts puts the key in the payload). A job without
-- a key is never a duplicate, because NULLs are distinct. A job that has
-- given up leaves the index, so the work can be asked for again.
CREATE UNIQUE INDEX "jobs_dedupe_idx" ON "jobs" USING btree ("kind", (coalesce("org_id", '')), (("payload" ->> 'key')))
  WHERE "done_at" IS NULL AND "attempts" < "max_attempts";
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "jobs" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "jobs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_all_jobs ON "jobs" FOR ALL TO kadence_app
  USING (true) WITH CHECK (true);
--> statement-breakpoint
-- Takes up to p_limit due jobs for p_worker and leases them for five
-- minutes. First, a lease that ran out is a run that died (a deploy, a
-- crash): it counts as an attempt, and the job is due again at once. Then
-- the due jobs are locked with SKIP LOCKED, so two workers asking at the
-- same moment take different jobs and neither waits for the other.
-- p_kinds narrows it to some kinds, for the tests and for nothing else.
--
-- SECURITY INVOKER: it runs as the application role under the table's
-- one policy, and needs nothing more.
CREATE OR REPLACE FUNCTION claim_jobs(p_worker text, p_limit integer, p_kinds text[] DEFAULT NULL)
RETURNS SETOF jobs
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  UPDATE jobs
     SET attempts = attempts + 1, last_error = 'lease_expired',
         locked_by = NULL, locked_until = NULL
   WHERE done_at IS NULL AND locked_until IS NOT NULL AND locked_until < now()
     AND (p_kinds IS NULL OR kind = ANY (p_kinds));

  RETURN QUERY
  WITH picked AS (
    SELECT j.id FROM jobs j
     WHERE j.done_at IS NULL AND j.attempts < j.max_attempts AND j.run_at <= now()
       AND j.locked_until IS NULL
       AND (p_kinds IS NULL OR j.kind = ANY (p_kinds))
     ORDER BY j.run_at
     LIMIT greatest(p_limit, 0)
     FOR UPDATE SKIP LOCKED
  )
  UPDATE jobs j
     SET locked_by = p_worker, locked_until = now() + interval '5 minutes', started_at = now()
    FROM picked
   WHERE j.id = picked.id
  RETURNING j.*;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION claim_jobs(text, integer, text[]) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION claim_jobs(text, integer, text[]) TO kadence_app;
--> statement-breakpoint
-- Which teams have riders whose races Cykling Danmark may be asked for,
-- and a coach of each to read them as (docs/adr/0085, ADR 0039), for the
-- hourly job that runs with nobody signed in. It answers the team's id
-- and one coach's user id, the owner before an admin and the earliest
-- first, and nothing else: no rider, no UCI ID, no name. Everything after
-- it runs as that coach, under the ordinary policies, exactly as the
-- coach's own visit does.
CREATE OR REPLACE FUNCTION dcu_teams_due()
RETURNS TABLE (org_id text, user_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT DISTINCT ON (m.organization_id) m.organization_id, m.user_id
  FROM memberships m
  WHERE m.role IN ('owner', 'admin')
    AND EXISTS (
      SELECT 1 FROM riders r
      WHERE r.org_id = m.organization_id AND r.uci_id IS NOT NULL AND NOT r.archived
    )
  ORDER BY m.organization_id, (m.role = 'owner') DESC, m.created_at, m.user_id
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION dcu_teams_due() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION dcu_teams_due() TO kadence_app;
