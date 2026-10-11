CREATE TABLE "consents" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"rider_id" text,
	"kind" text NOT NULL,
	"given_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"version" text NOT NULL,
	"locale" text DEFAULT 'da' NOT NULL,
	CONSTRAINT "consents_kind" CHECK ("consents"."kind" in ('terms', 'health')),
	CONSTRAINT "consents_locale" CHECK ("consents"."locale" in ('da', 'en')),
	CONSTRAINT "consents_version" CHECK (char_length("consents"."version") between 1 and 20)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "self_signup" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consents_org_kind_idx" ON "consents" USING btree ("org_id","kind");--> statement-breakpoint
CREATE INDEX "consents_user_idx" ON "consents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "consents_rider_idx" ON "consents" USING btree ("rider_id");--> statement-breakpoint
-- Door 2 (docs/adr/0088). What a person agreed to when they created their
-- own workspace: the terms, and the explicit consent to health data (GDPR
-- art. 9(2)(a)). It is that person's record and nobody else's: read,
-- written and withdrawn by the person in that workspace, coaches included
-- (in a personal workspace the person is its only coach anyway). No
-- DELETE: a consent goes with the account or the workspace, by cascade.
GRANT SELECT, INSERT, UPDATE ON "consents" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "consents" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "consents" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_own_consents ON "consents" FOR ALL TO kadence_app
  USING (org_id = (select app_current_org_id()) AND user_id = (select app_current_user_id()))
  WITH CHECK (org_id = (select app_current_org_id()) AND user_id = (select app_current_user_id()));
--> statement-breakpoint
-- A consent is evidence of what was agreed to, and when. Once given, only
-- its withdrawal may be written, once: no other column changes, and a
-- withdrawal is not taken back (giving it again is a new row).
CREATE OR REPLACE FUNCTION consents_only_withdraw() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.org_id IS DISTINCT FROM OLD.org_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.rider_id IS DISTINCT FROM OLD.rider_id
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.given_at IS DISTINCT FROM OLD.given_at
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.locale IS DISTINCT FROM OLD.locale
     OR OLD.withdrawn_at IS NOT NULL THEN
    RAISE EXCEPTION 'consents: only a withdrawal may be written, once' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER consents_only_withdraw
  BEFORE UPDATE ON "consents"
  FOR EACH ROW EXECUTE FUNCTION consents_only_withdraw();
--> statement-breakpoint
-- Giving and withdrawing are things a person does, so they are in the
-- workspace's audit trail, which in a personal workspace only its owner
-- reads.
CREATE TRIGGER audit_consents
  AFTER INSERT OR UPDATE OR DELETE ON "consents"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
-- Whether the active workspace's consent to health data has been
-- withdrawn: it has health consents and none of them stands. Answered to
-- any member of the workspace — a child riding in their parent's
-- workspace writes check-ins too, and cannot read the parent's row — as
-- one boolean and nothing else. A club has no rows and is never off.
CREATE OR REPLACE FUNCTION app_health_consent_withdrawn() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT EXISTS (
           SELECT 1 FROM memberships m
           WHERE m.organization_id = app_current_org_id()
             AND m.user_id = app_current_user_id()
         )
     AND EXISTS (
           SELECT 1 FROM consents c
           WHERE c.org_id = app_current_org_id() AND c.kind = 'health'
         )
     AND NOT EXISTS (
           SELECT 1 FROM consents c
           WHERE c.org_id = app_current_org_id() AND c.kind = 'health'
             AND c.withdrawn_at IS NULL
         )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_health_consent_withdrawn() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_health_consent_withdrawn() TO kadence_app;
--> statement-breakpoint
-- The accounts door 2 made and never confirmed, for the daily sweep.
CREATE INDEX IF NOT EXISTS users_unconfirmed_self_signup_idx ON "users" (created_at)
  WHERE self_signup AND NOT email_verified;
--> statement-breakpoint
-- Deletes an account door 2 made and nobody confirmed within seven days,
-- for the sweep on the auth role (src/modules/signup/sweep.ts): its
-- workspace, then the account, as "Slet min konto og alt om mig" takes
-- them, and every audit row about either — the logins with their
-- addresses, the account's row with its name and address — leaving one
-- line that it happened, with the account's id and nothing else.
--
-- It refuses, by returning false and doing nothing, anything else: an
-- account not made through door 2, a confirmed one, the installation's
-- owner, one younger than seven days by the database's clock, and one
-- that is anything but the only member of its own personal workspaces
-- (a person who joined a team meanwhile keeps their account). The row is
-- locked, so two sweeps at once delete each account once.
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
     OR v_user.created_at >= now() - interval '7 days' THEN
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
--> statement-breakpoint
REVOKE ALL ON FUNCTION delete_unverified_signup(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION delete_unverified_signup(text) TO kadence_auth;

--> statement-breakpoint
-- A consent stays with the workspace it was given in when its rider's
-- history moves (drizzle/0046, docs/adr/0081): it was the basis there, and
-- a team the rider joins rests on the club's own.
CREATE OR REPLACE FUNCTION move_rider_history_tables()
RETURNS TABLE (table_name text, action text)
LANGUAGE sql IMMUTABLE AS $$
  VALUES
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
    ('race_results', 'move'),
    ('calendar_events', 'move'),
    ('device_links', 'move'),
    ('guardians', 'stay'),
    ('planned_session_deletions', 'stay'),
    ('week_plan_drafts', 'stay'),
    ('club_championship_entries', 'stay'),
    ('club_champions', 'stay'),
    ('consents', 'stay')
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION move_rider_history_tables() FROM PUBLIC;
