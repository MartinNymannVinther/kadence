-- What the activity page shows beyond the totals: the fastest second, the
-- heart-rate drift, the laps and the climbs (src/modules/fit, src/modules/load).
-- The table's RLS, grants and audit trigger already cover new columns.
ALTER TABLE "activities" ADD COLUMN "max_speed" real;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "hr_drift" real;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "laps" jsonb;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "climbs" jsonb;