ALTER TABLE "checkins" ADD COLUMN "red_since" timestamp with time zone;
--> statement-breakpoint
-- When a check-in last turned red (docs/adr/0060, backlog P2-17). A coach's
-- wellbeing reminder counted from a check-in's first save, so one saved
-- green and changed to red later in the day was told only if no other
-- reminder had gone to the coach in between. The check-in service now sets
-- red_since when a check-in turns red, keeps it while it stays red, and
-- clears it when it is put right (src/modules/wellbeing/checkins.ts), and
-- the reminder counts from it. Both go by one rule, isRedCheckin in
-- src/modules/load/wellbeing.ts.
--
-- No policy changes: the column rides with its row, under the check-in's
-- own policies and audit trigger.
--
-- The check-ins already red get their first save as the moment, which is
-- what the reminder counted from until now, so none is told again. This is
-- isRedCheckin's rule written once in SQL, for this backfill only: pain 3,
-- ill, or mood at the bottom of the scale.
UPDATE "checkins"
SET "red_since" = "created_at"
WHERE "pain" >= 3 OR "ill" >= 1 OR "mood" <= 1;
