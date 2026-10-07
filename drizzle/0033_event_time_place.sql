-- When and where an event starts, and a short note on who drives
-- (docs/backlog.md P2-03), as a session has its time and place (ADR 0058).
-- All three optional; RLS on calendar_events is unchanged.
ALTER TABLE "calendar_events" ADD COLUMN "start_time" time;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "meeting_place" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "transport_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_meeting_place" CHECK (char_length("calendar_events"."meeting_place") <= 120);--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_transport_note" CHECK (char_length("calendar_events"."transport_note") <= 200);