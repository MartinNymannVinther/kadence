-- A parent puts the family's days into their child's calendar: a holiday,
-- an exam, a family occasion (docs/adr/0069, docs/backlog.md P2-04).
--
-- Until now only a coach or the rider wrote calendar events
-- (app_write_calendar_events in drizzle/0003); a guardian read. These
-- three policies sit beside that one — permissive policies add up — and
-- let a guardian write one narrow kind of row and nothing else:
--
-- * for a rider, never the team (rider_id is not null);
-- * only a holiday, an exam or "other" — never a race, a camp, school or
--   a week ill;
-- * only for a child whose link the rider has confirmed and who shares
--   their training, and from the year the child turns 18 only if the
--   adult has confirmed again (app_is_guardian_of(rider, 'training'),
--   the same test that lets the guardian read the child's calendar);
-- * only in their own name (created_by is the caller), and changing or
--   removing only the rows they wrote themselves — not the rider's own
--   exam, not the coach's, not the other parent's;
-- * never a priority, and never a row that claims to come from Cykling
--   Danmark.
--
-- The coach and the rider keep writing every row of the rider's as
-- before, the parent's included: the rider may delete what a parent put
-- in. The audit trigger on the table records every write.
CREATE POLICY app_guardian_insert_calendar_events ON "calendar_events" FOR INSERT TO kadence_app
  WITH CHECK (
    org_id = app_current_org_id()
    AND rider_id IS NOT NULL
    AND kind IN ('holiday', 'exam', 'other')
    AND priority IS NULL
    AND source IS NULL
    AND created_by = app_current_user_id()
    AND app_is_guardian_of(rider_id, 'training')
  );
--> statement-breakpoint
CREATE POLICY app_guardian_update_calendar_events ON "calendar_events" FOR UPDATE TO kadence_app
  USING (
    org_id = app_current_org_id()
    AND rider_id IS NOT NULL
    AND kind IN ('holiday', 'exam', 'other')
    AND created_by = app_current_user_id()
    AND app_is_guardian_of(rider_id, 'training')
  )
  WITH CHECK (
    org_id = app_current_org_id()
    AND rider_id IS NOT NULL
    AND kind IN ('holiday', 'exam', 'other')
    AND priority IS NULL
    AND source IS NULL
    AND created_by = app_current_user_id()
    AND app_is_guardian_of(rider_id, 'training')
  );
--> statement-breakpoint
CREATE POLICY app_guardian_delete_calendar_events ON "calendar_events" FOR DELETE TO kadence_app
  USING (
    org_id = app_current_org_id()
    AND rider_id IS NOT NULL
    AND kind IN ('holiday', 'exam', 'other')
    AND created_by = app_current_user_id()
    AND app_is_guardian_of(rider_id, 'training')
  );
