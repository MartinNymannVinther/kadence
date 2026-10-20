CREATE TABLE "mail_preferences" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"week" boolean DEFAULT false NOT NULL,
	"locale" text DEFAULT 'da' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_preferences_locale" CHECK ("mail_preferences"."locale" in ('da', 'en'))
);
--> statement-breakpoint
ALTER TABLE "mail_preferences" ADD CONSTRAINT "mail_preferences_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_preferences" ADD CONSTRAINT "mail_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mail_preferences_person_uq" ON "mail_preferences" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "mail_preferences_user_idx" ON "mail_preferences" USING btree ("user_id");--> statement-breakpoint
-- Mail (docs/adr/0086). A person's choice of mail on a team — for now the
-- parents' week "også på mail" beside the push (ADR 0060) — is that
-- person's alone, as a push subscription is (drizzle/0028): read, written
-- and removed by that person in that team, by nobody else, coaches
-- included. It holds a yes or a no and a language, never an address: the
-- mail goes to the account's own address, read when it is sent.
GRANT SELECT, INSERT, UPDATE, DELETE ON "mail_preferences" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "mail_preferences" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "mail_preferences" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_own_mail_preferences ON "mail_preferences" FOR ALL TO kadence_app
  USING (org_id = (select app_current_org_id()) AND user_id = (select app_current_user_id()))
  WITH CHECK (org_id = (select app_current_org_id()) AND user_id = (select app_current_user_id()));
--> statement-breakpoint
-- Turning the mail on and off is a change a person makes, so it is in the
-- audit trail; the row carries nothing that needs redacting. When a week's
-- mail went out is not written here at all: the run marks it in the
-- counters (drizzle/0043), so the trail holds choices, not the job.
CREATE TRIGGER audit_mail_preferences
  AFTER INSERT OR UPDATE OR DELETE ON "mail_preferences"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
-- The weekly run starts with nobody signed in. This is the one thing it may
-- read across people: who has chosen the week by mail, and on which team,
-- for people who are still members of it. Not the language and not the
-- address; the run reads those, and whether the person is a parent there
-- at all, as the person (withOrgContext), as the push run does.
CREATE OR REPLACE FUNCTION mail_week_due()
RETURNS TABLE (org_id text, user_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT p.org_id, p.user_id
  FROM mail_preferences p
  WHERE p.week
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = p.org_id AND m.user_id = p.user_id
    )
  ORDER BY p.org_id, p.user_id
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION mail_week_due() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION mail_week_due() TO kadence_app;
