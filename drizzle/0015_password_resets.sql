CREATE TABLE "password_resets" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_by" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "password_resets_user_idx" ON "password_resets" USING btree ("org_id","user_id");--> statement-breakpoint
-- A coach's one-time link for a member who forgot the password (ADR 0032).
-- The link is Better Auth's own password reset; this is the record that
-- one was made, by whom and for whom. A coach writes it, for another
-- member of the team who is not an owner, in their own name; the coaches
-- and the person it was made for read it; nobody changes or removes it.
-- Every insert is in the audit trail.
GRANT SELECT, INSERT ON "password_resets" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "password_resets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "password_resets" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_password_resets ON "password_resets" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id() AND (app_is_coach() OR user_id = app_current_user_id()));
--> statement-breakpoint
CREATE POLICY app_insert_password_resets ON "password_resets" FOR INSERT TO kadence_app
  WITH CHECK (
    org_id = app_current_org_id()
    AND app_is_coach()
    AND created_by = app_current_user_id()
    AND user_id <> app_current_user_id()
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = password_resets.org_id
        AND m.user_id = password_resets.user_id
        AND m.role <> 'owner'
    )
  );
--> statement-breakpoint
CREATE TRIGGER audit_password_resets
  AFTER INSERT OR UPDATE OR DELETE ON "password_resets"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
