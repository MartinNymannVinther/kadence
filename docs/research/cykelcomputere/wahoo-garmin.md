# Wahoo ELEMNT and Garmin Edge for Kadence: WiFi without a phone, third-party software, and the products (October 2026)

All web pages were read on 2026-10-12 unless another date is given. "Via search" means the claim comes from a search-engine summary of the page, not from reading the page itself. That is weaker evidence. Facts already settled in `docs/wahoo-og-garmin.md` (2026-10-11), `docs/research/workouts-to-devices.md` and `docs/research/garmin-without-partner-access.md` were not researched again; they are only cited where needed and marked "[Kadence note]". Nothing was tried on a device or an account.

## Q1. Can Wahoo ELEMNT send rides out and take planned workouts in over its own WiFi for a third-party platform, with no phone or computer in between? What does the Cloud API offer today, what do Wahoo's terms say, and can a third party run its own software on an ELEMNT?

### Takeaway

Yes, in both directions, once the rider has done a one-time setup in the Wahoo app. ACE, BOLT 3 and ROAM 3 upload finished rides to Wahoo's cloud over saved WiFi and pull planned workouts (up to today plus six days) from it, with no phone present. The Cloud API then sends the ride to a third party by webhook with a FIT file URL, and accepts plans and workouts from it, including PUT and DELETE on plans. The API is free today and has no documented cap on users. But it needs Wahoo's review for production, Wahoo's EU terms still require users to be 18, and the data is processed in the US. No SDK or app platform lets a third party put its own software or data field on an ELEMNT.

### Cited Findings

**WiFi on the device itself (ACE, BOLT 3, ROAM 3)**

- Wahoo's support article "Upload and share a completed ride from ELEMNT ACE, BOLT 3 and ROAM 3" (updated 2026-08-11) describes two upload methods: Bluetooth through the Wahoo app, or "Wi-Fi Direct to Wahoo Cloud", which uploads without a phone. It requires "an active connection between the ELEMNT and a saved Wi-Fi network". The rider chooses Workouts > Sync on the device, and this syncs "all completed ride data, routes, and planned workouts". — [Wahoo support 22710510686098 (Zendesk API)](https://support.wahoofitness.com/api/v2/help_center/en-us/articles/22710510686098.json)
- The same article says auto-sharing to partner apps (Strava, TrainingPeaks) "is toggled off by default" and is switched on per service under Settings > Authorized apps. According to the fetched summary, apps the rider authorised through the partner's own interface upload automatically (summarised, not quoted verbatim). — [Wahoo support 22710510686098](https://support.wahoofitness.com/api/v2/help_center/en-us/articles/22710510686098.json)
- Wahoo's article "Planned workouts with ELEMNT ACE, BOLT 3 and ROAM 3" (updated 2026-07-15) says that when the ELEMNT is on a 2.4 or 5 GHz WiFi network, the rider picks "SYNC" in the Workouts menu and sees "SYNCING", then "Synced All". The number of days depends on the provider: TrainingPeaks free accounts get "today's" workout; TrainerRoad gets "today's + the next 3 days"; SYSTM and TrainingPeaks paid accounts get "Today's workout + the next 6 days of workouts". "Only one workout can be synced at a time from the app via Bluetooth", so several days need WiFi. The Wahoo app is needed for the initial setup that links the workout provider; after a WiFi sync, the phone is not needed to ride the workouts. — [Wahoo support 22710662013458 (Zendesk API)](https://support.wahoofitness.com/api/v2/help_center/en-us/articles/22710662013458.json)
- The older article for the first-generation ELEMNT says the same: "If your ELEMNT is connected to your home or work WiFi … select 'sync'". It also says the ELEMNT app is needed to link the planned-workout provider (via search). — [Wahoo support 115001223770](https://support.wahoofitness.com/hc/en-us/articles/115001223770-Planned-Workouts-ELEMNT)
- DC Rainmaker (2025-04-10): all three current models (ACE, ROAM 3, BOLT 3) support WiFi for automatic activity upload. — [DC Rainmaker, BOLT 3 & ROAM 3 hands-on](https://www.dcrainmaker.com/2025/04/wahoo-bolt3-roam-3-hands-on-details-comparison-to-ace.html)

**The Wahoo Cloud API today (cloud-api.wahooligan.com, changelog up to 2026-10-09)**

- Scopes: `email`, `user_read`, `user_write`, `workouts_read`, `workouts_write`, `offline_data` ("Receive data even when the app is closed"), `plans_read`, `plans_write`, `routes_read`, `routes_write`, `power_zones_read`, `power_zones_write`. "If the `user_read` scope is not included the API will return a 403 response." — [Wahoo Cloud API reference](https://cloud-api.wahooligan.com/)
- Webhook: the single event type is `workout_summary`, sent as an HTTP POST with `Content-Type: application/json`. The payload carries `event_type`, `webhook_token`, `user.id`, summary figures (power_avg, cadence_avg, distance_accum and others) and `"file": { "url": "https://..." }` pointing to the FIT file. — [Wahoo Cloud API reference](https://cloud-api.wahooligan.com/)
- Plans: `POST /v1/plans`, `GET /v1/plans`, `GET /v1/plans/:id`, **`PUT /v1/plans/:id`, `DELETE /v1/plans/:id`**, and `GET /v1/workouts/:workout_id/plans`. "In order for a plan to be displayed in the ELEMNT app and bike computer/RIVAL, the plan must be attached to a workout that is scheduled for the current day through six days from the current day." A plan file is JSON with a header (name, version, description, FTP, threshold heart rate) and intervals whose targets can be FTP, threshold HR, RPM or watts. — [Wahoo Cloud API reference](https://cloud-api.wahooligan.com/); format PDF of 2024-03-26 per [Kadence note](https://cloud-api.wahooligan.com/docs/plan-json-format.pdf)
- Workouts: `POST /v1/workouts` requires `workout[name]`, `workout[workout_token]`, `workout[workout_type_id]`, `workout[starts]` and `workout[minutes]`. `plan_id`, `route_id` and `workout_summary` are optional. Type ids run 0–71 plus 255. — [Wahoo Cloud API reference](https://cloud-api.wahooligan.com/)
- "Wahoo Plans" (Wahoo's own SYSTM plans, not a third party's) need a separate entitlement requested at partnerships@wahoofitness.com. Their files can be fetched only "3 days before through 1 day after" the start, and the user needs an active subscription. — [Wahoo Cloud API reference](https://cloud-api.wahooligan.com/)
- Rate limits: sandbox 25 per 5 min / 100 per hour / 250 per day; production 200 / 1,000 / 5,000. "Requests to authenticate, refresh tokens, and download files do not count against rate limits." — [Wahoo Cloud API reference](https://cloud-api.wahooligan.com/)
- Approval: apps are set to Sandbox or Production. Sandbox allows testing at once at low throughput. "Production apps will have to go through a review process with Wahoo Fitness". — [Wahoo Cloud API reference](https://cloud-api.wahooligan.com/). Conflict: Kadence's 2026-10-11 note saw a sandbox application in the portal shown as "pending approval", and found that a sandbox app cannot later be promoted to production. — [Kadence note, docs/wahoo-og-garmin.md §6]
- Tokens: an access token lasts 2 hours and is renewed with the refresh token. "Access tokens that have not been revoked will be automatically deleted 60 days after creation". "Applications will be limited to 10 unrevoked access tokens per user starting January 1, 2026." — [Wahoo Cloud API reference](https://cloud-api.wahooligan.com/)
- Changelog: 2026-10-09 "Added a note to the Authorization section explaining that scopes and other application settings can be changed on the Applications page of the developer portal". 2025-10-06 "Added the Wahoo Plans section; Added the Get Plans for Workout endpoint; Added the Multiple Plans documentation to the Workouts section; Added the plan_ids attribute to workout objects". Earlier entries are dated 2025-07-22, 2025-06-11, 2025-04-01 and 2025-03-04. — [Wahoo Cloud API reference](https://cloud-api.wahooligan.com/)
- Fees and limits in the Wahoo API Agreement: "Access to and use of the Wahoo API Materials and Wahoo Platform are currently provided at no charge. Wahoo reserves the right to charge you … in the future". Wahoo may "create, modify and enforce controlling mechanisms such as a rate limiting structure". A developer "may not share your API Token with any other developer … or use it for more than one application or service". Wahoo may revoke "if Wahoo objects to your use". Cached Wahoo data must be deleted "within forty-eight (48) hours" after a request or after termination. No disclosing, selling or licensing Wahoo Data to third parties without permission and user consent. A sole-proprietor developer must be "at least 18 years of age". Georgia (US) law applies. — [Wahoo API Agreement (EU site)](https://eu.wahoofitness.com/wahoo-api-agreement)
- No cap on the number of users and no partner fee appear in the API reference or the agreement. — [Wahoo Cloud API reference](https://cloud-api.wahooligan.com/); [Wahoo API Agreement](https://eu.wahoofitness.com/wahoo-api-agreement)

**Terms and privacy (current versions on 2026-10-12)**

- The EU Terms of Service still show effective date 2023-12-05: "you represent and warrant that you: (i) are at least 18 years of age". "You will only maintain one Service account at any given time". "Accounts for the Services are for a single user. Any multiple-party use is prohibited." The contracting party is Wahoo Fitness LLC and its subsidiaries and affiliates. No parental-consent route is described. — [Wahoo EU Terms of Service](https://eu.wahoofitness.com/terms-of-service)
- The EU Privacy Policy still shows effective date 2024-03-28: "Our website is not intended for children under 16 years of age." Wahoo's headquarters are in the United States, and personal information "may be collected, transferred to and stored by us and our affiliates outside … the European Economic Area". The transfer mechanism is only "legally permitted data transfer mechanisms"; neither SCCs nor the Data Privacy Framework is named. The EU address in the imprint is a VAT fiscal representative in Dordrecht (NL), not a data-protection representative. — [Wahoo EU Privacy Policy](https://eu.wahoofitness.com/privacy-policy)

**Third-party software on an ELEMNT**

- The June 2026 firmware for "V3 Elemnt bike computers" added native support for four bio-sensors (Tymewear VitalPro, CORE, Flowbio, hDrop) through Wahoo's own firmware. The article mentions no developer platform, SDK or third-party app ecosystem. — [BikeRadar, 2026-06-02, Paul Norman](https://www.bikeradar.com/news/wahoo-elemnt-firmware-update-2026); [Bicycle Retailer press release, 2026-05-29](https://www.bicycleretailer.com/announcements/2026/05/29/wahoo-updates-elemnt-computers-native-next-generation-sensor-integration)
- Wahoo's own help pages describe third-party integration only through the cloud: authorised app partners for planned workouts, routes and ride upload (via search). — [Wahoo App Partners](https://support.wahoofitness.com/hc/en-us/articles/23022859474962-Wahoo-App-Partners); [Authorize a 3rd party app](https://support.wahoofitness.com/hc/en-us/articles/115000504304-Authorize-a-3rd-party-app-for-route-planned-workout-sync-or-completed-ride-upload-ELEMNT)
- DC Rainmaker's BOLT 3/ROAM 3 hands-on (2025-04-10) does not mention any third-party app or data-field platform. — [DC Rainmaker](https://www.dcrainmaker.com/2025/04/wahoo-bolt3-roam-3-hands-on-details-comparison-to-ace.html)

**Wahoo news 2025–2026 that matter here**

- 2025-04-10: BOLT 3 and ROAM 3 launched as a hardware refresh "to allow them to have a single software platform" with the ACE (Dec 2024). The ELEMNT Companion app was replaced by the Wahoo app. — [DC Rainmaker](https://www.dcrainmaker.com/2025/04/wahoo-bolt3-roam-3-hands-on-details-comparison-to-ace.html)
- 2025-07-04: Wahoo acquired Rewire Fitness, a readiness/recovery app (PitchBook profile via search; not read). — [PitchBook, Rewire Fitness](https://pitchbook.com/profiles/company/434068-48)
- 2026-04-24: COROS and Wahoo partnership. Two-way sync of completed activities between the COROS and Wahoo platforms now. "Planned structured workouts" and "planned routes" are to sync later. DC Rainmaker does not say whether it runs on the public Cloud API. — [DC Rainmaker, 2026-04-24](https://www.dcrainmaker.com/2026/04/coros-wahoo-partnership.html); [the5krunner, 2026-04-24](https://the5krunner.com/2026/04/24/coros-wahoo-partnership/)
- From 2026-08-12 the Wahoo app has three tiers. Base is free and covers device pairing, activity sync, route planning and live tracking. Core costs USD 4.99 a month or 49.99 a year. Pro went from USD 14.99/149.99 to 17.99/179.99 (via search). — [the5krunner, 2026-08-12](https://the5krunner.com/2026/08/12/wahoo-app-subscription-tiers/); [BikeRadar](https://www.bikeradar.com/news/wahoo-app-new-subscription-tiers). Cycling Weekly lists "some metrics are subscription only" against the BOLT 3. — [Cycling Weekly buyer's guide, modified 2026-09-23](https://www.cyclingweekly.com/group-tests/cycling-gps-units-buyers-guide-181254)
- Ownership: Rhône took majority ownership in June 2021. In 2023, after banks had called the debt, founder Chip Hawkins bought the company back with Rhône Group, David Wichmann (Jory Capital) and RZC Investments, and "eliminated all debts". No ownership change in 2025–2026 was found. — [DC Rainmaker, 2023-05](https://www.dcrainmaker.com/2023/05/fitness-founder-company.html); [Velo](https://velo.outsideonline.com/road/road-racing/wahoo-eliminates-all-debts/)

### Inferences

- With an approved app, Kadence could run the full loop over WiFi with no phone per ride. The ride goes ELEMNT → WiFi → Wahoo cloud → `workout_summary` webhook with `file.url` → Kadence. The session goes Kadence `POST /v1/plans` + `POST /v1/workouts` (today to +6 days) → Wahoo cloud → ELEMNT WiFi "Sync". The phone is needed once, for setup in the Wahoo app. Whether WiFi networks can be added without the app was not checked.
- The API has `PUT` and `DELETE` on plans. Kadence's earlier note says the dormant adapter "can neither update nor delete" (docs/wahoo-og-garmin.md §6). That is a gap in Kadence's code, not in Wahoo's API.
- The six-day window means a weekly "send this week's sessions" fits Wahoo exactly, but sessions more than six days ahead will not show on the ELEMNT until they come into the window.
- Wahoo's age rule is unchanged: 18+ in the EU terms, privacy policy "not intended" for under-16s, data in the US. For U17/U19 riders, the Wahoo route still depends on Wahoo's answer about parent accounts (A-04 in Kadence's backlog).
- Wahoo is moving toward subscriptions and its own platform (Core/Pro tiers, COROS deal) while keeping the API free "currently". The agreement lets Wahoo add fees and change limits at will.
- An ELEMNT is closed to third-party code: integrations arrive only as Wahoo firmware or through the cloud. Of the three platforms in Kadence's notes, only Garmin (Connect IQ) and Hammerhead Karoo (extensions, sideloading) let a third party run software on the device.

### Gaps

- Whether an ELEMNT uploads by itself over WiFi when a ride is saved, or only when the rider presses Sync. The 2026-08-11 article as summarised describes pressing Workouts > Sync; Wahoo's "auto upload" wording was not found verbatim.
- Whether WiFi networks can be added on the ELEMNT itself or only from the Wahoo app.
- Whether `PUT /v1/workouts/:id` and `DELETE /v1/workouts/:id` exist (the plan endpoints were confirmed; the workout endpoints were not read in full).
- How long Wahoo's production review takes, and whether it limits the number of users. Nothing is published.
- Whether the COROS integration uses the public Cloud API, and whether Wahoo plans a developer/app platform for ELEMNT. Nothing found; "none found" is weak evidence.
- Whether Wahoo's 2026 subscription changes came with new EU terms. The EU ToS page still says 2023-12-05, so the subscription terms may sit on another page that was not read.

## Q2. Garmin Edge 540/550/840/850/1050 (and cheaper models): which have WiFi, does a Connect IQ app's web request go over the Edge's WiFi without a phone, what is new in Connect IQ in 2026, and has the developer programme moved since the TrainingPeaks purchase?

### Takeaway

Edge 540, 550, 840, 850 and 1050 have WiFi. Edge 130 Plus and Explore 2 show no WiFi in their manuals. Over WiFi an Edge uploads rides to Garmin Connect and receives workouts and plans, but only those in the rider's Garmin Connect calendar. For a third party that means the paused partner programme. A Connect IQ app can make web requests over WiFi as well as through the phone. On Edge devices, experienced developers report WiFi is up when the unit is on and not recording, and Garmin staff advise `SyncDelegate`/sync mode for WiFi work. Background use without a phone is unproven. Connect IQ 9 (2026) lets apps read zones and FTP and adapt workout steps, but still gives no access to FIT files. The developer programme remains paused with no timeline.

### Cited Findings

**WiFi per model**

- Edge 550 manual, "Wi-Fi Connectivity Features": activity uploads ("Automatically sends your activity to your Garmin Connect account as soon as you finish recording the activity"); software updates; "Workouts and training plans: You can browse for and select workouts and training plans on the Garmin Connect website. The next time your device has a Wi-Fi connection, the files are sent to your device"; map updates. — [Edge 550 Owner's Manual](https://www8.garmin.com/manuals/webhelp/GUID-5951C9F9-0E2E-4ECC-A508-6F93D026685D/EN-US/GUID-E17F9BDA-E382-414B-8198-7ED9C12BF63E.html)
- The Edge 1050 manual has the same four features and the settings Enable, Auto Upload ("upload activities automatically over a known wireless network"), Wi-Fi Sync and Add Network (via search). — [Edge 1050 Owner's Manual](https://www8.garmin.com/manuals/webhelp/GUID-08ACA9FC-DEE6-4C8D-8A95-F62181C512E9/EN-US/GUID-E17F9BDA-E382-414B-8198-7ED9C12BF63E.html)
- The Edge 540 manual has a "Wi-Fi Connectivity Features" page (HTTP 200, read) and the same features. Before WiFi can be set up, "You must connect your device to the Garmin Connect app on your phone or to the Garmin Express application on your computer" (via search). — [Edge 540 Owner's Manual](https://www8.garmin.com/manuals/webhelp/GUID-17DE938E-466A-4746-BDBF-7A6FC1B3A32C/EN-US/GUID-E17F9BDA-E382-414B-8198-7ED9C12BF63E.html)
- Edge 850: DC Rainmaker says both 550 and 850 sync activities "via Bluetooth or WiFi" (2025-09-09). — [DC Rainmaker Edge 850 review](https://www.dcrainmaker.com/2025/09/garmin-edge-850-in-depth-review-brilliance.html). Edge 840: WiFi on both 540 and 840; typing a WiFi password on the button-only 540 means scrolling the alphabet. — [Cyclist's Hub, 540 vs 840](https://www.cyclistshub.com/garmin-edge-540-vs-edge-840/)
- Edge Explore 2 and Edge 130 Plus: the complete topic lists of their web manuals (`suitehelp_topic_list.html`) contain no Wi-Fi topic, and the "Wi-Fi Connectivity Features" topic URL returns 404 for both. The Edge 540 list does contain "Wi-Fi Connectivity", "Wi-Fi Connectivity Features" and "Wi-Fi Settings". — [Explore 2 topic list](https://www8.garmin.com/manuals/webhelp/GUID-E67DE53E-5B08-4903-9767-F58973BC1829/EN-US/suitehelp_topic_list.html); [130 Plus topic list](https://www8.garmin.com/manuals/webhelp/GUID-0E629F64-4ADF-459F-8A85-1E28685E4ED4/EN-US/suitehelp_topic_list.html); [540 topic list](https://www8.garmin.com/manuals/webhelp/GUID-17DE938E-466A-4746-BDBF-7A6FC1B3A32C/EN-US/suitehelp_topic_list.html)

**Connect IQ web requests over the Edge's own WiFi**

- Garmin API docs (Toybox.Communications): `makeWebRequest` works when the device is "connected to WiFi or a mobile device over Bluetooth", with Garmin Connect Mobile bridging the phone path. `checkWifiConnection()` reports statuses including low battery, no stored access points, user disabled, battery saver, stealth mode, airplane mode and powered down (API 3.2.0+). "If HTTP_RESPONSE_CONTENT_TYPE_FIT or HTTP_RESPONSE_CONTENT_TYPE_GPX is given, the system will attempt to download and parse a FIT or GPX file and store the contained data in the device". `startSync()`/`startSync2()` exit the app and "launch it in sync mode" (API 3.1.0+). Error `-104 BLE_CONNECTION_UNAVAILABLE` means no phone. — [Connect IQ API: Toybox.Communications](https://developer.garmin.com/connect-iq/api-docs/Toybox/Communications.html)
- Garmin forum thread "HTTP request over device Wi-Fi specification" (posts from about 2020 to about Feb 2026). jim_m_58, a long-time developer: "on at least some edge devices, it tries to establish wifi as soon as you turn it on … but will drop wifi as soon as you start recording." Garmin staff (Travis.ConnectIQ): "If you want to use WiFi, you really should be using the Communications.SyncDelegate." — [Garmin forum 251935](https://forums.garmin.com/developer/connect-iq/f/discussion/251935/http-request-over-device-wi-fi-specification/1936330)
- Thread "Confirming WiFi Connectivity before makeWebRequest" (undated): "On a watch, wifi is rarely connected and a simple makeWebRequest does not cause wifi to connect", whereas "on edge devices, wifi is on if you aren't recording an activity." — [Garmin forum 338561](https://forums.garmin.com/developer/connect-iq/f/app-ideas/338561/confirming-wifi-connectivity-before-makewebrequest)
- Earlier Kadence research, from Garmin's "Downloading content" topic: a workout download needs the phone with Garmin Connect over Bluetooth "or the Edge's own Wi-Fi in sync mode". Garmin's phone app does not follow redirects. The import does not happen during a recorded activity. — [Kadence note, workouts-to-devices.md §2](https://developer.garmin.com/connect-iq/core-topics/downloading-content/) (the page rendered empty on 2026-10-12 and was not re-read)

**Connect IQ in 2026**

- Connect IQ 9 (the5krunner, 2026-06-11, updated 06-29) adds six things. Apps can generate QR codes. "Apps can now read the heart rate zones, power zones, FTP, and sport profile already stored on your watch". "Apps can now adapt a structured workout in real time, adjusting steps programmatically as the session progresses", with "new step duration types". Text input grows from 32 to 256 characters, the phone link is faster, and secure sensors can be tested without hardware. Edges with CIQ 9: 1040/1040 Solar, 540/840 (incl. Solar), 550/850, 1050, MTB. No API names are given, and nothing about reading activity data, FIT files or WiFi. — [the5krunner, Connect IQ 9](https://the5krunner.com/2026/06/11/garmin-connect-iq-9/)
- The SDK is at 9.2.0, updated 2026-10-06 (via search; matches Kadence's 2026-10-11 note). — [Connect IQ SDK](https://developer.garmin.com/connect-iq/)
- Already known [Kadence note]: `DataField.setWorkout` (API 5.2.0) loads a workout into a running activity; Connect IQ cannot read FIT files.

**Developer programme after the TrainingPeaks purchase**

- the5krunner (2026-09-14, updated 09-23): Garmin told developers of a "significant redesign and modernisation of the API program and related processes" with no timeline, and the public page says "Stay tuned for more updates on the program." The TrainingPeaks/TrainHeroic acquisition (2026-07-22) came "several months after the developer pause began". Strava sued Garmin in October 2025 over API terms and attribution rules introduced in July 2025, and dropped the suit three weeks later. Hevy was rejected and pointed to Connect IQ. — [the5krunner, 2026-09-14](https://the5krunner.com/2026/09/14/garmin-developer-api-access-paused/)
- Several aggregator blogs in 2026 repeat "no projected re-opening date", "no waitlist" (via search). — [Terra blog](https://tryterra.co/blog/garmin-connect-developer-program-pause); [Garmin forum 436226](https://forums.garmin.com/developer/connect-iq/f/discussion/436226/connect-developer-program-access-form-unavailable-anyone-got-through-recently)
- No announcement of reopening was found after 2026-07-22.

**Hardware coming**

- A Garmin filing (model A04831, SIRIM Malaysia, dated 2026-04-22) points to an Edge 1060 or 1050 successor. It is now expected in Q4 2026 and was unannounced as of October 2026 (via search). An Edge Explore 3 is also rumoured. An "Edge 150" leaked in mid-2025 as a 130 Plus successor but has not surfaced. — [the5krunner, 2026-06-02](https://the5krunner.com/2026/06/02/garmin-edge-1060-regulatory-filing/); [the5krunner Garmin Edge page, 2026-08-05](https://the5krunner.com/garmin-edge/)

### Inferences

- For a third party, the Edge's WiFi "workouts in" feature runs only through Garmin Connect's calendar, which means the paused Training API. The only route open to Kadence is a Connect IQ app fetching from Kadence's own server.
- Such an app, opened on an Edge 540/550/840/850/1050 at home before a ride (not recording, on known WiFi), probably gets the workout over WiFi without the phone. A background fetch overnight is less certain: Garmin staff point to `SyncDelegate`/sync mode for WiFi, and nothing found shows that Edges run a Connect IQ sync delegate. This must be tried on a device.
- On an Edge 130 Plus or Explore 2 there is no WiFi, and neither supports `PersistedContent.Workout` [Kadence note], so Connect IQ sessions out are not possible on the two cheapest Garmins.
- Connect IQ 9's zone/FTP reading and adaptive steps would let a Kadence app check the rider's FTP on the device against Kadence's, or adjust a step live. Neither helps get the ride file out.

### Gaps

- No primary Garmin statement on whether `makeWebRequest` in a Connect IQ background service on an Edge uses WiFi when no phone is paired; no Edge-specific test report was found.
- Whether Edge devices support `Communications.SyncDelegate` / `startSync2()` for non-media apps.
- The API names behind Connect IQ 9's "smarter workout steps" and zone access; the5krunner gives none, and Garmin's API docs for them were not read.
- WiFi on the Edge 1040 was not re-checked in this round.
- No news after 2026-07-22 about the developer programme, either way.

## Q3. How good are the current Wahoo and Garmin bike computers as products (October 2026), and what do they cost in Denmark?

### Takeaway

On Pricerunner.dk on 2026-10-12 the cheapest Danish prices were: Wahoo BOLT 3 DKK 1,991, ROAM 3 2,502, ACE 2,755; Garmin Edge 540 1,999, 840 2,712, 550 2,799, 850 3,195, 1040 3,259, 1050 3,999, Explore 2 1,645. The Edge 130 Plus is not listed. Reviewers in 2025–2026 rate the Edge 850 the best Garmin (bright screen, refined software) but criticise its 10–12 h battery. The BOLT 3 is called the best-value pick, and the ROAM 3 the most balanced Wahoo. Garmin is seen as deeper and more reliable, Wahoo as simpler but buggier at the 2024–25 platform launch.

### Cited Findings

**Danish prices (lowest price on Pricerunner.dk, read 2026-10-12, extracted from the result page data)**

| Model                  | Lowest DKK | Pricerunner product page                                                                                                       |
| ---------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Wahoo ELEMNT BOLT 3    | 1,991      | [link](https://www.pricerunner.dk/pl/692-3407607621/Cykeltilbehoer/Wahoo-ELEMNT-Bolt-3-GPS-Cycling-Computer-Sammenlign-Priser) |
| Wahoo ELEMNT ROAM 3    | 2,502      | [link](https://www.pricerunner.dk/pl/692-3402241688/Cykeltilbehoer/Wahoo-Elemnt-Roam-3-GPS-Cykelcomputer-Sammenlign-Priser)    |
| Wahoo ELEMNT ACE       | 2,755      | [link](https://www.pricerunner.dk/pl/692-3378464047/Cykeltilbehoer/Wahoo-Elemnt-ACE-GPS-Cycling-Computer-Sammenlign-Priser)    |
| Garmin Edge 550        | 2,799      | [link](https://www.pricerunner.dk/pl/692-3433899772/Cykeltilbehoer/Garmin-Edge-550-GPS-Cykelcomputer-Sammenlign-Priser)        |
| Garmin Edge 850        | 3,195      | [link](https://www.pricerunner.dk/pl/692-3433590416/Cykeltilbehoer/Garmin-Edge-850-GPS-Cykelcomputer-Sammenlign-Priser)        |
| Garmin Edge 1050       | 3,999      | [link](https://www.pricerunner.dk/pl/692-3315584484/Cykeltilbehoer/Garmin-Edge-1050-Sammenlign-Priser)                         |
| Garmin Edge 540        | 1,999      | [link](https://www.pricerunner.dk/pl/692-3205855479/Cykeltilbehoer/Garmin-Edge-540-Sammenlign-Priser)                          |
| Garmin Edge 840        | 2,712      | [link](https://www.pricerunner.dk/pl/692-3205842926/Cykeltilbehoer/Garmin-Edge-840-Sammenlign-Priser)                          |
| Garmin Edge 840 Solar  | 3,298      | [link](https://www.pricerunner.dk/pl/692-3206191677/Cykeltilbehoer/Garmin-Edge-840-Solar-Sammenlign-Priser)                    |
| Garmin Edge 1040       | 3,259      | [link](https://www.pricerunner.dk/pl/692-3201607728/Cykeltilbehoer/Garmin-Edge-1040-Standard-Sammenlign-Priser)                |
| Garmin Edge 1040 Solar | 3,798      | [link](https://www.pricerunner.dk/pl/692-3201607562/Cykeltilbehoer/Garmin-Edge-1040-Solar-Sammenlign-Priser)                   |
| Garmin Edge Explore 2  | 1,645      | [link](https://www.pricerunner.dk/pl/692-3202032590/Cykeltilbehoer/Garmin-Edge-Explore-2-Sammenlign-Priser)                    |
| Garmin Edge MTB        | 2,179      | [link](https://www.pricerunner.dk/pl/692-3413443852/Cykeltilbehoer/Garmin-Edge-MTB-Cykelcomputer-Sammenlign-Priser)            |
| Garmin Edge 130 Plus   | not listed | searches "edge 130 plus" and "garmin edge 130" returned no 130 product                                                         |

- Two weeks earlier (2026-09-29), Kadence's note read BOLT 3 DKK 2,048 and Edge 540/550 DKK 2,308/2,888 at Danish shops. — [Kadence note, garmin-without-partner-access.md §6]
- Launch prices in the US: Edge 850 USD 599, Edge 550 USD 499 (2025-09-09). — [DC Rainmaker Edge 850 review](https://www.dcrainmaker.com/2025/09/garmin-edge-850-in-depth-review-brilliance.html)

**Line-up status**

- Garmin, according to the5krunner (2026-08-05): current models are Edge 1050, 1040 Solar, 850, 550, MTB, Explore 2 and 130 Plus ("legacy"); 540 and 840 are no longer in the range. — [the5krunner Garmin Edge page](https://the5krunner.com/garmin-edge/). Conflict on the 130 Plus: Garmin's Philippine site files it under discontinued products, and a Garmin forum thread asks "Edge 130 Plus Discontinued?" (via search). — [Garmin PH, discontinued](https://ph.garmin.com/products/discontinued/edge-130-plus/); [Garmin forum 426833](https://forums.garmin.com/sports-fitness/cycling/f/edge-130-plus/426833/edge-130-plus-discontinued)
- Wahoo: ACE (Dec 2024), BOLT 3 and ROAM 3 (April 2025); BOLT 2 and ROAM 2 are still sold in Denmark (DKK 2,314 and 2,721 on Pricerunner, above the price of the v3). — [DC Rainmaker](https://www.dcrainmaker.com/2025/04/wahoo-bolt3-roam-3-hands-on-details-comparison-to-ace.html); [Pricerunner BOLT V2](https://www.pricerunner.dk/pl/692-3200184252/Cykeltilbehoer/Wahoo-Element-Bolt-V2-Sammenlign-Priser)

**Reviewers 2025–2026**

- DC Rainmaker, Edge 850 (2025-09-09). The 850 and 550 share a 2.7" 1,000-nit transmissive LCD at 420×600. The 850 adds a touchscreen, speaker, bell, voice prompts, Garmin Pay and 64 GB (550: buttons, beeper, 32 GB). Claimed battery is 12 h (36 h saver); measured 10–12 h, about 20 h at 30% brightness, against the 840's 40–50+ h. For long rides he prefers the 840: "40% less money and 100+% more battery." The 850's screen beats the ROAM 3's when wet and in low light. — [DC Rainmaker Edge 850 review](https://www.dcrainmaker.com/2025/09/garmin-edge-850-in-depth-review-brilliance.html)
- DC Rainmaker, BOLT 3/ROAM 3 hands-on (2025-04-10). Multi-band GPS, 16M-colour screens, and BOLT/ROAM/ACE claims of 20/25/35 h. Concerns carried from the ACE: sensor dropouts, crashes, route-sync problems, ACE battery at about 50% of claim, the screen needs the backlight, the LED bars are gone, and sensors had to be re-paired after the move. The key question is whether Wahoo fixes platform-wide stability. — [DC Rainmaker](https://www.dcrainmaker.com/2025/04/wahoo-bolt3-roam-3-hands-on-details-comparison-to-ace.html)
- BikeRadar buyer's guide (Nick Clark, updated 2026-05-20):
  - Edge 850, best overall: "best-in-class screen", flagship Garmin features; pricey, battery concerns.
  - Edge 1050, "most desirable": fiddly on-device mapping, may not fit older mounts.
  - ROAM 3: excellent navigation and good battery; slow boot, touchscreen can lag.
  - ACE: "The best bike computer Wahoo has ever made"; large, heavy, rerouting unreliable.
  - BOLT 3: easy, accurate, mount included; small screen, limited settings, "no web app".
  - Edge 550: fiddly buttons, pricey, shorter battery than its predecessor.
  - Explore 2: easy and well-priced, but lacks training data for some riders.
  - Best value is the Bryton Rider 650.
    — [BikeRadar best bike computers 2026](https://www.bikeradar.com/advice/buyers-guides/best-bike-computers)
- Cycling Weekly buyer's guide (Anne-Marije Rook, modified 2026-09-23):
  - Best overall is the Hammerhead Karoo.
  - BOLT 3 is "Best value": Wahoo has a reputation for "ease of setup and bombproof software". Against it: the screen is "no match for Karoo or Edge 850", claimed battery "a little optimistic", "some metrics are subscription only", "occasionally slow to boot". About 10 h with several sensors, 15 h max. The listing's "New, larger touchscreen" contradicts its own spec line "Touchscreen: No".
  - Edge 850 is "Best Garmin": "class-leading touchscreen"; against it, it "drops connections after entering auto-sleep mode even during pausing at a coffee stop", has no solar, limited battery, and is pricey.
    — [Cycling Weekly](https://www.cyclingweekly.com/group-tests/cycling-gps-units-buyers-guide-181254)
- the5krunner (2026-08-05): on the Edge 550, "the usability gap is the single strongest argument for spending the extra £90 on the Edge 850". The Edge 1040 Solar: "Nothing in the current range matches it for battery life". — [the5krunner Garmin Edge page](https://the5krunner.com/garmin-edge/)
- the5krunner, ROAM 3 review (2025-05-28): "the best all-round ELEMNT bike computer", with realistic 20 h battery and full re-routing (via search). — [the5krunner ROAM 3 review](https://the5krunner.com/2025/05/28/wahoo-roam-3-review/)

### Inferences

- For a Danish U17–U23 road rider buying new in autumn 2026, there are three price clusters: BOLT 3 or Edge 540 at about DKK 2,000; ROAM 3, ACE, Edge 840 or 550 at DKK 2,500–2,800; Edge 850 at about DKK 3,200, and 1040/1050 at about DKK 3,300–4,000.
- The Edge 540 and 840 are end-of-line and cheaper than their successors. They have better battery life, WiFi and Connect IQ 9 support, which makes them good value while stock lasts.
- Of these computers, only the Wahoo models can bring rides into Kadence and take sessions from it over WiFi by themselves, through an approved Cloud API app. That is blocked for under-18s by Wahoo's terms. For riders under 18, no Wahoo or Garmin product gives Kadence an automatic WiFi path today without someone else's approval.
- An Edge 1060 is expected in Q4 2026, so prices of the 1050 may fall soon. This is a rumour, not announced.

### Gaps

- GPLama's 2025–2026 reviews (mostly video) were not read.
- Cycling Weekly's "Bike Computer of the Year 2026" for the ACE appeared only in a search summary and was not found on the page read. It is treated as unverified.
- Pricerunner's lowest prices are one day's reading. Stock, shop names and whether each is the full retail model (not a bundle or grey import) were not checked per offer.
- No Danish price could be found for the Edge 130 Plus. Whether Garmin Denmark still sells it is not confirmed.
- No reviewer data was found specifically on how well ELEMNT or Edge WiFi sync works in practice (reliability, speed).
