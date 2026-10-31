ALTER TABLE "consents" DROP CONSTRAINT "consents_kind";--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "device_name" text;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_device_name" CHECK (char_length("activities"."device_name") <= 80);--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_kind" CHECK ("consents"."kind" in ('terms', 'health', 'garmin', 'garmin_ai'));