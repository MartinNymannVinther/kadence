CREATE TABLE "team_exercises" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"group" text NOT NULL,
	"equipment" text[] DEFAULT '{}'::text[] NOT NULL,
	"dose" jsonb NOT NULL,
	"how" text NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"pose" jsonb NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_exercises_group" CHECK ("team_exercises"."group" in ('legs','core','upper','mobility','other')),
	CONSTRAINT "team_exercises_equipment" CHECK ("team_exercises"."equipment" <@ array['mat','wall','bench','step','band','kettlebell','ball']::text[]),
	CONSTRAINT "team_exercises_name" CHECK (char_length("team_exercises"."name") between 1 and 60),
	CONSTRAINT "team_exercises_how" CHECK (char_length("team_exercises"."how") between 1 and 500),
	CONSTRAINT "team_exercises_why" CHECK (char_length("team_exercises"."why") <= 300),
	CONSTRAINT "team_exercises_dose" CHECK (jsonb_typeof("team_exercises"."dose") = 'object' and octet_length("team_exercises"."dose"::text) <= 1024),
	CONSTRAINT "team_exercises_pose" CHECK (jsonb_typeof("team_exercises"."pose") = 'object' and octet_length("team_exercises"."pose"::text) <= 8192)
);
--> statement-breakpoint
CREATE TABLE "team_programs" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"parts" jsonb NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_programs_name" CHECK (char_length("team_programs"."name") between 1 and 60),
	CONSTRAINT "team_programs_description" CHECK (char_length("team_programs"."description") <= 300),
	CONSTRAINT "team_programs_parts" CHECK (jsonb_typeof("team_programs"."parts") = 'array' and octet_length("team_programs"."parts"::text) <= 32768)
);
--> statement-breakpoint
ALTER TABLE "team_exercises" ADD CONSTRAINT "team_exercises_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_exercises" ADD CONSTRAINT "team_exercises_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_programs" ADD CONSTRAINT "team_programs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_programs" ADD CONSTRAINT "team_programs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_exercises_org_idx" ON "team_exercises" USING btree ("org_id","archived");--> statement-breakpoint
CREATE INDEX "team_programs_org_idx" ON "team_programs" USING btree ("org_id","archived");--> statement-breakpoint
-- A team's own exercises and programmes (docs/plan-ovelser-og-programmer.md)
-- are the team's, like its library (drizzle/0003, 0012): the members read
-- them, the coaches write them, and every change is audited.
--
-- No DELETE. A programme names its exercises inside its JSON, where no
-- foreign key can follow, so a deleted exercise would leave programmes
-- pointing at nothing; a coach archives instead, and an archived exercise
-- still resolves in the programmes that have it. The rows leave with the
-- workspace: delete_workspace() and the demo's expiry remove the
-- organization, and org_id's ON DELETE CASCADE runs as the table's owner,
-- not as kadence_app. The policies are written per command for the same
-- reason, so a later grant of DELETE would still find no policy to use.
GRANT SELECT, INSERT, UPDATE ON "team_exercises", "team_programs" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "team_exercises" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "team_exercises" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "team_programs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "team_programs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Read: a member of the active team. The membership is asked of the
-- database rather than taken from the context alone, so a context naming a
-- team the caller is not in reads nothing. The subquery names no column of
-- the row, so it runs once per statement, not once per row.
CREATE POLICY app_read_team_exercises ON "team_exercises" FOR SELECT TO kadence_app
  USING (
    org_id = app_current_org_id()
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = app_current_org_id() AND m.user_id = app_current_user_id()
    )
  );
--> statement-breakpoint
CREATE POLICY app_insert_team_exercises ON "team_exercises" FOR INSERT TO kadence_app
  WITH CHECK (org_id = app_current_org_id() AND app_is_coach());
--> statement-breakpoint
CREATE POLICY app_update_team_exercises ON "team_exercises" FOR UPDATE TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach())
  WITH CHECK (org_id = app_current_org_id() AND app_is_coach());
--> statement-breakpoint
CREATE POLICY app_read_team_programs ON "team_programs" FOR SELECT TO kadence_app
  USING (
    org_id = app_current_org_id()
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = app_current_org_id() AND m.user_id = app_current_user_id()
    )
  );
--> statement-breakpoint
CREATE POLICY app_insert_team_programs ON "team_programs" FOR INSERT TO kadence_app
  WITH CHECK (org_id = app_current_org_id() AND app_is_coach());
--> statement-breakpoint
CREATE POLICY app_update_team_programs ON "team_programs" FOR UPDATE TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach())
  WITH CHECK (org_id = app_current_org_id() AND app_is_coach());
--> statement-breakpoint
CREATE TRIGGER audit_team_exercises
  AFTER INSERT OR UPDATE OR DELETE ON "team_exercises"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_team_programs
  AFTER INSERT OR UPDATE OR DELETE ON "team_programs"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
