# ADR 0018: A device's ride comes in as the rider it belongs to

Status: accepted · Date: 2026-09-27 · Amended by 0020 (Polar, a third provider)

## Context

Wahoo and Garmin tell Kadence about a new ride with a webhook: a request
with nobody signed in, so no team and no person for RLS to answer from.
The ride belongs to one rider on one team, and every write in Kadence
goes through `withOrgContext` with a person.

## Decision

- One SECURITY DEFINER function, `device_link_owner(provider,
external_user_id)` (drizzle/0005), answers which team, rider and rider
  account a connected link belongs to — nothing else, and nothing for a
  link that is not connected or a rider who is archived or has left.
- The ride is then fetched (only from the provider's own host, with the
  stored token) and imported **as the rider**, through the ordinary import
  and the ordinary policies. Token refreshes and link status are written
  the same way. The audit trail therefore names the rider as the actor of
  what their device sent.
- Wahoo's webhook token is compared in constant time. Garmin signs
  nothing; a forged ping can at most make Kadence fetch a file from
  Garmin with the rider's own token, and a deregistration is believed
  only when Garmin itself refuses that token.
- Without keys the connections say so and FIT upload works (dogma 2).
  Wahoo and Garmin are US companies: a rider chooses to connect, and
  `docs/subprocessors.md` says what flows.

## Trade-offs accepted

- **The rider as actor.** A coach pressing "send to Wahoo" refreshes the
  rider's token in the rider's name. The trail is truthful about whose
  link it is, less so about who pressed.
- **Answer first, fetch after.** The webhook is acknowledged before the
  download, so the provider does not retry a download that fails; the
  failure shows on the rider's link, and the file can be uploaded by hand.
