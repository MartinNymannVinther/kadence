CREATE TABLE "training_block_items" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"block_id" text NOT NULL,
	"template_id" text NOT NULL,
	"day" smallint NOT NULL,
	"sort" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "training_block_items_day" CHECK ("training_block_items"."day" between 0 and 83)
);
--> statement-breakpoint
CREATE TABLE "training_blocks" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"weeks" smallint NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "training_blocks_weeks" CHECK ("training_blocks"."weeks" between 1 and 12)
);
--> statement-breakpoint
ALTER TABLE "training_block_items" ADD CONSTRAINT "training_block_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_block_items" ADD CONSTRAINT "training_block_items_block_id_training_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."training_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_block_items" ADD CONSTRAINT "training_block_items_template_id_workout_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_blocks" ADD CONSTRAINT "training_blocks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_blocks" ADD CONSTRAINT "training_blocks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "training_block_items_block_idx" ON "training_block_items" USING btree ("org_id","block_id","day");--> statement-breakpoint
CREATE INDEX "training_blocks_org_idx" ON "training_blocks" USING btree ("org_id","archived");--> statement-breakpoint
-- Training blocks (ADR 0025) are the team's, like its templates
-- (drizzle/0003): everyone on the team reads them, coaches write, every
-- change is audited, and an item can only name a block and a template of
-- its own team (drizzle/0007's pattern for references).
GRANT SELECT, INSERT, UPDATE, DELETE ON "training_blocks", "training_block_items" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "training_blocks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "training_blocks" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "training_block_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "training_block_items" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_training_blocks ON "training_blocks" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id());
--> statement-breakpoint
CREATE POLICY app_write_training_blocks ON "training_blocks" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach())
  WITH CHECK (org_id = app_current_org_id() AND app_is_coach());
--> statement-breakpoint
CREATE POLICY app_read_training_block_items ON "training_block_items" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id());
--> statement-breakpoint
CREATE POLICY app_write_training_block_items ON "training_block_items" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach())
  WITH CHECK (
    org_id = app_current_org_id() AND app_is_coach()
    AND EXISTS (SELECT 1 FROM "training_blocks" b WHERE b.id = training_block_items.block_id AND b.org_id = training_block_items.org_id)
    AND EXISTS (SELECT 1 FROM "workout_templates" w WHERE w.id = training_block_items.template_id AND w.org_id = training_block_items.org_id)
  );
--> statement-breakpoint
CREATE TRIGGER audit_training_blocks
  AFTER INSERT OR UPDATE OR DELETE ON "training_blocks"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_training_block_items
  AFTER INSERT OR UPDATE OR DELETE ON "training_block_items"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
