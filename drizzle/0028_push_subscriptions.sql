CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"kinds" text[] DEFAULT '{checkin,comment,plan,week}'::text[] NOT NULL,
	"told_up_to" timestamp with time zone DEFAULT now() NOT NULL,
	"checkin_reminded_on" date,
	"week_told_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint" CHECK ("push_subscriptions"."endpoint" like 'https://%' and char_length("push_subscriptions"."endpoint") <= 1000),
	CONSTRAINT "push_subscriptions_kinds" CHECK ("push_subscriptions"."kinds" <@ array['checkin','comment','plan','week']::text[])
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_uq" ON "push_subscriptions" USING btree ("org_id","user_id","endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
-- Reminders (docs/adr/0059). A subscription is its owner's alone: read,
-- written and removed by that person in that team, by nobody else, coaches
-- included. The push carries no content, so what a reminder says is read
-- later as the person it is for, under the ordinary policies.
GRANT SELECT, INSERT, UPDATE, DELETE ON "push_subscriptions" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "push_subscriptions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_own_push_subscriptions ON "push_subscriptions" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND user_id = app_current_user_id())
  WITH CHECK (org_id = app_current_org_id() AND user_id = app_current_user_id());
--> statement-breakpoint
CREATE TRIGGER audit_push_subscriptions
  AFTER INSERT OR UPDATE OR DELETE ON "push_subscriptions"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
-- The push address is a capability: whoever holds it and the installation's
-- key can wake that browser. It stays out of the audit log like a token.
CREATE OR REPLACE FUNCTION audit_redact(data jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN data IS NULL THEN NULL
    ELSE data - ARRAY[
      'password', 'token', 'secret', 'backup_codes',
      'access_token', 'refresh_token', 'id_token', 'value',
      'key_hash', 'token_hash', 'api_key_cipher',
      'bytes', 'streams', 'access_token_sealed', 'refresh_token_sealed',
      'endpoint'
    ]
  END
$$;
--> statement-breakpoint
-- The reminder job runs with nobody signed in. This is the one thing it may
-- read across people: which subscriptions exist, and whose, for owners who
-- are still members of the team. Not the address and not the kinds; the
-- job reads those, and everything else, as the owner (withOrgContext).
CREATE OR REPLACE FUNCTION push_subscriptions_due()
RETURNS TABLE (id text, org_id text, user_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT s.id, s.org_id, s.user_id
  FROM push_subscriptions s
  WHERE EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = s.org_id AND m.user_id = s.user_id
  )
  ORDER BY s.org_id, s.user_id
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION push_subscriptions_due() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION push_subscriptions_due() TO kadence_app;
