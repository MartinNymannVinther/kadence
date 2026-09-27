-- Polar as the third device (ADR 0020): a device link and an activity may
-- name 'polar'. The tables' RLS, grants, audit triggers and
-- device_link_owner (drizzle/0005) already cover the new value.
ALTER TABLE "activities" DROP CONSTRAINT "activities_source";--> statement-breakpoint
ALTER TABLE "device_links" DROP CONSTRAINT "device_links_provider";--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_source" CHECK ("activities"."source" in ('fit','wahoo','garmin','polar','manual'));--> statement-breakpoint
ALTER TABLE "device_links" ADD CONSTRAINT "device_links_provider" CHECK ("device_links"."provider" in ('wahoo','garmin','polar'));
