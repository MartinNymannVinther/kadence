# Strava: should Kadence integrate it? A research note

_Research read 2026-09-28 against Strava's own texts (API Agreement and API Policy at strava.com/legal, developer docs at developers.strava.com, press.strava.com, the Strava Community Hub) and, for practice, DC Rainmaker, the intervals.icu forum, TrainingPeaks' help centre and appsforstrava. Not legal advice. Everything marked **unverified** could not be confirmed against a Strava page._

**Short answer.** The line in CLAUDE.md ("Strava: its terms forbid showing a user's data to others such as a coach") still holds and has become stricter since it was written. Strava replaced its API terms on June 1, 2026 with an API Agreement and a separate API Policy. Under them, a Strava-sourced ride may be shown only to the rider, may be kept for at most seven days, may not be processed for analysis or combined with other data, and may never reach an AI model, local or hosted. Every self-hosted Kadence would also need its own registered Strava app, its own paying, adult Strava subscriber as developer, and Strava's discretionary review beyond ten riders. None of that fits Kadence's core (coach view, parent view, season-long load and records, the Monday brief, one-click self-hosting). What Strava explicitly protects is the rider's own export, which Kadence already reads (ADR 0022), and the device paths (Garmin, Wahoo, Polar) that are upstream of Strava anyway and already automatic (ADR 0018, 0020). The recommendation is option (a): no Strava API adapter, plus two small slices that make the export path easier.

---

## 1. What Strava's terms allow today

### 1.1 The documents

- **API Agreement (2026)**, effective June 1, 2026, at <https://www.strava.com/legal/api>. It incorporates by reference the **API Policy (2026)**, same date, at <https://www.strava.com/legal/api_policy>, which holds most of the substantive rules (display, storage, AI, tiers). Quote: "The Policy is incorporated by reference into, and forms part of, this Agreement." The EEA counterparty is Strava Ireland Limited.
- The predecessor was the agreement of November 11, 2024 (archived copy read via web.archive.org). The June 2026 texts are stricter in every respect that matters here.
- The rate-limits page confirms the currency: "Our API Agreement was last updated June 1, 2026."

### 1.2 Display: only to the user who provided the data

Agreement, highlights (effective June 1, 2026):

> "Strava Data provided by a specific user can only be displayed or disclosed in your Developer Application to that user. Strava Data related to other users, even if such data is publicly viewable on the Strava Platform, may not be displayed or disclosed. ... This includes not sharing a Strava user's data with other users, end users of your application, or third parties without explicit consent."

Policy §2.3 (effective June 1, 2026), with no consent exception:

> "Strava Data provided by a specific Strava user may be displayed or disclosed in your Developer Application only to that user."

Policy §6.2 extends it to any service built on the data:

> "Except for such limited caching, you may not store Strava Data, or provide or display Strava Data or any associated service, to any third party other than the Strava user using your Developer Application."

Policy §5.13 mentions consent again: "You may not use the Strava API Materials in any way that would grant anyone other than you or the applicable Strava user the right to see data related to that user without the prior express consent of that user."

Three things muddy the picture, and all three are **unverified** as to Strava's intent:

1. Policy §6.1 reads, literally: "Unless your Developer Application has an athlete capacity of 9,999 or less, you may display or disclose to an end user only the specific Strava Data related to that end user." Read as written, small apps would be exempt. It contradicts §2.3 and §6.2 and looks like a leftover of the November 2024 "Community Application" carve-out (group-activity apps under 9,999 users, classified "by Strava in its sole discretion"), which is otherwise gone from the 2026 text. Nobody should build on it.
2. Strava's press release of November 15, 2024 (updated November 19) said "the overwhelming majority of existing use cases are still allowed, including coaching platforms focused on providing feedback to users." That sentence has never appeared in an agreement. The word "coach" appears nowhere in the 2026 Agreement or Policy.
3. intervals.icu (David Tinker) announced on November 16, 2024 that Strava rides would be hidden from coaches, then on November 21, 2024, after a phone call with Strava, reported that "intervals.icu can continue to allow coaches to see their athlete's data from Strava on Intervals.icu" while followers may not. That is second-hand and oral; Tinker himself added (November 22, 2024): "if Strava doesn't like what you are doing they can withdraw API access." Strava's only on-record framing (to DC Rainmaker, November 19, 2024) was that a user's data can be viewed by others on third-party apps only "in limited scenarios where sharing is both transparent and central to the functionality of the app." Whether the coaching tolerance survives the June 2026 terms is **unverified**; no restatement was found in the 2026 Agreement, Policy, FAQ (March 16, 2026) or announcement (June 1, 2026).

Nothing anywhere, written or oral, covers a **parent** seeing a rider's Strava ride.

### 1.3 Storage: seven days

Policy §6.2 (June 1, 2026):

> "You may not retain Strava Data in your cache for longer than seven (7) days."

Policy §6.4: "you may use and retain Data only so long as necessary for the purpose for which it was originally obtained." Policy §5.5: no "accumulating Strava Data through repeated authorized API calls into a corpus, dataset, archive, or database that exceeds the operational scope of your Developer Application" and no "Persistent Index". Policy §5.7: no aggregating, caching or storing "geographic location information or other user information accessible via the Strava API, except as expressly permitted by Section 6.2."

Deletion duties: on a user's request, on revocation, on account deletion or when the developer stops, all Strava Data and personal data derived from it must be deleted within 30 days (§7.4); a deletion on Strava must be mirrored "in all cases within forty-eight (48) hours" (§6.3); the user must get "written confirmation of successful deletion" (§2.5). Today Kadence keeps fetched rides when a device is disconnected (docs/devices-setup.md §7); for Strava that would have to be reversed.

### 1.4 Derived data: no analysis, no combining

Policy §5.4 (June 1, 2026):

> "You may not process or disclose Strava Data ... for the purposes of analytics, analyses, customer insight generation, or product or service improvements. You may not combine Strava Data with other customer data for these or any other purposes. The restrictions in this Section 5.4 apply to data derived from Strava Data and to output that incorporates or was generated using Strava Data."

Whether Strava would count a rider's own load chart as "analyses" is interpretation, **unverified**. Combining a ride with check-ins and planned sessions, which is what Kadence's load model, guardrails and attention list do, is what the second sentence names.

### 1.5 AI: banned outright, local models included

Policy §5.3 (June 1, 2026):

> "You may not use the Strava API Materials or Strava Data, directly or indirectly, in connection with the development, training, evaluation, or operation of any AI Application. This prohibition extends to: Any data derived from, aggregated from, anonymized from, or generated using Strava Data ... retrieval-augmented generation, ingestion into a context window or working memory, and any other activity intended or reasonably likely to develop, improve, evaluate, or operate an AI Application."

Policy §5.10 bars making Strava Data available to "AI Application providers, or model developers — even if a user of your Developer Application consents." Policy §5.16(b) bars running "any MCP Server, agent-mediated interface, or analogous mechanism" over the data. Only Strava's own MCP connector (launched June 1, 2026, subscribers, "personal use of their own Strava data") is exempt. The November 2024 clause covered "model training" only; the 2026 text covers operation, so an Ollama model on the team's own server is no different from a hosted one. Strava's FAQ (March 16, 2026): "applications that expose athlete data to third party AI tools or use it in ways that conflict with our terms will not be approved."

### 1.6 Who may build one, and at what cost

- **One token, one app, one developer.** Agreement §1.1–1.2: "You may only use a single API Token for a single Developer Application ... may not share your API Token with any other developer, third party, or use it for more than one application or service." Policy §5.16(c)–(d): no re-use of credentials "across multiple servers, services, applications, or end users" and no app "whose primary purpose is to enable third parties to access the Strava API Materials or Strava Data through your credentials or infrastructure." Policy §5.1 limits use to "the Developer Application for which you are registered." A shared client id in Kadence's repository or Docker image is therefore out; every installation registers its own app.
- **Capacity.** developers.strava.com/docs/rate-limits (June 2026): "All newly created apps will have an athlete capacity of 1, aka 'Single Player Mode'." Self-service to 10. "If you want to scale beyond 10 connected athletes you'll need to submit your app for review ... include screenshots of all the places Strava data is shown ... increased access is not a guarantee." Policy §3.6: admission "is at Strava's discretion and is not guaranteed. Strava does not commit to a fixed review-time service-level agreement."
- **Subscription.** Getting-started page: "A Strava subscription is a prerequisite for creating an app." Policy §3.3: Standard Tier (10, then up to 9,999 users) requires "that the developer or specified end users maintain an active Strava subscription"; new developers from June 1, 2026, existing from June 30, 2026. FAQ (March 16, 2026): no fee beyond the subscription. Price around US$11.99/month or $79.99/year per third-party coverage; Danish price **unverified**.
- **Age.** Agreement §11.1: the developer warrants "you are at least 18 years of age."
- **Rate limits.** 200 requests/15 min and 2,000/day overall; 100/15 min and 1,000/day for reads; after the self-service upgrade 400/4,000 and 200/2,000. Daily reset at midnight UTC.
- **Other duties.** GDPR-grade privacy policy for the app; subprocessor list on Strava's request (§7.7); breach notice to Strava within 24 hours (§8.3); no press mention of Strava without written consent (§4.6); no imitation of Strava's "look, imagery, or brand identity" (§5.2); Garmin attribution when Garmin-sourced data is shown (§4.4); Strava may audit.
- **Why it tightened.** Strava's June 1, 2026 announcement names AI scraping, API intermediaries and no-code tools, and reports developer applications up 448% year to date (figure from secondary reporting, **unverified** against the raw announcement). Strava has filed for an IPO and sells its own AI connector; the direction is not towards openness.

### 1.7 What the API would actually give

- Activity summary and detail, laps (no lap power or heart-rate fields), and streams keyed `time, distance, latlng, altitude, velocity_smooth, heartrate, cadence, watts, temp, moving, grade_smooth`; resolution low/medium/high, the sample rate returned is not documented. `activity:read_all` is needed for "Only Me" rides and privacy zones.
- **No original file.** The only export endpoints in the Swagger spec are for routes; Strava's help says "exporting your data is only available on the Strava website"; a developer's question of June 11, 2024 got no staff answer. A Strava import could not go through Kadence's FIT decoder; it would be a second reader that rebuilds a ride from streams.
- Webhooks: one subscription per app; create/update (title, type, privacy)/delete and deauthorization; the payload carries only ids, so a fetch follows within the rate limit; the callback must answer 200 within two seconds, three attempts. Public callback required; HTTPS requirement is asserted by third parties only, **unverified**.
- Tokens: access tokens live six hours; every refresh rotates the refresh token and the old one "is invalidated immediately."
- Moving parts: club endpoints removed September 1, 2026; `POST /oauth/revoke` replaces `/oauth/deauthorize` by June 1, 2027; new base URL `api-v3.strava.com` from January 4, 2027.
- Strava's `weighted_average_watts` is described with a TrainingPeaks trademark that Kadence does not use.

### 1.8 What Strava protects

Policy §6.6 (June 1, 2026):

> "Each Strava user has the right to access and export the user's own Strava data, free of charge, through the Bulk Data Export Tool published on the Strava service. Nothing in this Agreement is intended to limit or condition that user-facing right."

The June 1, 2026 announcement: "every Strava athlete can still access and download their data for free, at any time – and wearable and device integrations are not affected." Per activity, the website offers "Export Original" (usually FIT), "Export GPX" and TCX via `/export_tcx`. The bulk archive holds `activities.csv` and an `activities/` folder of mostly `.fit.gz`, older `.gpx`/`.tcx.gz` (third-party description, but ADR 0022 was built on exactly those files).

### 1.9 Data location and age

Strava's privacy policy (effective January 1, 2026): "your information will be transferred, processed, and stored in the United States" under Standard Contractual Clauses. A Strava link would sit with Wahoo and Garmin in the "services a rider chooses to connect" table of docs/subprocessors.md, so not a blocker in itself under dogma 4, but one more US flow for health data about minors. Strava's Terms admit users from 13; Denmark's digital age of consent is 15, so every U17 rider is above both. Whether Strava applies the Danish age was not checked.

---

## 2. What that means for Kadence's four uses of a ride

| Use of a ride                                                                                                                 | Governing text                                                                                               | Permitted?                                                                                                                                                                     | Note                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Rider's own view, within seven days**                                                                                       | Agreement highlights; Policy §2.3, §6.2                                                                      | Yes                                                                                                                                                                            | The one clearly permitted use.                                                                                                |
| **Coach view** (calendar, matching planned to done, team overview, attention list)                                            | Policy §2.3, §6.2                                                                                            | **No on the text.** Tolerated in practice for intervals.icu on a November 2024 phone call; status under the June 2026 terms unverified; revocable at will.                     | The "explicit consent" phrases in the highlights and §5.13 are the only handle, and §2.3/§6.2 carry no such exception.        |
| **Parent view** (ADR 0011 sharing)                                                                                            | Policy §2.3, §6.2                                                                                            | **No.** A second "other user"; nothing written or oral covers it.                                                                                                              |                                                                                                                               |
| **Derived metrics and records** (session RPE load, fitness/fatigue/form, power curve, guardrails, DCU hours, per-team export) | Policy §6.2 (7 days), §5.4 (analyses; combining), §5.5 (persistent index), §5.7 (location), §5.10 (transfer) | **No as Kadence does it.** A rider-only chart of one ride for a week might pass; a season of rides combined with check-ins and planned sessions, kept in the export, does not. | Records are "data derived from Strava Data" (§5.4, §5.5).                                                                     |
| **AI Monday brief and week draft** (ADR 0017)                                                                                 | Policy §5.3, §5.10, §5.16                                                                                    | **No, explicitly.** "Ingestion into a context window" is named; a local Ollama model is not exempt.                                                                            | Strava-sourced rides would have to be filtered out of every prompt, and the brief would then be wrong about the rider's week. |

Two further consequences that are not "uses" but bind the product: **deletion** (30 days on revocation, 48 hours mirroring, written confirmation) contradicts "rides already fetched stay"; and **dogma 3's export** of a team would carry Strava Data to the coach, a disclosure §2.3 forbids.

Net: of the four uses the user asked about, none is permitted as Kadence is designed. The rider seeing their own ride for a week is permitted, and that is not what a coaching tool is for.

---

## 3. The options

### (a) No Strava adapter: devices directly, or Strava's export

What exists today:

- **Automatic:** Garmin, Wahoo and Polar adapters (ADR 0018, 0020; docs/devices-setup.md). Strava's own help pages confirm these devices are upstream of Strava: Garmin Connect offers "automatic activity syncing" to Strava, the Wahoo ELEMNT app will "automatically upload your activities to Strava", and Polar Flow syncs "new activities ... directly to Strava". A rider whose ride reaches Strava from one of these can have the same ride reach Kadence directly, in the original FIT, with laps and power intact, and with nothing lost. TrainingPeaks gives the same advice (help article, April 21, 2025): "TrainingPeaks and Strava do not offer direct syncing ... Option 1: Connect your fitness device."
- **By hand:** FIT, TCX and GPX, bare, gzipped or zipped, including Strava's bulk export and per-activity "Export Original" (ADR 0022, since 2026-09-28). The help text in `messages/da.json` already names Strava's export.

Who is not covered: a rider who records with **Strava's phone app** itself, or with a device that syncs only to Strava (DC Rainmaker, November 19, 2024: "there are literally thousands of device manufacturers out there, and many of them only connect to Strava"). For them the path is export and upload, per ride or as an archive. This is a real gap, and the honest size of it in a Danish U17/U19 team is unknown until the winter tells us. Zwift is the likeliest case among young riders; ADR 0022 reads Zwift's FIT, and a direct Zwift adapter is a separate later decision.

Two cheap slices that make (a) better:

1. **A help section "From Strava to Kadence"** (Danish first, `messages/da.json`): connect Garmin/Wahoo/Polar for automatic transfer; for a single ride, "Export Original" then upload; for history, request the bulk export and upload the archive.
2. **Accept the whole Strava archive.** ADR 0022 reads "the first activity file only" from a zip. Walking `activities/` (with a cap on entries and total unpacked size) and using `activities.csv` for names and sport types would make a rider's history a one-drop import. Duplicates are already a question the import must answer for device rides, so the same matching applies.

Cost: a day or two. Risk: none from Strava; §6.6 protects it.

### (b) A Strava adapter that shows rides only to the rider

Shape: a fourth `DeviceProvider` behind `STRAVA_CLIENT_ID`/`STRAVA_CLIENT_SECRET`, OAuth with `activity:read_all`, one webhook subscription per installation, a streams-to-ride converter (no FIT), rotating refresh tokens sealed with `secret-box`, and a new visibility class on activities (`source = 'strava'`) that RLS hides from coaches and guardians.

What breaks:

- The coach never sees the ride, so it never matches a planned session, never counts toward the DCU corridor, the ramp or the longest-ride guardrail, never appears in the team grid, the attention list or the Monday brief, and never reaches a parent. For a coaching tool this is a ride that does not exist.
- It is not legally clean either. §6.2 caps retention at seven days, so the ride would have to be deleted after a week, or Kadence would be in breach. §5.4 bars combining it with check-ins and planned sessions even for the rider's own view. §5.7 bars storing its GPS. §5.3 bars the brief regardless. So (b) is at best a seven-day, rider-only preview of a ride Kadence may not analyse.
- It adds a second decoding path beside the FIT decoder (streams reconstruction), a new RLS visibility state with its own isolation tests, and a deletion pipeline (30 days, 48 hours, written confirmation) that no other provider needs.
- It carries the full operational cost of (c) below for each installation, for a feature that does not do what the user asked (a coach seeing the rider's rides).

### (c) A legally clean form, if one exists

Three shapes were examined:

1. **One app per installation** (operator registers, as with Wahoo/Garmin/Polar). This is required by Agreement §1.1–1.2 and Policy §5.16(c) anyway; a shared client id is prohibited. Each operator needs an adult, paying Strava subscriber as developer; starts at one athlete; self-upgrades to ten; beyond ten a review with screenshots, discretionary, no SLA, revocable. For kadence.haij.dk that is one subscription and one review; for a club running its own instance it is the same again, which in practice makes the feature hosted-only, against dogma 1. And the app-per-installation shape changes nothing about §2.3, §6.2, §5.4 or §5.3: the display, storage, analysis and AI limits bind every app.
2. **One app per rider** (each rider registers their own "Single Player Mode" app, the "solely for themselves" case the docs describe). Fails on three counts: the developer must be 18 (Agreement §11.1), which excludes every U17 and U19 rider; each rider would need a paid Strava subscription, a per-athlete fee; and the display, storage and AI limits still apply, so the coach still cannot see the ride.
3. **A written exception from Strava** (developers@strava.com, the route the Policy names for questions). This is the only thing that could make the coach view clean. No such exception exists in writing for anyone found; intervals.icu's is oral; VeloViewer, "prompted by conversations with Strava", had to make sharing expire every seven days (November 27, 2024); Cronometer was told it "no longer meet[s] their requirements" and cut off (December 9, 2024). An exception for parents of minors and for feeding a local model has no precedent at all.

Conclusion: no legally clean form exists today that covers Kadence's core. The closest is (b) plus an app per installation plus a written exception, and only the exception would change the answer.

---

## 4. Recommendation

**Option (a).** Do not build a Strava API adapter. Keep Strava as a file source, which Kadence already is, and make that path easier with the two slices above. Reasoning:

1. **The terms forbid the product.** The coach view (§2.3, §6.2), the parent view (same), season-long storage (§6.2), the load model and records (§5.4, §5.5, §5.7) and the AI brief (§5.3) are each barred by the June 1, 2026 texts. This is not a grey area with one clause to argue about; it is five.
2. **The tolerated practice is a phone call.** intervals.icu's coach view rests on a November 2024 conversation, is contradicted by the written text, may not have survived June 2026, and is revocable. A tool for health data about minors, run by volunteer clubs, should not stand on that. Tinker's own words: "if Strava doesn't like what you are doing they can withdraw API access."
3. **Self-hosting would not be 1:1.** Every installation would need its own app, its own paying adult subscriber and its own review beyond ten riders (Agreement §1.1–1.2, Policy §3.3, §3.6, §5.16). Dogma 1 says no feature exists only on the hosted instance and no per-athlete fee walls a core feature; dogma 2 says the cut-the-internet test must pass. (a) satisfies both today.
4. **Nothing is lost for most riders.** Garmin, Wahoo and Polar are upstream of Strava and already automatic in Kadence, with the original FIT rather than reconstructed streams. "Preferably automatically" is already true for these riders; the answer to the coach is to connect the device, not Strava.
5. **The gap is real but small and has a path.** Riders on the Strava phone app or a Strava-only device upload by hand, per ride or as one archive. Strava guarantees that path (§6.6) and cannot close it under its own Policy.

What to write down:

- Keep the CLAUDE.md line, and sharpen it with the clauses: "Strava (API Policy 2026 §2.3/§6.2: a user's data may be shown only to that user and kept seven days; §5.3: never to an AI; one registered, subscribed app per installation)."
- A short ADR ("Strava stays a file source") naming the trade-off accepted: riders who record only in Strava upload by hand. The ways of working ask for one on every significant decision, and this is the first time the reasoning is complete.
- Optionally, a written question to developers@strava.com with three points (coach display for a youth team; a confirmed guardian of a minor; a local model on the team's own server). It costs an email. Do not build on anything short of a written answer, and expect none; the FAQ and the June 2026 direction point the other way.

Revisit only if Strava publishes, in writing, that a rider's data may be shown to their coach and guardians, lifts the seven-day retention cap, and offers a route for small open-source, self-hosted apps without a per-installation subscription. All three are needed; none is likely in the current direction.

**Uncertainties, stated plainly:** whether the coaching tolerance of November 2024 still holds under the June 2026 terms; whether Policy §6.1's "9,999 or less" wording is intentional; the Danish subscription price; the 448% figure (secondary source); the bulk-archive layout (third-party description, matches what ADR 0022 reads); the HTTPS requirement for the webhook callback (third-party only); and how many riders in a Danish U17/U19 team actually record only in Strava, which one winter will answer.

---

## Dansk sammenfatning til træneren

Strava strammede sine API-vilkår 1. juni 2026, og de siger nu sort på hvidt, at en rytters Strava-data kun må vises til rytteren selv, højst må gemmes i syv dage, ikke må bruges til analyser eller kombineres med andre data, og aldrig må sendes til en AI-model, heller ikke en lokal. Det betyder, at en Strava-kobling hverken kunne vise turen til dig som træner, til forældrene, tælle med i belastningen og DCU-timerne eller indgå i mandagsbriefen, og at hver klub, der selv kører Kadence, skulle registrere sin egen Strava-app med et betalt abonnement og en godkendelse hos Strava for at få mere end ti ryttere på. Andre trænerværktøjer, der stadig viser Strava-ture til trænere, gør det på baggrund af en telefonsamtale med Strava fra 2024, ikke en skriftlig tilladelse, og det er ikke et grundlag, vi vil bygge på med sundhedsdata om unge. Den gode nyhed er, at det automatiske allerede findes: Garmin, Wahoo og Polar sender turen til Strava, og de kan lige så godt sende den direkte til Kadence, i den originale fil, med det samme; rytteren forbinder sin enhed under Indstillinger → Enheder. Ryttere, der kun optager i Strava-appen, kan hente turen som "Export Original" eller hele arkivet fra Strava og lægge den ind i Kadence, og det arbejder vi på at gøre til ét træk. Anbefalingen er derfor: ingen Strava-kobling, en tydelig vejledning "Fra Strava til Kadence", og vi tager det op igen, hvis Strava en dag skriftligt åbner for trænere og forældre.
