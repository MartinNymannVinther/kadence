-- The strength room's equipment for a team's own exercises (backlog Ø-06,
-- docs/adr/0067 amended 2026-10-07): the check on team_exercises.equipment
-- (drizzle/0032) gains 'barbell', 'dumbbell', 'trx' and 'pullupBar', the
-- four EQUIPMENT gained in src/modules/exercises/types.ts.
-- tests/exercises/team-schema holds the two lists to one.
--
-- The new list holds the old one, so every row already stored passes the
-- new check. A check cannot be changed in place; it is dropped and added
-- again under the same name in the same migration.

ALTER TABLE "team_exercises" DROP CONSTRAINT "team_exercises_equipment";
--> statement-breakpoint
ALTER TABLE "team_exercises" ADD CONSTRAINT "team_exercises_equipment" CHECK ("team_exercises"."equipment" <@ array['mat','wall','bench','step','band','kettlebell','ball','barbell','dumbbell','trx','pullupBar']::text[]);
