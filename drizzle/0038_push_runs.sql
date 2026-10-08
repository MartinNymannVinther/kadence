CREATE TABLE "push_runs" (
	"subscription_id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"told_up_to" timestamp with time zone NOT NULL,
	"checkin_reminded_on" date,
	"week_told_on" date,
	"told_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "push_runs" ADD CONSTRAINT "push_runs_subscription_id_push_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."push_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_runs" ADD CONSTRAINT "push_runs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_runs" ADD CONSTRAINT "push_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_runs_user_idx" ON "push_runs" USING btree ("user_id");--> statement-breakpoint
-- Reminders do not fill the audit trail (docs/adr/0060, backlog P2-13).
-- Every reminder moved told_up_to, checkin_reminded_on or week_told_on on
-- push_subscriptions, and its audit trigger (drizzle/0028) wrote a row for
-- each: a coach reading the trail for changes to the training found a row
-- per evening per rider. The three marks move here, to push_runs, a table
-- with no audit trigger, and subscribing, choosing and unsubscribing stay
-- on push_subscriptions, audited as before.
--
-- Why push_runs carries no audit trigger (dogma six names every change):
-- its rows are technical timestamps the reminder job writes, the moment a
-- reminder went out and how far the news it told reached. They hold no
-- personal data beyond whose subscription it is, which the audited
-- subscription already says, and no person ever changes them; auditing
-- them recorded the job, not anybody's change. The exception is named in
-- tests/rls/tenant-isolation.test.ts, beside sessions, rate_limits and the
-- other machinery that writes no audit rows. That a subscription exists,
-- what it is for and when it ends is still in the trail.
--
-- Each subscription's marks come along, and the moment the last reminder
-- went out (the subscription's updated_at, which the job moved) becomes
-- told_at. Then the columns leave push_subscriptions.
INSERT INTO "push_runs" (
  "subscription_id", "org_id", "user_id",
  "told_up_to", "checkin_reminded_on", "week_told_on", "told_at"
)
SELECT "id", "org_id", "user_id",
  "told_up_to", "checkin_reminded_on", "week_told_on", "updated_at"
FROM "push_subscriptions";
--> statement-breakpoint
ALTER TABLE "push_subscriptions" DROP COLUMN "told_up_to";--> statement-breakpoint
ALTER TABLE "push_subscriptions" DROP COLUMN "checkin_reminded_on";--> statement-breakpoint
ALTER TABLE "push_subscriptions" DROP COLUMN "week_told_on";
--> statement-breakpoint
-- A subscription's run marks are its owner's alone, like the subscription
-- (drizzle/0028): read and written by that person in that team, by nobody
-- else, coaches included, and only for a subscription that is theirs. The
-- job writes them as the owner (withOrgContext). No DELETE: a row goes
-- with its subscription, by cascade.
GRANT SELECT, INSERT, UPDATE ON "push_runs" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "push_runs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "push_runs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_own_push_runs ON "push_runs" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND user_id = app_current_user_id())
  WITH CHECK (
    org_id = app_current_org_id()
    AND user_id = app_current_user_id()
    AND EXISTS (
      SELECT 1 FROM push_subscriptions s
      WHERE s.id = push_runs.subscription_id
        AND s.org_id = push_runs.org_id
        AND s.user_id = push_runs.user_id
    )
  );
