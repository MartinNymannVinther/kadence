ALTER TABLE "planned_sessions" ADD COLUMN "series_key" text;--> statement-breakpoint
CREATE INDEX "planned_sessions_series_idx" ON "planned_sessions" USING btree ("org_id","series_key");