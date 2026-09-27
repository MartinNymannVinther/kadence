# ADR 0020: Polar as the third device

Status: accepted · Date: 2026-09-27 · Amends 0018

## Context

Wahoo and Garmin bring a rider's rides in by themselves (ADR 0018). Many
young Danish riders train with a Polar watch or bike computer, and until
now their only way in was a FIT file uploaded by hand. Polar Electro Oy is
a Finnish company (Kempele), and its privacy notice says the service data
behind Polar Flow is stored on servers in the EU/EEA (Ireland and Sweden).
Polar's partner API, AccessLink v3, is self-service: any Polar Flow user
can create a client at admin.polaraccesslink.com under Polar's AccessLink
Limited License Agreement.

AccessLink differs from the other two in ways that touch the shared code:

- OAuth 2.0 without PKCE. The code is exchanged with the client's id and
  secret as HTTP Basic, and the token answer names the account
  (`x_user_id`). There is no refresh token: the reference says access
  tokens do not expire unless revoked, while `expires_in` says about a
  year.
- The partner must register the user (POST /v3/users) before any data
  flows, and de-registers them with DELETE /v3/users/{user-id}.
- One webhook per client, created by the operator with the client's
  credentials. AccessLink pings the URL and creates the webhook only if
  the ping is answered 200, and only then hands over the key it signs with
  — once. Every notification is signed: `Polar-Webhook-Signature`, an
  HMAC-SHA256 of the body in hex.
- AccessLink is read-only for Kadence's purposes: there is no documented
  way to put a planned workout on a Polar device.

## Decision

- Polar is a third adapter behind the same `DeviceProvider` interface
  (`src/modules/devices/polar.ts`), inert until `POLAR_CLIENT_ID` and
  `POLAR_CLIENT_SECRET` are set, and refusing every notification until
  `POLAR_WEBHOOK_SECRET` is set too. The settings page says so without
  keys, and FIT upload works as before (dogma 2).
- The interface grows three optional parts, each unused by Wahoo and
  Garmin: `register` (called after the OAuth round trip), the account id
  from the token answer passed to `userId`, and `isPing`. `deregister`
  also receives the account id, and `verifyWebhook` the raw body, because
  Polar signs the bytes, not the parsed JSON.
- The signature is compared in constant time before any row is touched,
  exactly as Wahoo's token is. The ping is answered 200 without
  verification and does nothing: it is the one message sent before the
  operator can hold the key, and it asks for nothing.
- A ride comes in as the rider (ADR 0018): `device_link_owner` finds the
  link, the file is fetched with the rider's token from
  `https://www.polaraccesslink.com/v3/exercises/{id}/fit` — a URL Kadence
  builds from the notification's exercise id rather than one it follows —
  and imported through `importFitIn` with `source = 'polar'`.
- The registration carries a random member id, so nothing about the rider
  or the team goes to Polar with it. Its answer — the Polar profile, with
  name, birth date and weight — is discarded unread.
- No push. The adapter has no `pushWorkout`, the settings card says
  sessions cannot be sent to Polar, and the session's send buttons leave
  Polar out.
- `drizzle/0010` widens the two check constraints to allow `polar`. No new
  table, policy or definer.

## Trade-offs accepted

- **No PKCE.** Polar documents none, so a stolen authorization code is
  protected by the state check and by the client secret only. Kadence is
  a confidential client and the secret never leaves the server, which is
  what OAuth relied on before PKCE; it is still one layer fewer than Wahoo
  and Garmin have.
- **An unverified ping is answered.** Anyone can make Kadence answer 200
  to a PING. It does nothing, is rate limited like every webhook, and is
  the price of AccessLink creating a webhook at all.
- **A token Kadence treats as a year long.** The reference says both
  "will not expire unless explicitly revoked" and gives `expires_in` of a
  year. Kadence keeps the date it is given; after it, the link shows an
  error and the rider connects again. Safer than trusting a token past its
  stated end, at the cost of one reconnect a year that may not have been
  needed.
- **Assumptions not provable from the public reference**, written in the
  adapter and to be checked with a live client: that the signature covers
  the body bytes exactly as delivered with the key's UTF-8 bytes (the
  reference's Java example does that); and whether AccessLink signs the
  ping. If the first is wrong, every notification is a 401 and no ride is
  ever imported — failing closed, visibly, rather than open.
- **The interface is a little wider** for one provider. The alternative, a
  Polar-shaped branch in the connect flow and the webhook, would have
  scattered provider knowledge outside the adapters.
