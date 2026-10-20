# Other bike computers (not Garmin, Wahoo, Hammerhead) and open platforms: openness to a third-party training platform, October 2026

All pages read 2026-10-12 unless another date is given. "Snippet" means the claim came from a search-result summary and the page itself was not opened; treat those as weaker. Earlier Kadence findings (garmin-without-partner-access.md §6, rides-in-options.md lines 53 and 81) are not repeated except where this round changes them.

## 1. Maker by maker: WiFi, API/SDK, custom upload, who approves, country, data, age

### Takeaway

Of the remaining makers only COROS offers a self-serve, sanctioned route for a coaching platform (OAuth to its MCP server, FIT download, workout write). iGPSPORT has an OAuth API but only by e-mail application from a company. Bryton, Magene, Sigma, Coospo and Lezyne have no developer API found; Bryton and Magene have no WiFi on most or all units. No maker found offers "upload to a custom URL", WebDAV, e-mail or a generic webhook.

### Cited Findings

**COROS DURA (United States/China; 2.7" MIP touch, solar)**

- DURA has WiFi: the Getting Started article lists the setting "WiFi: Connect your DURA to WiFi for faster data sync and firmware updates" (article updated 2026-10-11) — [COROS Getting Started](https://support.coros.com/hc/en-us/articles/26485165860116-Getting-Started)
- WiFi is 2.4 GHz only and is set up from the phone: "Your DURA will prompt you to connect to WiFi. Select your WiFi network and enter the password on your COROS app. Note: DURA can connect to 2.4 GHz networks (5 GHz networks are not supported)" (updated 2026-09-20) — [COROS: Downloading Maps to DURA](https://support.coros.com/hc/en-us/articles/26915219174932-Downloading-Maps-to-DURA)
- DC Rainmaker's hands-on (2024-06) lists "WiFi & Bluetooth connectivity" and says "Maps will sync via WiFi"; he called it "_IS NOT_ a review" and said "the unit simply isn't ready" at launch; price $249 / €289 / £249 — [DC Rainmaker hands-on](https://www.dcrainmaker.com/2024/06/coros-dura-cycling-gps-first-look-hands-thoughts.html)
- The DURA product page lists Bluetooth, ANT+, 2.7" MIP colour touchscreen, 120 h GPS battery and workouts built "within the COROS app or Training Hub"; it does not mention WiFi — [coros.com/dura](https://coros.com/dura)
- Firmware keeps moving: release notes (updated 2026-09-27) include V3.1008.0 (2025-07-27) with voice alerts and street names, and Strava Live Segments (2024-12-03) — [COROS DURA Release Notes](https://support.coros.com/hc/en-us/articles/32924317141652-COROS-DURA-Release-Notes); a snippet adds torque/"Total Work" (Aug 2026) and storm warning (Sep 2026) — [search snippet citing COROS release notes](https://support.coros.com/hc/en-us/articles/32924317141652-COROS-DURA-Release-Notes)
- No DURA successor found (searches for "DURA 2" returned nothing) — [coros.com/dura](https://coros.com/dura)
- API: see question 2 (MCP self-serve with FIT download and workout write; Partner API by application).
- Terms 16+ or parental supervision (earlier Kadence note, not re-read).

**Bryton (Taiwan): Rider S800, S810, 750 SE, 650, 550, S510, Aero 60, E10, GO**

- No WiFi on S800, S810 or 650: each product page's spec table says "Connectivity Wireless Bluetooth (iOS & Android)", "Automatic Activities Upload ✔", "3rd Party Activity Integration Strava, TrainingPeaks, Komoot, Relive, Ride with GPS", "Planned Workouts ✔ (Via Bryton Active App / TrainingPeaks)" — [Bryton Rider S800](https://global.brytonsport.com/products/rider-s800), [Rider S810](https://global.brytonsport.com/products/rider-s810), [Rider 650](https://global.brytonsport.com/products/rider-650)
- Same spec tables list "Bluetooth Sensor HR" and "ANT+ Sensors HR / Spd / Cad / Pw / Radar / Light" (i.e. Bluetooth sensor support listed for heart rate only) — [Bryton Rider S810](https://global.brytonsport.com/products/rider-s810)
- road.cc on the S810: "The unit's lack of Wi-Fi means it is heavily reliant on your phone for all data syncing, and each route must be manually synced"; also software bugs ("ghost start", slow GPS acquisition) — [road.cc S810 review](https://road.cc/content/review/bryton-rider-s810-316057)
- Rider 650 / 550 announced "June 24th" (year not shown on page; BikeRadar reviewed the 650 in Feb 2026): 2.8" colour, 650 touch; 33 h / 37 h; workouts from Bryton Active or TrainingPeaks; €169.95 (650 E), €129.95 (550 E) — [Bryton news](https://global.brytonsport.com/blogs/news/bryton-expands-gps-lineup-with-new-mid-range-rider-650-550)
- "Workouts can be created in the Bryton Active app or synced from TrainingPeaks to be executed on the Rider 650" — [Bryton Rider 650](https://global.brytonsport.com/products/rider-650)
- No public developer API found. Terra (a US aggregator) "polls it every 5–10 minutes for each connected user" and states "No provider credentials required"; no Bryton partnership statement, no workout push — [Terra: Bryton](https://tryterra.co/integrations/brytonsport)
- An MIT-licensed tool syncs Bryton and iGPSPORT with intervals.icu and pushes planned workouts back using the user's username/password against undocumented endpoints; "not affiliated with iGPSPORT, intervals.icu" — [GitHub jorge-huxley/intervalssync](https://github.com/jorge-huxley/intervalssync)
- Privacy: "If you are under the age of 12, you may not use them"; 12–17 "must get your parent or guardian to read and agree"; storage location not stated; Bryton Inc.; updated 2022-11-29 — [Bryton privacy policy (bike computer)](https://global.brytonsport.com/pages/privacy-policy-bike-computer)

**iGPSPORT (Wuhan, China): iGS800, BSC300T, BiNavi, BiNavi Ultra, iGS630S, BSC500**

- API: "iGPSPORT APP Open Platform uses OAuth 2.0 … Please complete the developer profile and submit it to the iGPSPORT email address at global@igpsport.com for review"; the form asks for company name, company legal entity, redirect URL and "callback URL for sports data"; no data list, rate limits or terms on the page — [iGPSPORT Open Platform](https://www.igpsport.com/support/app/openapi)
- A public Postman workspace exists (not opened) — [Postman: iGPSPORT](https://www.postman.com/igpsport/igpsport/overview)
- iGS800 has ANT+, Bluetooth and Wi-Fi, 3.5" screen, 40 h claimed — [road.cc iGS800 review](https://road.cc/content/review/igpsport-igs800-314291); what WiFi does (upload vs maps) not stated — [the5krunner iGS800 spec, 2024-03-22](https://the5krunner.com/2024/03/22/igpsport-igs800-specification-opinion-review/)
- BiNavi Ultra: "Wi-Fi / Bluetooth / ANT+", 3.7" 480×854 touch, 30+ h, Strava/TrainingPeaks/Komoot upload/sync, $399.90; OS and workout-loading not stated — [iGPSPORT BiNavi Ultra](https://www.igpsport.com/global/product/binavi-ultra)
- BSC300T: BLE + ANT+, 2.4" transflective touch, 20 h, upload & sync to Strava, TrainingPeaks, Komoot; no WiFi in the spec; $109.90 — [iGPSPORT BSC300T](https://www.igpsport.com/product/bsc300t)
- Gadgetbridge merged "Basic support for iGPSport bike computers" on 2026-05-13: BSC200, BSC200S, BSC300, iGS630, iGS630S, iGS800 — FIT activity download, route upload (GPX/FIT/TCX…), weather, over BLE. **BSC300T is not in the list** (this corrects the earlier Kadence table, which put "Gadgetbridge on Android" against BSC300T) — [Gadgetbridge PR #5211](https://codeberg.org/Freeyourgadget/Gadgetbridge/pulls/5211)
- Privacy: Wuhan Qiwu Technology Co., Ltd.; "we consider anyone under the age of 14 to be a child", guardian consent needed; data principally in mainland China, "your user information may be transferred to the overseas jurisdiction" after consent; last updated 2022-06-22 — [iGPSPORT privacy](https://prod.en.igpsport.com/service/mobile/api/docs/privacy); a snippet says website users must be 18 (not verified) — [iGPSPORT user terms](https://www.igpsport.com/negotiate/user)

**Sigma (Neustadt, Germany): ROX 2.0/4.0 Endurance, ROX 11.1 EVO, ROX 12.1 EVO**

- ROX 12.1 EVO: 3" transflective touch, Bluetooth + ANT+, WiFi; "More maps and regular updates can be downloaded via WiFi free of charge"; up to 22 h battery-save, 10 h full nav; workouts: 8 pre-installed, own workouts by importing ".fit file into the SIGMA RIDE app"; TrainingPeaks/komoot/Strava; €399.95–€499.95 — [sigma.bike ROX 12.1 EVO](https://sigma.bike/product/rox-12-1-evo/)
- BikeRadar (2023-06-12): "you can sync the computer with your phone, for example to upload a route or activity, without a Wifi connection"; launch €379.95 — [BikeRadar news](https://www.bikeradar.com/news/sigma-rox-12-1-evo)
- CyclistsHub (updated 2026-04-05): WiFi to "download and update maps wirelessly"; 3.7/5; "already outdated in some areas" (no multi-band GNSS); "price-to-performance ratio is not favorable" — [CyclistsHub ROX 12.1 EVO](https://www.cyclistshub.com/sigma-rox-12-1-evo-review/)
- Whether the 12.1 EVO uploads rides over WiFi without the phone: not confirmed by any source opened. (A snippet said rides "upload automatically when the head unit next connects to WiFi", apparently about the older Android-based ROX 12.0 — [Cyclingnews ROX 12 review](https://www.cyclingnews.com/reviews/sigma-rox-12-cycling-computer-review/).)
- SIGMA RIDE app: controller SIGMA-ELEKTRO GmbH, Neustadt a.d. Weinstraße; cloud backup optional — "data is only stored locally in your app if you do not decide to use the cloud"; cloud data "processed by partners in the EU"; supports ROX 12.1 EVO, 11.1 EVO, 4.0, 4.0 SE — [SIGMA RIDE privacy](https://privacypolicy.sigmasport.com/ride-app/)
- New 2025–26 models are entry-level: ROX 2.0 Endurance — [Oxford Products](https://www.oxfordproducts.com/blog/post/new-from-sigma-rox-20-endurance-computer); ROX 4.0 Endurance listed as a 2026 model, 2.4", 41 h — [bike24 (snippet)](https://www.bike24.com/p2821095.html). No new flagship found.
- No Sigma developer API or SDK found.

**Magene (Qingdao, China; OnelapFit app): C206–C706**

- Current line on magene.com: C206, C406, C406 Pro, C506, C506 SE, C606, C606 V2, C606 Pro, C706 ($249). **No C808 exists on Magene's site** — [Magene bike computers](https://www.magene.com/en/12-bike-computers)
- C706 (Cycling Weekly, 2026-09-21): "rivals flagship models … in terms of hardware"; cons "Fledgling training and wellness ecosystem", "Native routing/re-routing inconsistent", "No e-bike support", hard to read through polarised lenses — [Cycling Weekly C706](https://www.cyclingweekly.com/reviews/computers-gps-watches/magene-c706-bike-computer-review-flagship-hardware-fledgling-software)
- C706 WiFi is for firmware and Strava segments; workouts come from the OnelapFit app or TrainingPeaks (snippet) — [Cycling Weekly C706 (snippet)](https://www.cyclingweekly.com/reviews/computers-gps-watches/magene-c706-bike-computer-review-flagship-hardware-fledgling-software)
- Terms forbid third-party access: "You may not use any third-party software, plug-ins … or systems to view or obtain any relevant information, data and other content of Magene Fitness … without the authorization from Magene Fitness"; minors need parental consent; Qingdao WattPower Information Technology Co., Ltd.; PRC law; effective 2020-06-22 — [Onelap/Magene ToS](http://www.onelap.com/protocol/serverProtocol.html)
- Third-party export is Strava/TrainingPeaks through the app — [Magene support](https://support.magene.com/hc/en-us/articles/9399554492697-How-to-upload-the-cycling-data-to-3rd-party-APP). No developer API found.

**Lezyne (United States)**

- "The Lezyne GPS range has been discontinued; however, support, the app, and GPS functionality remain available" (Lezyne on X, Aug 2025) — [Lezyne on X](https://x.com/Lezyne/status/1959798577913282626)

**Stages Dash (United States): M200/L200**

- Launched 2022; reviewers: micro-USB, ~10 h real battery, best features "behind a subscription paywall" (Stages Link) — [Cyclingnews L200 review](https://www.cyclingnews.com/reviews/stages-dash-l200-gps-bike-computer-review/), [the5krunner L200, 2022-05-12](https://the5krunner.com/2022/05/12/stages-dash-l200-review-m200/)
- Stages' product page returned 403; current availability and any API unverified — [Stages GPS bike computers](https://stagescycling.com/en_de/product/gps-bike-computers)

**Beeline Velo 2 (United Kingdom)**

- A phone-led navigator; May 2025 update added hill profiles, GPX breadcrumb following and Komoot — [Beeline newsroom](https://beeline-newsroom.prowly.com/397839-beeline-revolutionises-navigation-for-cyclists-again-with-major-feature-update), [Beeline news](https://beeline.co/blogs/news). No training/workout or API features found.

**Coospo (China): CS600 (new 2025)**

- 2.4" colour touch, 36 h, 9 sensor types; syncs to Strava and TrainingPeaks via the CoospoRide app, "but no further apps"; not an Android device — [the5krunner CS600 review, 2025-11-03](https://the5krunner.com/2025/11/03/coospo-cs600-review/), [road.cc CS600](https://road.cc/review_v2/coospo-realroad-cs600-gps-bike-computer)

**Amazfit / Zepp (watches only)**

- Zepp OS has an open JS SDK for mini apps; "Workout Extension" (Zepp OS 3.5, API_LEVEL 3.6+) lets plugins read live workout data via `getSportData` on T-Rex 3, Cheetah Pro/Round/Square, T-Rex Ultra, Falcon — [Zepp docs: Workout Extension](https://docs.zepp.com/docs/guides/workout-extension/intro/)
- intervals.icu says planned-workout push works to "some Amazfit models" (snippet) — [intervals.icu](https://www.intervals.icu/)

**Suunto (watches only; owned by a Chinese group since 2022, not re-verified)**

- Cloud API through a partner programme with an application form and an API agreement — [Suunto Partner Program](https://us.suunto.com/pages/welcome-partners), [Suunto API Zone FAQ](https://apizone.suunto.com/faq)
- Open SuuntoPlus (2026-03-11): community-built on-watch apps, but "Apps can be submitted through the Suunto Partner Program and reviewed by Suunto before appearing in the SuuntoPlus Store" — [Suunto news](https://www.suunto.com/sports/News-Articles-container-page/open-suuntoplus-built-by-the-community.-powered-by-suunto)

**Custom-URL / WebDAV / e-mail / webhook upload**

- None of the device pages or help articles opened (COROS, Bryton, iGPSPORT, Sigma, Magene, Coospo) offers it. The nearest is iGPSPORT's API form asking for a "callback URL for sports data" — but only for approved partners — [iGPSPORT Open Platform](https://www.igpsport.com/support/app/openapi)

### Inferences

- Device WiFi that can carry a ride to the maker's cloud without a phone is confirmed only weakly: COROS DURA ("faster data sync"), iGS800 and BiNavi Ultra (WiFi listed, use unclear), Magene C706 (WiFi for firmware/segments). Even then the ride lands in the maker's cloud, never at Kadence directly; Kadence would still need that maker's API.
- Fetching a planned session over WiFi with no phone was not documented for any of these makers.
- Bryton is the most phone-bound: no WiFi on any current model and its spec tables list only HR as a Bluetooth sensor, which matters for riders with a Bluetooth-only power meter.
- iGPSPORT's "callback URL for sports data" suggests push delivery to an approved partner, but the application is company-oriented and gated; Kadence as an open-source self-hosted project would apply as one company for all installations or not at all.
- Magene's terms rule out an unofficial adapter; the intervalssync-style route for Bryton/iGPSPORT uses the rider's password against undocumented endpoints, which conflicts with Kadence's own security rules.

### Gaps

- Whether DURA, iGS800, BiNavi Ultra or C706 upload finished rides over WiFi with the phone switched off, and whether any of them fetch scheduled workouts over WiFi: no source says so explicitly.
- iGPSPORT API contents (FIT download? workout push?) and whether individuals/open-source projects are accepted: not on the page; Postman workspace not opened.
- Where Bryton, Magene and iGPSPORT store EU users' data: not stated in their policies.
- Stages' current product status and Stages Link API: page blocked.
- TwoNav (Spanish maker, WiFi on Cross Plus per retailer listings — [gpstraining.co.uk](https://gpstraining.co.uk/products/twonav-cross-plus)) was not researched; it is the one EU maker besides Sigma worth a follow-up.

## 2. COROS since 2026-09: is MCP allowed for a coaching platform, is there a public Partner API route, does DURA have WiFi?

### Takeaway

Yes, and more plainly than in September: COROS's own help centre now sends developers who are "not at scale yet" to the self-serve MCP, names "AI coaching apps" and "training dashboards and analytics platforms" as what to build on it, and the Partner API has a public application form and published requirements. DURA has 2.4 GHz WiFi.

### Cited Findings

- "Build on COROS MCP" (created 2026-09-02, updated 2026-09-10): "No application or approval required. Implement OAuth 2.0 in your app, and your users can connect their COROS account … Your app reads training data and writes workout plans through the MCP." "What you can build: AI coaching apps that analyze training and prescribe workouts; Training dashboards and analytics platforms; … Personalized training plan generators". Limitations: "Single-user access only (each user authorizes their own data); No webhook push notifications (your app polls the MCP); No GPX route import/export; No two-way activity sync (COROS to your platform requires Partner API)" — [COROS: Build on COROS MCP](https://support.coros.com/hc/en-us/articles/53181619102996-Build-on-COROS-MCP)
- "Partner API Access" (created 2026-09-02, **updated 2026-10-12**): requirements "Established platform with demonstrated user base; Registered company with authorized technical representative; Standard security and data privacy compliance; Agreement to COROS API Terms of Use". You get multi-user OAuth, webhooks "within ~5 minutes", "Structured workout and training plan sync (push to COROS users)", FIT download, GPX, "Rate limit: 1,000 calls/minute"; endpoints `getWorkoutDetailFit`, `tp/list/push`, `route/push`, `file/upload`; getWorkoutRecords "30-day max, 3-month lookback". And: "Not at scale yet? If you don't yet meet the requirements for Partner API access, you can build on COROS using the MCP with OAuth 2.0 (Build on COROS MCP). Self-service, no application required. As your platform grows, you can apply for full Partner API access." — [COROS: Partner API Access](https://support.coros.com/hc/en-us/articles/53181766856724-Partner-API-Access)
- "Submit an API Application" (created 2023-07-03, **updated 2026-10-08**): "COROS supports automated data sharing and API access for third-party platforms authorized by our users, in alignment with EU data protection regulations (including GDPR and the EU Data Act) … we grant access through our standard OAuth 2.0 API framework to any platform that satisfies our standard security and operational requirements." It routes "Developers building apps with COROS data: Build on COROS MCP (self-service, no application needed)"; apply by form plus e-mail to api@coros.com — [COROS: Submit an API Application](https://support.coros.com/hc/en-us/articles/17085887816340-Submit-an-API-Application)
- "Connect Your Data" (updated 2026-10-02): app builders get "22 data fields including activities, health metrics, fitness assessments, and write training plans"; "Want COROS in your favorite fitness app? … share this page with the app's developer" — [COROS: Connect Your Data](https://support.coros.com/hc/en-us/articles/53181260265492-Connect-Your-Data)
- Official MCP repo lists read tools incl. `downloadActivityFitFiles`, `queryActivityLapData`, `queryTrainingSchedule`, and write tools `createTrainingPlan`, `createSingleWorkout`, `scheduleWorkout`, `createScheduledWorkout`, `updateScheduledWorkout`; "50-file allowance per 24-hour window"; regional endpoints incl. Europe `mcpeu.coros.com`; "COROS MCP itself is free of charge"; subject to COROS ToS and Privacy Policy — [GitHub coroslab/COROS-MCP](https://github.com/coroslab/COROS-MCP)
- Launch history: beta May 2026, read-only at launch, power data and per-second streams not exposed then — [the5krunner, 2026-05-13](https://the5krunner.com/2026/05/13/coros-mcp-ai-data/). This predates the FIT-download and write tools now listed on GitHub; the current FIT file should carry power, but that was not tested.
- intervals.icu forum threads show users pushing planned workouts to COROS and bugs with plan sync (titles only) — [intervals.icu forum: Pushing to Coros Calendar?](https://forum.intervals.icu/t/pushing-to-coros-calendar/92109), [Coros training plan … not syncing](https://forum.intervals.icu/t/coros-training-plan-is-created-but-planed-workouts-are-not-syncing/131097)
- DURA WiFi: yes, 2.4 GHz, for "faster data sync and firmware updates" and maps — [COROS Getting Started](https://support.coros.com/hc/en-us/articles/26485165860116-Getting-Started), [Downloading Maps to DURA](https://support.coros.com/hc/en-us/articles/26915219174932-Downloading-Maps-to-DURA)

### Inferences

- The question the earlier Kadence note left for COROS ("is pulling every ride into a coaching platform through MCP meant to be allowed?") is now largely answered by COROS's own pages: a per-rider OAuth app that reads training data and writes workouts is the use case they describe. "No two-way activity sync" reads as "no push/webhook of new rides", not a ban on FIT download, since `downloadActivityFitFiles` is a published MCP tool.
- For Kadence each self-hosted installation would be its own OAuth client against `mcpeu.coros.com` with per-rider consent, polling, and 50 FIT files per 24 h (per user or per client is not stated). That fits a team of 10–30 riders.
- The GDPR/Data Act wording and the "Not at scale yet?" pointer appear in articles updated 2026-10-08 and 2026-10-12; the earlier Kadence note (2026-09) did not quote them, so they may be new, but the previous wording could not be diffed.

### Gaps

- Whether the 50-file cap is per user or per OAuth client; whether OAuth client registration for MCP is dynamic (no client secret) or needs a registered redirect URI.
- Whether the DURA itself downloads scheduled workouts over WiFi without the phone.
- COROS API Terms of Use text (linked, not read); age terms beyond the earlier note's "16+ or parental supervision".

## 3. Open platforms: open firmware, open Android, Gadgetbridge; anything credible for a 15–18-year-old racer?

### Takeaway

No. Besides Hammerhead Karoo, no shipping bike computer with open Android or open firmware was found. The open-source projects are hobby builds (Raspberry Pi, ESP32 e-paper) with 7–8 h batteries and no weatherproofing. The most useful open piece is Gadgetbridge's new iGPSPORT support (local BLE, Android only).

### Cited Findings

- Karoo remains the Android unit with sideloading and, since March 2025, an app store ("Native Extension Library") — [DC Rainmaker, 2025-03](https://www.dcrainmaker.com/2025/03/hammerhead-karoo-adds-app-store-a-few-thoughts.html), [DC Rainmaker sideload guide](https://www.dcrainmaker.com/2021/02/how-to-sideload-android-apps-on-your-hammerhead-karoo-1-karoo-2.html)
- Coospo CS600 is "not an Android-based device" and syncs only to Strava and TrainingPeaks — [the5krunner CS600, 2025-11-03](https://the5krunner.com/2025/11/03/coospo-cs600-review/)
- Search for other Android bike computers with sideloading (2025–26) returned only Karoo — [search results incl. velo.outsideonline](https://velo.outsideonline.com/news/hammerhead-karoo-gets-an-app-store/)
- Gadgetbridge (GPL, Android) merged iGPSPORT support 2026-05-13 for BSC200/200S/300, iGS630/630S, iGS800: FIT download and route upload over BLE, protobuf protocol — [Gadgetbridge PR #5211](https://codeberg.org/Freeyourgadget/Gadgetbridge/pulls/5211). Workout upload is not listed.
- OpenTrailPaper: firmware for a LilyGO T5 4.7" e-paper ESP32-S3 board; BLE HR/power/cadence; FIT to SD; structured workouts from `.erg`/`.mrc`; ~7.4 h on 1,500 mAh; "It is a development project, not a finished or weatherproof retail product"; repo created 2026-07-12 — [opentrailpaper.com](https://opentrailpaper.com/), [CNX Software, 2026-09-05](https://www.cnx-software.com/2026/09/05/opentrailpaper-transforms-lilygo-t5-e-paper-s3-pro-devkit-into-a-diy-e-paper-bike-computer/)
- pizero_bikecomputer (Raspberry Pi Zero, GPS + ANT+, offline maps) supports Raspberry Pi OS Trixie as of Oct 2025 — [GitHub hishizuka/pizero_bikecomputer](https://github.com/hishizuka/pizero_bikecomputer)
- Other DIY: OpenBikeComputer — [GitHub timohueser/OpenBikeComputer](https://github.com/timohueser/OpenBikeComputer)
- Watch SDKs exist but are gated or phone-bound: Zepp OS mini apps / Workout Extension — [Zepp docs](https://docs.zepp.com/docs/guides/workout-extension/intro/); Open SuuntoPlus requires the partner programme and Suunto review — [Suunto, 2026-03-11](https://www.suunto.com/sports/News-Articles-container-page/open-suuntoplus-built-by-the-community.-powered-by-suunto)

### Inferences

- "A device Kadence could write its own software for" exists only as Karoo (already covered) or as DIY hardware. OpenTrailPaper is the closest to a modern design (e-paper, FIT, ERG workouts) but has no ANT+, a 7–8 h battery, no weatherproofing and no mount ecosystem; not fit for a junior racer in 2026.
- Gadgetbridge gives an Android rider with an iGS630S/iGS800 a phone-local path (FIT out, routes in) with no iGPSPORT cloud; iPhone riders get nothing from it.

### Gaps

- No search found Android-based units from small makers (e.g. Xplova successors) still on sale; absence is not proof.
- Gadgetbridge support for COROS DURA, Bryton or Magene: not checked beyond the iGPSPORT PR.

## 4. Products: reviewer verdicts 2025–2026 and Danish prices

### Takeaway

The best-reviewed value units are the Bryton Rider 650 (BikeRadar 4.5/5, Feb 2026) and Magene C706 (Cycling Weekly, Sep 2026: flagship hardware, weak software); COROS DURA is praised for battery and price but called basic (3.5/5). In Denmark the DURA is about DKK 2,300, the Magene C706 about DKK 1,900, the BSC300T under DKK 1,000.

### Cited Findings

**Verdicts**

- COROS DURA — BikeRadar 2025-06-21, 3.5/5: "A solid debut from Coros, with the exceptionally long battery life grabbing the headlines"; cons rerouting lag, small screen — [BikeRadar](https://www.bikeradar.com/reviews/training/gps-computers/coros-dura-review); Cycling Weekly 2025-02-11: "tough to beat … However, Dura's features may be too basic to convince Garmin or Wahoo users to jump ship"; cons low-quality mapping, no on-device rerouting, heavy app reliance — [Cycling Weekly](https://www.cyclingweekly.com/reviews/computers-gps-watches/with-incredible-battery-life-and-hard-to-beat-value-the-coros-dura-is-a-solid-little-computer-yet-ill-be-sticking-with-garmin-heres-why); Velo: "improved massively, but it still isn't perfect" — [Velo](https://velo.outsideonline.com/road/road-gear/coros-dura-computer-review/)
- Bryton Rider 650 — BikeRadar 2026-02-16, 4.5/5, "the best-value high-performance GPS unit"; £139.99/€169.95; ~14.5 h real with AXS, power and radar (33 h claimed) — [BikeRadar](https://www.bikeradar.com/reviews/training/gps-computers/bryton-rider-650)
- Bryton S810 — road.cc: intuitive but bugs and no WiFi — [road.cc](https://road.cc/content/review/bryton-rider-s810-316057)
- Magene C706 — Cycling Weekly 2026-09-21 (verdict quoted under question 1) — [Cycling Weekly](https://www.cyclingweekly.com/reviews/computers-gps-watches/magene-c706-bike-computer-review-flagship-hardware-fledgling-software)
- iGPSPORT BiNavi — Cyclingnews: "Big brand rivalling performance for under $250" — [Cyclingnews](https://www.cyclingnews.com/cycling-tech-components/igpsport-binavi-review/); iGS800 navigation "still buggy" with aggressive rerouting (snippet) — [Sportive Cyclist](https://www.sportivecyclist.com/igpsport-igs800-review/)
- Sigma ROX 12.1 EVO — CyclistsHub 3.7/5, "already outdated" (2026-04-05) — [CyclistsHub](https://www.cyclistshub.com/sigma-rox-12-1-evo-review/)
- Stages Dash L200 — the5krunner "GOOD"; micro-USB, ~10 h, paywall — [the5krunner](https://the5krunner.com/2022/05/12/stages-dash-l200-review-m200/)
- No 2025–26 DC Rainmaker in-depth review was found for DURA, Bryton 650, iGPSPORT BiNavi or Magene C706; GPLama and DesFit not checked.

**Danish prices, pricerunner.dk search results, lowest listed price, read 2026-10-12** (each from [pricerunner.dk search](https://www.pricerunner.dk/results?q=coros%20dura) with the model name as query)

- COROS DURA: DKK 2,299 — [pricerunner.dk](https://www.pricerunner.dk/results?q=coros%20dura)
- Bryton Rider S810: DKK 1,942 (German shop listing); S810 sensor bundle 2,465; Rider 750 SE: 1,569 — [pricerunner.dk](https://www.pricerunner.dk/results?q=bryton%20rider%20s810). Rider 650 not listed.
- iGPSPORT BSC300T: DKK 949; BSC300: 879; BSC500: 1,199; iGS630S: 1,399; BiNavi: 2,234; BiNavi Air: 1,299 — [pricerunner.dk](https://www.pricerunner.dk/results?q=igpsport%20bsc300t), [pricerunner.dk](https://www.pricerunner.dk/results?q=igpsport%20binavi%20ultra). iGS800 shown at DKK 4,588 (one listing, likely an outlier) — [pricerunner.dk](https://www.pricerunner.dk/results?q=igpsport%20igs800). BiNavi Ultra not listed.
- Sigma ROX 11.1 EVO: DKK 1,198 (down from DKK 1,336 in the 2026-09-29 Kadence note); ROX 4.0 Endurance: 1,445; ROX 2.0: 650; ROX 12.1 EVO: 4,133 (one listing, probably a bundle; list price €399.95–€499.95) — [pricerunner.dk](https://www.pricerunner.dk/results?q=sigma%20rox%2012.1%20evo)
- Magene C706: DKK 1,894; C606 V2: 1,294; C606 Pro: 1,648; C506: 894 — [pricerunner.dk](https://www.pricerunner.dk/results?q=magene%20c706)
- TwoNav Cross Plus: not found on pricerunner.dk — [pricerunner.dk](https://www.pricerunner.dk/results?q=twonav%20cross%20plus)

### Inferences

- For a recommendation that also opens a door for Kadence, COROS DURA (~DKK 2,300) is the only one in this group with a sanctioned self-serve route; it is a battery-first, small-screen unit that reviewers call basic but reliable after 2024 firmware.
- The best value hardware (Bryton 650, Magene C706, iGPSPORT BiNavi) comes with closed ecosystems: phone-bound, no API (Bryton, Magene) or company-only API (iGPSPORT), and data in Taiwan/China with no stated EU storage.
- Sigma is the only EU option: no cloud needed, EU processing when the cloud is used, but no API and dated hardware for its price.

### Gaps

- pricerunner prices came from the search-results page, not product pages; outliers (iGS800, ROX 12.1 EVO) need a check on the product page or at a Danish shop.
- No Danish price found for Bryton Rider 650 or iGPSPORT BiNavi Ultra.
- GPLama and DesFit verdicts not gathered.
