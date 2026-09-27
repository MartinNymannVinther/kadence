-- Device webhooks: finding the rider a Wahoo or Garmin notification is
-- about. See docs/adr/0002 and 0011, and src/modules/devices/webhooks.ts.
--
-- A notification arrives with nobody signed in. It names the provider's
-- own user id and nothing Kadence can set a tenant context from, and the
-- application role sees no device link without one: RLS answers zero rows
-- (default deny), which is right for every other query and useless here.
--
-- So this one question is asked through a definer: which team, which
-- rider and which account does a connected link for this provider and
-- this provider user belong to? The webhook then sets that team and that
-- rider as the transaction's context and does everything else — reading
-- the link's tokens, importing the ride, noting the sync — as the rider,
-- under the ordinary policies. The function answers with three ids for an
-- exact (provider, user id) pair and nothing else: no tokens, no status,
-- no row it was not asked about, and nothing at all for a link that is
-- not connected, a rider without an account, a rider who is archived, or
-- a person who is no longer a member of the team. It cannot enumerate:
-- without the provider's user id, which only the provider and the link
-- itself hold, there is nothing to ask for.
CREATE OR REPLACE FUNCTION device_link_owner(p_provider text, p_external_user_id text)
RETURNS TABLE (org_id text, rider_id text, rider_user_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.org_id, l.rider_id, r.user_id
  FROM device_links l
  JOIN riders r ON r.id = l.rider_id AND r.org_id = l.org_id
  WHERE l.provider = p_provider
    AND l.external_user_id = p_external_user_id
    AND l.status = 'connected'
    AND r.user_id IS NOT NULL
    AND NOT r.archived
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = l.org_id AND m.user_id = r.user_id
    )
  LIMIT 1
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION device_link_owner(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION device_link_owner(text, text) TO kadence_app;
