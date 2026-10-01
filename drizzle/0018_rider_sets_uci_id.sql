-- A rider may set their own UCI ID (ADR 0039), as a coach may. The rest
-- of 0016's rule stands: a rider changes their thresholds, their sharing
-- and now their UCI ID, and nothing else of their own row — not when the
-- races were last read, nor what went wrong, which are Kadence's notes
-- for the coach. A changed UCI ID clears those notes here, before the row
-- is written, so the next visit reads the new one whoever changed it.
CREATE OR REPLACE FUNCTION riders_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_user text := app_current_user_id();
  v_self boolean;
BEGIN
  IF NEW.uci_id IS DISTINCT FROM OLD.uci_id THEN
    NEW.races_checked_at := NULL;
    NEW.races_error := '';
  END IF;
  IF v_user IS NULL THEN
    RETURN NEW;
  END IF;
  v_self := OLD.user_id IS NOT DISTINCT FROM v_user;
  IF (NEW.share_training IS DISTINCT FROM OLD.share_training
      OR NEW.share_wellbeing IS DISTINCT FROM OLD.share_wellbeing) AND NOT v_self THEN
    RAISE EXCEPTION 'riders: only the rider decides what the parents see' USING ERRCODE = '42501';
  END IF;
  -- The notes were cleared above for a new UCI ID; anything else the
  -- rider put there is refused.
  IF v_self AND NOT app_is_coach() AND (
      NEW.name IS DISTINCT FROM OLD.name
      OR NEW.birth_year IS DISTINCT FROM OLD.birth_year
      OR NEW.sex IS DISTINCT FROM OLD.sex
      OR NEW.category_override IS DISTINCT FROM OLD.category_override
      OR NEW.archived IS DISTINCT FROM OLD.archived
      OR NEW.invitation_id IS DISTINCT FROM OLD.invitation_id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR (NEW.uci_id IS NOT DISTINCT FROM OLD.uci_id AND (
        NEW.races_checked_at IS DISTINCT FROM OLD.races_checked_at
        OR NEW.races_error IS DISTINCT FROM OLD.races_error))) THEN
    RAISE EXCEPTION 'riders: a rider changes only thresholds, sharing and UCI ID'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.birth_year IS DISTINCT FROM OLD.birth_year THEN
    UPDATE guardians SET confirmed_at = NULL, confirmed_as_adult = false WHERE rider_id = NEW.id;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint

-- What was read under a UCI ID goes with it (0016), also when the rider
-- is the one who changed it — and a rider may not delete a result, which
-- is the coach's to write. So the clearing runs as its owner. It reads
-- nothing from the caller but the row that changed, and deletes only
-- that rider's results and the races Kadence made for them.
CREATE OR REPLACE FUNCTION riders_drop_race_results() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NEW.uci_id IS DISTINCT FROM OLD.uci_id THEN
    DELETE FROM race_results WHERE rider_id = NEW.id AND org_id = NEW.org_id;
    DELETE FROM calendar_events WHERE rider_id = NEW.id AND org_id = NEW.org_id AND source = 'dcu';
  END IF;
  RETURN NEW;
END
$$;
