-- Counters in the database, and timeouts on the runtime roles
-- (docs/adr/0083, backlog S-03, plan §5.0).
--
-- 1. app_rate_limits: the counters src/core/rate-limit.ts kept in a Map.
--
-- The rate limits, the places held while a ride is read, the installation's
-- six readings a minute at Cykling Danmark and the moments to remember
-- (src/core/counters.ts) were counted in the memory of one process. A
-- restart forgot them and a second instance had a limit of its own. Here
-- every instance shares one count, and a restart keeps it.
--
-- UNLOGGED: a counter is not worth a write to the WAL. A crash empties the
-- table, which costs exactly what a restart cost before, and the rows are
-- not replicated or kept in a backup (scripts/backup-kadence.sh skips
-- unlogged data), so the addresses some of the keys carry live no longer
-- than their window.
--
-- No org_id, like Better Auth's rate_limits (drizzle/0001): the table is
-- the installation's, not a team's. Most of its keys are counted before
-- anybody has a team (an address on a public door, a key at the ingest
-- door), and the others are counted per person or per rider across
-- teams. Nobody reads it but the counters themselves. RLS is still
-- enabled and forced, with one policy for the application role, so the
-- meta-test in tests/rls/tenant-isolation.test.ts holds for it as for
-- every table, and the auth role and anybody else get nothing.
--
-- No index but the key: the sweep deletes the expired rows every minute
-- and the table stays small, while an index on reset_at would turn every
-- count into a non-HOT update.
CREATE UNLOGGED TABLE "app_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "app_rate_limits" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "app_rate_limits" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app_rate_limits" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_all_rate_limits ON "app_rate_limits" FOR ALL TO kadence_app
  USING (true) WITH CHECK (true);
--> statement-breakpoint
-- 2. Timeouts on the runtime roles.
--
-- A query that runs away, or a transaction left open by a request that
-- died, held its connection until somebody noticed. With ten connections
-- in a pool, a handful of those is the whole installation waiting. Now a
-- statement gives up after 30 seconds and a transaction idle for 15 is
-- ended by the server, and the pool (src/core/db/client.ts) gives up on a
-- connection it cannot get within 5.
--
-- Measured on the development machine before choosing 30 s: the export of
-- a seeded team, delete_workspace, a 25 MB FIT import and a Strava
-- archive's three files each finish in well under a second of database
-- time (docs/adr/0083). Nothing in Kadence fetches from the network
-- inside a transaction: models, push services and Cykling Danmark are all
-- asked outside one.
--
-- Set on the roles, so they hold for every connection whichever pool or
-- script opens it. The migration role (the superuser) is not touched.
ALTER ROLE kadence_app SET statement_timeout = '30s';
--> statement-breakpoint
ALTER ROLE kadence_app SET idle_in_transaction_session_timeout = '15s';
--> statement-breakpoint
ALTER ROLE kadence_auth SET statement_timeout = '30s';
--> statement-breakpoint
ALTER ROLE kadence_auth SET idle_in_transaction_session_timeout = '15s';
--> statement-breakpoint
-- 3. pg_stat_statements, for knowing which queries cost the most.
--
-- Production loads the library (docker-compose.yml, db.command); the
-- development compose does not, and there the extension is created all
-- the same but its view answers only once the library is preloaded. A
-- Postgres without the contrib package, or a migration role that may not
-- create it, skips it with a notice rather than failing the migration:
-- it is a tool for whoever runs the installation, not something Kadence
-- reads.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
EXCEPTION
  WHEN undefined_file OR insufficient_privilege OR feature_not_supported THEN
    RAISE NOTICE 'pg_stat_statements is not available here: %', SQLERRM;
END
$$;
