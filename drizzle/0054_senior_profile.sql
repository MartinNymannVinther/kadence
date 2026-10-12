-- A senior's training profile (docs/adr/0091): a rider past U23 plans as
-- a "motionist" or a "super-motionist", Kadence's own numbers where DCU
-- has none (src/modules/paradigms/senior.ts). Null is the default,
-- motionist; the column is read only when the rider's class in the
-- season is senior.
--
-- The riders guard (riders_guard(), drizzle/0018) names the columns a
-- rider may not change on their own row; this one is not among them, so a
-- rider chooses their own profile as they set their thresholds, and a
-- coach chooses it for any rider on the team. RLS is unchanged.
ALTER TABLE "riders" ADD COLUMN "training_profile" text;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_training_profile" CHECK ("riders"."training_profile" is null or "riders"."training_profile" in ('motionist','super-motionist'));--> statement-breakpoint
-- A season plan is filled from one of DCU's class-years or one of the two
-- profiles. The column had no check; every plan Kadence has written holds
-- a class-year, so the check holds for the rows already there.
ALTER TABLE "season_plans" ADD CONSTRAINT "season_plans_basis" CHECK ("season_plans"."basis" in ('U17-1','U17-2','U19-1','U19-2','U23-1','U23-2','U23-3','U23-4','senior-motionist','senior-super-motionist'));
