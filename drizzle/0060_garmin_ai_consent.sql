-- Which of these riders have said yes, themselves and still standing, to
-- letting the AI read their rides from Garmin (consents.kind 'garmin_ai',
-- docs/adr/0112). A consent is the person's own row (drizzle/0050), so a
-- coach asking for Monday's overview cannot read a rider's yes; this
-- answers the yes alone, for riders of the active workspace the caller may
-- read, and nothing else about the rows. Only the rider's own yes counts:
-- a row a coach or a parent wrote about the rider names the wrong person.
CREATE OR REPLACE FUNCTION app_garmin_ai_riders(p_riders text[]) RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT r.id FROM riders r
  WHERE r.id = ANY (p_riders)
    AND r.org_id = app_current_org_id()
    AND r.user_id IS NOT NULL
    AND app_can_read_rider(r.id, 'training')
    AND EXISTS (
          SELECT 1 FROM consents c
          WHERE c.org_id = r.org_id
            AND c.rider_id = r.id
            AND c.user_id = r.user_id
            AND c.kind = 'garmin_ai'
            AND c.withdrawn_at IS NULL
        )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_garmin_ai_riders(text[]) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_garmin_ai_riders(text[]) TO kadence_app;
