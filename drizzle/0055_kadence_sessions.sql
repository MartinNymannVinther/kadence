-- Kadence's own sessions, strength programmes and ready weeks for a
-- senior (docs/adr/0092, src/modules/paradigms/senior-*.ts): fetched into
-- a workspace's library as templates marked source = 'kadence', never
-- 'dcu', and as training blocks with a stable key so fetching again
-- updates them in place. A coach who changes such a block makes it their
-- own: the key is cleared (src/modules/training/blocks.ts). RLS, the audit
-- triggers and the policies on both tables are unchanged.
ALTER TABLE "workout_templates" DROP CONSTRAINT "workout_templates_source";--> statement-breakpoint
ALTER TABLE "training_blocks" ADD COLUMN "source_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "training_blocks_source_key_uq" ON "training_blocks" USING btree ("org_id","source_key") WHERE "training_blocks"."source_key" is not null;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_source" CHECK ("workout_templates"."source" in ('dcu','own','kadence'));
