# Setting up automatic uploads: Garmin, Wahoo and Polar

This is the operator's guide to letting riders connect their own Garmin,
Wahoo or Polar account, so that rides come into Kadence by themselves.
None of it is required: without these keys the devices page says "not set
up here", and FIT upload, the calendar and everything else work as before
(dogma 2). Each provider is independent; set up one, two or all three.

A way in that needs no keys at all — a rider's upload key, the bike
computer on a cable, a share from the phone — is in
[upload-keys.md](upload-keys.md).

Sessions onto a Garmin need no keys either: a bike session goes into
the device's `Garmin/NewFiles` folder by cable, written by Chrome or
copied by hand (ADR 0031, and the help's "Pas på cykelcomputeren").

What the code does is described in `src/modules/devices` and ADR
[0018](adr/0018-devices-act-as-the-rider.md) and
[0020](adr/0020-polar-as-the-third-device.md); what flows to whom is in
[subprocessors.md](subprocessors.md#services-a-rider-chooses-to-connect).

## 1. Before anything: a public https address

Every provider sends a rider back to Kadence after the rider says yes (the
OAuth **callback**), and tells Kadence about a new ride by calling it (the
**webhook**). Kadence builds both addresses from `BETTER_AUTH_URL`:

| Provider | Redirect / callback URL                         | Webhook URL                                    |
| -------- | ----------------------------------------------- | ---------------------------------------------- |
| Garmin   | `<BETTER_AUTH_URL>/api/devices/garmin/callback` | `<BETTER_AUTH_URL>/api/devices/garmin/webhook` |
| Wahoo    | `<BETTER_AUTH_URL>/api/devices/wahoo/callback`  | `<BETTER_AUTH_URL>/api/devices/wahoo/webhook`  |
| Polar    | `<BETTER_AUTH_URL>/api/devices/polar/callback`  | `<BETTER_AUTH_URL>/api/devices/polar/webhook`  |

For kadence.haij.dk that is, for example,
`https://kadence.haij.dk/api/devices/polar/callback`. Register them exactly
as written — the providers compare the redirect URL character for
character.

The callback only needs to reach the rider's browser, but **the webhook
must be reachable from the internet over https**. A provider's servers
cannot reach `localhost` or a tailnet address, so:

- **In production** the Coolify deployment (docs/deploy.md) already has a
  public https address. Use it; nothing else is needed.
- **For local testing**, expose the dev server with
  [Tailscale Funnel](https://tailscale.com/kb/1223/funnel):
  `tailscale funnel 3000` publishes it as
  `https://<machine>.<tailnet>.ts.net` (Funnel needs MagicDNS, HTTPS
  certificates and the `funnel` node attribute in the tailnet policy).
  Then set `BETTER_AUTH_URL` to that address, add it to `KADENCE_DEV_HOSTS`,
  and **sign in to Kadence through that address**, not `localhost`: the
  connect flow's cookie is set on the address the rider starts from, and
  the provider sends the rider back to `BETTER_AUTH_URL`. Starting on one
  and landing on the other fails with "the connection took too long or
  got mixed up". The plain tailnet name (`tailscale serve`) is reachable
  only inside the tailnet and cannot receive webhooks.

Also run the migrations after pulling this change (`pnpm db:migrate`
locally; Coolify's `migrate` service does it on deploy): `drizzle/0010`
allows `polar` as a device and as an activity's source.

## 2. Garmin (Connect Developer Program)

1. **Apply.** The program is at
   <https://developer.garmin.com/gc-developer-program/overview/>. Garmin's
   FAQ says it is free, for business use only, and that Garmin confirms an
   application within two business days; approval is required. The
   request goes through Garmin's developer contact form
   (<https://www.garmin.com/en-US/forms/developercontactus/>). The adapter
   was written while onboarding was reported paused in 2026; the program
   page read on 2026-09-27 does not say either way, so check it when
   applying. Ask for the **Activity API** (activity files) and, to send
   sessions, the **Training API**.
2. **Once approved**, create an app in Garmin's developer portal and note
   its consumer key and secret (OAuth 2.0 with PKCE).
3. **Register** the redirect URL above. In the portal's endpoint
   configuration, turn on **Activity Files** as a _ping_ notification and
   **Deregistrations**, both to the Garmin webhook URL above. Kadence reads
   the `callbackURL` in the ping and fetches the FIT file with the rider's
   token; other summary types are ignored. (The exact names in the portal
   are in Garmin's partner documentation, which is only available after
   approval.)
4. **Set** `GARMIN_CLIENT_ID` and `GARMIN_CLIENT_SECRET`.

Garmin does not sign its notifications; what that means is written at
`verifyWebhook` in `src/modules/devices/garmin.ts`.

## 3. Wahoo (Cloud API)

1. **Apply.** Create an account and an application at
   <https://developers.wahooligan.com>. A new app runs in _sandbox_ at once,
   with low rate limits (Wahoo's reference: 25 requests per 5 minutes, 100
   an hour, 250 a day) — enough to test with a few riders. _Production_
   needs a review by Wahoo before launch.
2. **Scopes.** Kadence asks for `user_read`, `workouts_read`,
   `offline_data`, `plans_write` and `workouts_write`; `offline_data` is
   what makes webhooks arrive when the rider is not in Kadence.
3. **Register** the redirect URL above. In the app's webhook settings,
   enable webhooks, set the Wahoo webhook URL above, and choose a **webhook
   token**: `openssl rand -hex 24`. Wahoo includes it in every webhook, and
   Kadence refuses any webhook without it.
4. **Set** `WAHOO_CLIENT_ID`, `WAHOO_CLIENT_SECRET` and
   `WAHOO_WEBHOOK_TOKEN` (the same token, at least 16 characters).

## 4. Polar (AccessLink API v3)

Polar Electro is a Finnish company, and AccessLink is self-service: any
Polar Flow user can create a client, under Polar's AccessLink Limited
License Agreement. No approval step is described in Polar's documentation.

1. **Create the client** at <https://admin.polaraccesslink.com>, signed in
   with a Polar Flow account. Fill in the application details, register the
   Polar redirect URL above, and write down the **client id** and
   **secret**.
2. **Set** `POLAR_CLIENT_ID` and `POLAR_CLIENT_SECRET`, and deploy (or
   restart `pnpm dev`). This has to happen before step 3: Kadence answers
   Polar's ping only when the client is configured.
3. **Create the webhook** — once per installation; AccessLink allows one
   per client. AccessLink first pings the URL and creates the webhook only
   if Kadence answers 200:

   ```sh
   curl -sS -u "$POLAR_CLIENT_ID:$POLAR_CLIENT_SECRET" \
     -H 'Content-Type: application/json' -H 'Accept: application/json' \
     -X POST https://www.polaraccesslink.com/v3/webhooks \
     -d '{"events":["EXERCISE"],"url":"https://kadence.haij.dk/api/devices/polar/webhook"}'
   ```

   The answer contains `signature_secret_key`. **Save it now**: Polar
   shows it only this once. (Lost it? Delete the webhook with
   `DELETE /v3/webhooks/{id}` and create it again.)

4. **Set** `POLAR_WEBHOOK_SECRET` to that key and deploy again. Until it is
   set, every Polar notification is refused with a 401.

Check the webhook at any time with
`curl -u "$POLAR_CLIENT_ID:$POLAR_CLIENT_SECRET" https://www.polaraccesslink.com/v3/webhooks`.
Polar deactivates a webhook that has failed for seven days; reactivate it
with `POST /v3/webhooks/{id}/activate`. Kadence cannot send planned
sessions to Polar.

## 5. Where the keys go

| Variable               | Provider | Where it comes from                                         |
| ---------------------- | -------- | ----------------------------------------------------------- |
| `GARMIN_CLIENT_ID`     | Garmin   | Garmin's developer portal, after approval                   |
| `GARMIN_CLIENT_SECRET` | Garmin   | Garmin's developer portal, after approval                   |
| `WAHOO_CLIENT_ID`      | Wahoo    | developers.wahooligan.com                                   |
| `WAHOO_CLIENT_SECRET`  | Wahoo    | developers.wahooligan.com                                   |
| `WAHOO_WEBHOOK_TOKEN`  | Wahoo    | chosen by you, and entered in Wahoo's portal too            |
| `POLAR_CLIENT_ID`      | Polar    | admin.polaraccesslink.com                                   |
| `POLAR_CLIENT_SECRET`  | Polar    | admin.polaraccesslink.com                                   |
| `POLAR_WEBHOOK_SECRET` | Polar    | `signature_secret_key` from creating the webhook (step 4.3) |

- **Locally**: in `.env` (see `.env.example`).
- **In production**: Coolify → Environment Variables. `docker-compose.yml`
  forwards each of these to the app container; a variable that is not
  forwarded there never reaches Kadence (docs/deploy.md, step 2).

A client id and its secret go together: Kadence refuses to start with only
one of them, and names the missing half. A webhook token or secret without
its client id is refused the same way. Keys are secrets: never commit
them.

## 6. Testing that it works

1. **The page.** As a rider, open Settings → Devices. Each provider with
   keys shows "Not connected" and a connect button, not "Not set up here".
2. **The webhook is reachable.** From outside the tailnet (a phone on
   mobile data will do), an unsigned request must be refused, which proves
   the route is reachable and verifying:

   ```sh
   curl -i -X POST -H 'Content-Type: application/json' -d '{}' \
     https://kadence.haij.dk/api/devices/polar/webhook   # 401
   ```

   The same for `wahoo` answers 401. A 404 means the provider name in the
   path is wrong; no answer at all means the address is not public.

3. **Connect.** As a rider, press connect, say yes at the provider, and
   land back on the devices page with "connected". A red message names
   what went wrong: most often a redirect URL that does not match the one
   registered, or signing in on a different address than
   `BETTER_AUTH_URL`.
4. **A ride.** Save a short ride on the device and let it sync to the
   provider's app (Garmin Connect, the Wahoo app, Polar Flow). Once the
   provider has sent its notification, the devices page shows "Last
   fetched …" and the ride is in the calendar, on the planned session it matches. Only rides saved
   after connecting come in; older ones are uploaded as FIT files.
5. **When a ride does not come in**, the devices page says why in words
   (could not be fetched, could not be read, connect again). The server
   log has a line starting `device webhook:` with the provider and a short
   code, never a token or a payload. For Polar: a 401 on every
   notification means `POLAR_WEBHOOK_SECRET` is missing or wrong; a
   failed connect with a 403 from Polar usually means the rider has not
   accepted Polar Flow's mandatory consents — they open Polar Flow and
   accept them, then connect again.

## 7. What a rider does

1. Sign in to Kadence as the rider (a coach or a parent cannot connect a
   rider's device — the database refuses it).
2. Settings → Devices (Indstillinger → Enheder), press **Connect Garmin**,
   **Connect Wahoo** or **Connect Polar**.
3. Sign in at the provider and allow Kadence access.
4. Back in Kadence, the card says connected. From then on, every ride
   synced to the provider's app lands in Kadence by itself. With Wahoo or
   Garmin, the rider or the coach can also send a planned bike session to
   the device from the session in the calendar.
5. To stop, press **Disconnect**. Kadence tells the provider and deletes
   its keys; rides already fetched stay.
