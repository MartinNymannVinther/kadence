-- What an invitation is for: a rider, a parent, or neither. See
-- docs/adr/0065 and src/core/team/invitation-kind.ts.
--
-- A rider's and a parent's invitation both carry the role "member", so the
-- join page could only say "som træner" for a coach and the team's name
-- for everybody else. What sets the two apart is a row a coach prepared —
-- a rider row or a guardian row carrying the invitation's id — and the
-- page reads the invitation as the auth role, before anybody is signed in,
-- which has no grant on riders or guardians at all.
--
-- So this one question is asked through a definer: for an invitation that
-- is still pending and not expired, is it for a rider, or for a parent,
-- and then whose? It answers one word, and for a parent the rider's first
-- name — the first word of the name a coach typed — and nothing else: no
-- ids, no team, no birth year, no surname, no address, no other row. A
-- row that joining would not link (one somebody already holds, or a rider
-- who is archived) is not counted, and an invitation that is used, taken
-- back or out of date gets no answer at all. A rider row wins over a
-- guardian row, as it does in the menu (ADR 0061). It cannot enumerate:
-- the invitation's id is the key in the link, and only the person it was
-- sent to holds it.
CREATE OR REPLACE FUNCTION invitation_kind(p_invitation_id text)
RETURNS TABLE (kind text, rider_first_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
  WITH valid AS (
    SELECT i.id, i.organization_id
    FROM invitations i
    WHERE i.id = p_invitation_id
      AND i.status = 'pending'
      AND i.expires_at > now()
  ),
  answers AS (
    SELECT 0 AS rank, 'rider'::text AS kind, NULL::text AS rider_first_name,
           r.created_at, r.id
    FROM valid v
    JOIN riders r ON r.invitation_id = v.id AND r.org_id = v.organization_id
    WHERE r.user_id IS NULL AND NOT r.archived
    UNION ALL
    SELECT 1, 'guardian', (regexp_match(btrim(r.name), '^\S+'))[1],
           g.created_at, g.id
    FROM valid v
    JOIN guardians g ON g.invitation_id = v.id AND g.org_id = v.organization_id
    JOIN riders r ON r.id = g.rider_id AND r.org_id = g.org_id
    WHERE g.user_id IS NULL AND NOT r.archived
  )
  SELECT a.kind, a.rider_first_name
  FROM answers a
  ORDER BY a.rank, a.created_at, a.id
  LIMIT 1
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION invitation_kind(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION invitation_kind(text) TO kadence_auth;
