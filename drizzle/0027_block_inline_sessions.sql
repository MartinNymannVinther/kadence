ALTER TABLE "training_block_items" ALTER COLUMN "template_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "training_block_items" ADD COLUMN "sport" text;--> statement-breakpoint
ALTER TABLE "training_block_items" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "training_block_items" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "training_block_items" ADD COLUMN "structure" jsonb;--> statement-breakpoint
ALTER TABLE "training_block_items" ADD COLUMN "planned_minutes" smallint;--> statement-breakpoint
ALTER TABLE "training_block_items" ADD COLUMN "start_time" time;--> statement-breakpoint
ALTER TABLE "training_block_items" ADD COLUMN "meeting_place" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "training_block_items" ADD CONSTRAINT "training_block_items_session" CHECK ("training_block_items"."template_id" is not null or ("training_block_items"."sport" is not null and "training_block_items"."title" is not null and "training_block_items"."structure" is not null));--> statement-breakpoint
ALTER TABLE "training_block_items" ADD CONSTRAINT "training_block_items_meeting_place" CHECK (char_length("training_block_items"."meeting_place") <= 120);--> statement-breakpoint
-- A session kept in the block itself (docs/adr/0059) has no template, so
-- the write policy asks for a template of the same team only when the item
-- names one. Everything else about the policy is as drizzle/0012 wrote it.
DROP POLICY app_write_training_block_items ON "training_block_items";
--> statement-breakpoint
CREATE POLICY app_write_training_block_items ON "training_block_items" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach())
  WITH CHECK (
    org_id = app_current_org_id() AND app_is_coach()
    AND EXISTS (SELECT 1 FROM "training_blocks" b WHERE b.id = training_block_items.block_id AND b.org_id = training_block_items.org_id)
    AND (
      template_id IS NULL
      OR EXISTS (SELECT 1 FROM "workout_templates" w WHERE w.id = training_block_items.template_id AND w.org_id = training_block_items.org_id)
    )
  );
