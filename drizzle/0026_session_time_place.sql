ALTER TABLE "planned_sessions" ADD COLUMN "start_time" time;--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD COLUMN "meeting_place" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_meeting_place" CHECK (char_length("planned_sessions"."meeting_place") <= 120);