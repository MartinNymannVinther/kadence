# Hammerhead Karoo (Karoo 3, SRAM) as a platform for Kadence's own on-device software and as an open cloud integration, October 2026

All sources below were read on **2026-10-12** unless a different date is given. Dates in brackets are the source's own publication or update date. Code facts come from a clone of `hammerheadnav/karoo-ext` at commit `f79f103` (2026-08-18). Help-centre articles were read through Zendesk's public JSON API (`support.hammerhead.io/api/v2/help_center/...`), because the HTML pages return 403 to scripts. The URLs given are the ordinary article URLs. Nothing was tested on a device. No account was made and nobody was contacted.

Context from earlier Kadence notes, not redone here: `docs/research/garmin-without-partner-access.md` §6, `docs/research/workouts-to-devices.md` §4 and `docs/research/rides-in-options.md` (lines 53, 81 and 104). They cover the cloud API's shape, SRAM's privacy policy (16+, US), the 2025-05-22 licence and the 2025-11-21 developer-account article. This note checks those facts again and adds the on-device extension route.

## 1. karoo-ext: version, licence, language and what an extension can do

### Takeaway

karoo-ext is Hammerhead's Apache-2.0 Kotlin/Android library. The latest version is 1.1.9 (2026-03-17). An extension runs as an Android service that Karoo OS starts at install and at boot. It can watch the ride state (Idle/Recording/Paused), laps and every live data stream, and it can add data fields, graphical views, in-ride alerts, beeps, map symbols and FIT developer fields. It has its own settings screen, because it is an ordinary Android app.

It **cannot** put a workout into the Karoo's native workout list, start the native workout player, read the whole loaded workout, control a smart trainer or load a route. None of these is in the API.

`MakeHttpRequest` goes over the Karoo's own WiFi when it has WiFi, and otherwise through the Companion app over Bluetooth (new Karoo only). It is capped at 100 KB. An extension can also use its own HTTP client over WiFi, with no cap; one official-library extension does this.

On the Karoo 3 (Android 12), an extension that the rider has granted "All files access" can read the saved ride FITs in `FitFiles/`. So "after the ride, send the FIT to Kadence over home WiFi" is technically feasible.

### Cited Findings

**Version, licence, language, build**

- Repository: "Android library for Karoo System extensions and interactions"; licence Apache-2.0; language Kotlin; 125 stars; last push 2026-08-18 — [GitHub API, hammerheadnav/karoo-ext](https://github.com/hammerheadnav/karoo-ext)
- Releases: 1.1.9 (2026-03-17, "Add tags to manifest for sorting in extensions list", needs "KOS version 1.634.2440 and later"); 1.1.8 (2026-01-19, "Export latest data types and fields"); 1.1.7 (2025-10-23, "Add bonus buttons functionality"); 1.1.6 (2025-08-04, elevation, climbs and POI distances in navigation state); 1.1.5 (2025-03-07, ride profiles, saved devices, bikes); 1.1.4 (2025-01-17, "Add FIT file effects and capabilities") — [karoo-ext releases](https://github.com/hammerheadnav/karoo-ext/releases)
- It is used as a Gradle dependency `io.hammerhead:karoo-ext:1.x.y` from GitHub Packages. "karoo-ext is publicly available however Github Packages always requires authentication", so a build needs a GitHub token — [karoo-ext README](https://github.com/hammerheadnav/karoo-ext)
- "unlike the legacy SDK, all third-party code is now run within the third-party's own application process." Views are passed to Karoo OS as Android `RemoteViews` — [karoo-ext README](https://github.com/hammerheadnav/karoo-ext)
- Supported devices: "karoo-ext will be supported on the new Karoo and Karoo 2 devices" [FAQ updated 2026-07-30]. "Hammerhead does not provide support for the development of third party applications" — [FAQ: Hammerhead Extensions](https://support.hammerhead.io/hc/en-us/articles/31150180125083)
- Full docs: [hammerheadnav.github.io/karoo-ext](https://hammerheadnav.github.io/karoo-ext/index.html)

**HTTP (the key question)**

- The `OnHttpResponse.MakeHttpRequest(method, url, headers, body, waitForConnection = true)` docstring says: "Make an HTTP request via Karoo's best network connection. A wifi connection will be used if connected, otherwise, if supported, the request can be performed via BT to a connected companion app. Because of this, HTTP calls made via this method should be: 1. limited in size (<100K, uploading or downloading large files will take a long time) 2. targeted to an in-ride experience that is important to the current ride state." The code has `MAX_REQUEST_SIZE = 100_000` ("100KB maximum for request/response body") and rejects larger bodies with `REQUEST_TOO_LARGE`. `waitForConnection` means "Queue this request until a connection becomes available" — [KarooEvent.kt](https://github.com/hammerheadnav/karoo-ext/blob/master/lib/src/main/kotlin/io/hammerhead/karooext/models/KarooEvent.kt)
- The Bluetooth tunnel through the Companion app works on the new Karoo only. Asked about the Karoo 2, a forum reply says "This feature is only available for the latest generation of Karoo" [2025-01-02] — [forum: Http request through companion app in K2](https://support.hammerhead.io/hc/en-us/community/posts/32273642633883). ktor-client-karoo also says "Only works with the new Hammerhead Karoo. Karoo 2 is not supported" — [jonasfranz/ktor-client-karoo](https://github.com/jonasfranz/ktor-client-karoo)
- Tunnel performance: about 100 ms over WiFi against "at least 2 seconds" through the Companion app. Hammerhead (brentnd): "The BLE bridge is not going to be ideal for 'real-time' flows like this" [2025-02-14] — [karoo-ext issue #57](https://github.com/hammerheadnav/karoo-ext/issues/57). A developer (timklge) writes that "the karoo will refuse to tunnel more than ~ 150 kB per request via the companion app, and bandwidth is very low (a few kb per sec at most)" [2026-03-19] — [forum: simple HTTP requests through Companion app](https://support.hammerhead.io/hc/en-us/community/posts/48018671305499)
- Apps that use their own networking, not Hammerhead's API, get internet over WiFi only: "Internet access via the companion app is only possible by using the API provided by Hammerhead. Sideloaded apps that aren't optimized for the Karoo therefore cannot use the internet without WiFi connection" [2025-03-18, community reply, not staff] — [forum: Unable to use side loaded apps off Wifi](https://support.hammerhead.io/hc/en-us/community/posts/35054593303963)
- Direct HTTP over the Karoo's WiFi happens in practice. RouteGraph, which is in the official library, uses `OkHttpClient` to download per-country POI databases (`https://routegraph.timklge.de/pois/pois.<country>.db.gz`) for offline use, not through `MakeHttpRequest` — [karoo-routegraph NearbyPOIPbfDownloadService.kt](https://github.com/timklge/karoo-routegraph/blob/master/app/src/main/kotlin/de/timklge/karooroutegraph/pois/NearbyPOIPbfDownloadService.kt); the [Native Hammerhead Extensions list](https://support.hammerhead.io/hc/en-us/articles/51862101013019) [updated 2026-10-09] confirms it is in the library
- Hammerhead cannot act as an OAuth identity provider for extensions: "We aren't at a point right now where we can be the OAuth provider you're requiring here" [2025-01-07] — [karoo-ext issue #34](https://github.com/hammerheadnav/karoo-ext/issues/34)

**Background running and ride lifecycle**

- An extension is a `KarooExtension` (an Android `Service`) declared with intent filter `io.hammerhead.karooext.KAROO_EXTENSION` and an `extension_info.xml` — [README](https://github.com/hammerheadnav/karoo-ext), [Constants.kt](https://github.com/hammerheadnav/karoo-ext/blob/master/lib/src/main/kotlin/io/hammerhead/karooext/Constants.kt)
- From developers on the forum, not official: the extension service "is started by the karoo system as soon as the user installs the extension and on every subsequent reboot. Unlike background services on standard android, your process is never killed by the OS" [2025-05-05]. The original poster confirmed "my `KarooExtension` is indeed started when the device boots" [2025-05-06] — [forum: Receive RideState events when app is not started](https://support.hammerhead.io/hc/en-us/community/posts/36563270119707)
- Ride events: `RideState` is `Idle` ("Recording not yet started or already finished"), `Recording` or `Paused(auto)`. Consumers get the current state and then every change. `Lap(number, durationMs, trigger)` arrives on each lap change — [KarooEvent.kt](https://github.com/hammerheadnav/karoo-ext/blob/master/lib/src/main/kotlin/io/hammerhead/karooext/models/KarooEvent.kt)
- There is **no separate "ride saved" or "file written" event**. `Idle` covers both "not started" and "already finished" — [KarooEvent.kt](https://github.com/hammerheadnav/karoo-ext/blob/master/lib/src/main/kotlin/io/hammerhead/karooext/models/KarooEvent.kt)

**Data streams and rate**

- `OnStreamState.StartStreaming(dataTypeId)` streams any `DataType`. Among them: `TYPE_HEART_RATE_ID`, `TYPE_POWER_ID`, `TYPE_CADENCE_ID`, `TYPE_SPEED_ID`, `TYPE_DISTANCE_ID`, smoothed 3/5/10/30 s power, normalized power, pedal balance, torque, radar, shifting gears, lap fields (`TYPE_LAP_NUMBER_ID`, `TYPE_POWER_LAP_ID`, …), elevation, climbs, and the **workout fields of the native player**: `TYPE_WORKOUT_POWER_TARGET_ID`, `TYPE_WORKOUT_HEART_RATE_TARGET_ID`, `TYPE_WORKOUT_CADENCE_TARGET_ID`, `TYPE_WORKOUT_REMAINING_INTERVAL_DURATION_ID`, `TYPE_WORKOUT_INTERVAL_COUNT_ID`, `TYPE_WORKOUT_PRIMARY_TARGET_ID` (fields `WORKOUT_STATE`, `WORKOUT_CURRENT_STEP`, `WORKOUT_STEP_COUNT`, target min/max) — [DataType.kt](https://github.com/hammerheadnav/karoo-ext/blob/master/lib/src/main/kotlin/io/hammerhead/karooext/models/DataType.kt)
- Position: `OnLocationChanged(lat, lng, orientation)` (since 1.1.3). Rider profile: `UserProfile(weight, preferredUnit, maxHr, restingHr, heartRateZones, ftp, powerZones)`. Navigation: `OnNavigationState` (route polyline, distance, climbs, POIs) — [KarooEvent.kt](https://github.com/hammerheadnav/karoo-ext/blob/master/lib/src/main/kotlin/io/hammerhead/karooext/models/KarooEvent.kt)
- Rate: Hammerhead (brentnd) says "Our internal sensors from ANT+ or Bluetooth typically receive data at least at 1Hz but the idle timeout default is 10s" [2025-01-02] — [karoo-ext issue #30](https://github.com/hammerheadnav/karoo-ext/issues/30). FIT record values from extensions are "written to the FIT file at 1Hz" — [FitEffect.kt](https://github.com/hammerheadnav/karoo-ext/blob/master/lib/src/main/kotlin/io/hammerhead/karooext/models/FitEffect.kt)

**FIT file**

- The API writes into the ride's FIT and does not read it. `WriteToRecordMesg` (1 Hz), `WriteToSessionMesg` and `WriteEventMesg` add standard or developer fields to "the recorded FIT file for each ride" (since 1.1.4). There is no API to get the finished file — [FitEffect.kt](https://github.com/hammerheadnav/karoo-ext/blob/master/lib/src/main/kotlin/io/hammerhead/karooext/models/FitEffect.kt)
- On the **Karoo 2**, reading `/sdcard/FitFiles/` directly "gives a permission error", and the Storage Access Framework intents "don't resolve to anything" [2025-06-26] — [forum: Access to previous rides' .fit files from an extension](https://support.hammerhead.io/hc/en-us/community/posts/38365497685275)
- On the **Karoo 3**, karoo-ride-replay asks the rider on first launch to "grant **All files access** … (required to read `FitFiles/`)", and lists FIT files from `FitFiles/` and `Download/`. Its log shows `/storage/emulated/0/FitFiles/ride.fit`. It also notes "the Karoo 3's Android 12" — [lgangitano/karoo-ride-replay README](https://github.com/lgangitano/karoo-ride-replay)
- KGhost declares `android.permission.MANAGE_EXTERNAL_STORAGE` and checks `StoragePermission.hasAllFilesAccess` — [lockevod/KGhost](https://github.com/lockevod/KGhost). Hammerhead "added KGhost to the Extension Library" in build 1.658.2535 (2026-10-01) — [Software Release Notes](https://shop.sram.com/blogs/change-logs)

**Workouts, routes, trainer**

- Every `KarooEffect` in the library: `PlayBeepPattern`, `PerformHardwareAction` (button presses), `TurnScreenOff/On`, `RequestBluetooth/ReleaseBluetooth`, `RequestAnt/ReleaseAnt`, `MarkLap`, `PauseRide`, `ResumeRide`, `SystemNotification`, `InRideAlert`, `ApplyLauncherBackground`, `ShowMapPage`, `ZoomPage`, `LaunchPinDrop`. Map effects (symbols, polylines) come through `startMap`. **There is no effect to add, load or start a workout, to load a route, or to set trainer resistance or ERG** — [KarooEffect.kt](https://github.com/hammerheadnav/karoo-ext/blob/master/lib/src/main/kotlin/io/hammerhead/karooext/models/KarooEffect.kt), [MapEffect.kt](https://github.com/hammerheadnav/karoo-ext/blob/master/lib/src/main/kotlin/io/hammerhead/karooext/models/MapEffect.kt)
- A developer's feature request [2026-05-04] begins "there have been no feature updates to the SDK for the past months". It asks for "A new effect to request to keep on Wifi so that the Karoo doesn't turn it off when starting an indoor ride", "A new effect to set sim mode parameters (or erg mode watts) of a connected smart trainer" and "Optionally a way to read the complete currently loaded workout on the Karoo". VinApp replied [2026-09-29] that it "connects to the smart trainer itself so it can control it directly" — [forum: Feature request: Trainer control](https://support.hammerhead.io/hc/en-us/community/posts/49917447055515)

**UI**

- `extension_info.xml` declares `DataType`s (`graphical="true"` for custom views) and `BonusAction`s (SRAM bonus buttons and Blips, since 1.1.7). The sample shows device scanning, custom data types, custom views, "Publishing system notifications" and "Pushing in-ride alerts based on streaming ride data" — [README](https://github.com/hammerheadnav/karoo-ext)
- `InRideAlert(id, icon, title, detail, autoDismissMs, backgroundColor, textColor)` and `PlayBeepPattern(tones: frequency, durationMs)` — [KarooEffect.kt](https://github.com/hammerheadnav/karoo-ext/blob/master/lib/src/main/kotlin/io/hammerhead/karooext/models/KarooEffect.kt)
- Settings: an extension is an ordinary Android app with its own launcher activity ("Open the app from the main menu"). For example, KSafe has settings tabs on the Karoo, including webhook URL, GET/POST and headers — [awesome-karoo](https://github.com/timklge/awesome-karoo), [Karoo-KSafe README](https://github.com/lockevod/Karoo-KSafe)
- Size limits: only the 100 KB HTTP cap above was found; no APK size limit was found.

### Inferences

- **Rides in (a): technically feasible on the Karoo 3, by WiFi and without a phone.** A Kadence extension would:
  1. wait for `RideState` to go `Recording`/`Paused` → `Idle`;
  2. find the newest file in `FitFiles/` (needs the rider to grant All files access);
  3. post it with its own HTTP client (OkHttp) over the Karoo's WiFi to Kadence's existing upload-key route (ADR 0029);
  4. retry until WiFi appears.

  `MakeHttpRequest` cannot carry a ride FIT, which is usually above 100 KB, so the Bluetooth/phone path is not available for files. The unknowns are when the file is finalised after `Idle`, and whether `Idle` also fires on discard.

- **Sessions down (b): an extension cannot place a pas into the native workout list or player.** Two routes remain:
  - (i) Kadence's server pushes the .fit/.zwo through the cloud API (`POST /workouts/file?plannedDate=…`, §5). The Karoo then syncs it over its own WiFi, but via SRAM's US cloud.
  - (ii) Kadence writes its own workout player inside the extension, as VinApp/Vin-HkE do: fetch the day's session as small JSON through `MakeHttpRequest`, show targets in data fields, and use alerts and beeps at step changes. That player would not drive the trainer through the Karoo, would not get the native player's automatic lap per interval or compliance score, and would have to mark laps itself with `MarkLap`.
- Apache-2.0 code can be combined into an AGPL-3.0 app (one-way compatible). The GitHub Packages token requirement only affects CI configuration.

### Gaps

- No primary source says how long after `RideState.Idle` the FIT file is complete in `FitFiles/`, or what happens on discard. This needs a device test.
- No official Hammerhead statement on whether extensions may use direct sockets, on WiFi behaviour during and after a ride on the Karoo 3, or on the background-service guarantees. The lifecycle claims come from developers.
- No APK size limit or memory/CPU budget documented. Hammerhead fixed "an issue where some extensions could cause slowness on Karoo" (1.656.2526, 2026-09-17) — [Software Release Notes](https://shop.sram.com/blogs/change-logs).
- Whether Karoo OS has any private intent or folder from which the Workouts app imports a local .fit/.zwo: none was found in public sources.

## 2. Distribution: sideloading, the Extension Library, review, updates, terms

### Takeaway

There are three ways to install. **Sideloading** goes through the Companion app with a GitHub APK URL; it is Karoo 3 only, needs no review and gets one-tap updates from a `manifest.json`. **adb** is the route on the Karoo 2. The **official Extension Library** is on-device. Since August 2026 it is open to self-service submission: a developer account, then an SDK licensing agreement signed with SRAM, then approval by SRAM that "may take several weeks". The agreement's text is not public. A developer account only shows test builds on that developer's own Karoos, so it cannot be used to hand a private build to a team's riders.

### Cited Findings

- Companion sideloading [created 2024-12-05, updated 2025-12-18]: "You can now sideload third-party Android apps on the Karoo using an APK file or a URL linked to an APK file (New Karoo ONLY)". "Hammerhead has only verified that GitHub URLs work for sideloading." "Apps installed from a URL in GitHub can be updated from the app details page on Karoo." "Hammerhead does not provide support for troubleshooting which APKs or links work". Prerequisites: Karoo software 1.538.2049+, Android Companion 1.36.0+ / iPhone 1.12.0+, "The Karoo should be connected to Wi-Fi", the phone online. Steps: long-press the APK link → share to the Companion app → "Install" on the Karoo — [Companion App - Sideloading](https://support.hammerhead.io/hc/en-us/articles/31576497036827)
- Karoo 2: manual sideloading via `adb install`. Updates: "long-tap the app icon on the main menu and select 'Update' (works on both Karoo 2 and Karoo 3)" — [timklge/awesome-karoo](https://github.com/timklge/awesome-karoo)
- Update mechanism: the meta-data `io.hammerhead.karooext.MANIFEST_URL` points to a JSON `KarooAppManifest` (`label`, `packageName`, `latestApkUrl`, `latestVersion`, `latestVersionCode`, optional `iconUrl`, `developer`, `description`, `releaseNotes`, `screenshotUrls`, `tags`) that "Karoo System uses … for easier side-loading and updates" — [Constants.kt](https://github.com/hammerheadnav/karoo-ext/blob/master/lib/src/main/kotlin/io/hammerhead/karooext/Constants.kt), [KarooAppManifest.kt](https://github.com/hammerheadnav/karoo-ext/blob/master/lib/src/main/kotlin/io/hammerhead/karooext/models/KarooAppManifest.kt)
- Extension Library [created 2025-03-06, updated 2026-08-30]: "The Extension Library is our version of an 'App Store' … Some apps are natively available in all K2 and new Karoo Extension Libraries … riders can install the apps directly from the Karoo". Install from Apps → Extensions → Install — [Karoo OS - Extensions Library](https://support.hammerhead.io/hc/en-us/articles/34676015530907). Launched 2025-03-10 with seven apps — [DC Rainmaker, 2025-03](https://www.dcrainmaker.com/2025/03/hammerhead-karoo-adds-app-store-a-few-thoughts.html)
- **Self-service for developers** [created 2026-07-30, updated 2026-08-20]:
  - The steps: "Create a developer account at https://dashboard.hammerhead.io", then enable extension developer settings at `dashboard.hammerhead.io/developer/signup`, then "fill out the contact information, which will be used to sign an SDK licensing agreement with SRAM".
  - Testing: "You can test your application by adding a new Extension in the settings menu and adding a URL to a valid application manifest. After adding your application manifest, your app will automatically appear in the Extension Library on all Karoo devices that are signed in to your developer account."
  - Submitting and approval: "you can submit your app for approval by SRAM. Please note that it can take a few weeks for SRAM to respond". "Your submission will remain pending until the licensing agreement has been signed by both parties. After the agreement has been fully signed, the app approval process may take several weeks".
  - Updating: "Once approved, Karoo will pull the latest APK from your application manifest … riders will be prompted to update the App in the Extension Library".

  Source: [Extensions: Self-Service for Developers](https://support.hammerhead.io/hc/en-us/articles/53739708787099). The release notes for 1.650.2509 (2026-08-20) say: "We have improved the way developers can get their apps in our Extension Library" — [Software Release Notes](https://shop.sram.com/blogs/change-logs)

- Before this: "I filled out the form over a week ago and have had no response … Side-loading seems to be the simplest way right now unless your app has a name brand" [2025-09-22] — [forum: How to publish to new Extensions Library](https://support.hammerhead.io/hc/en-us/community/posts/40890359892251). A third-party note dated 2026-01-24 says "There is no documented self-service submission process … Hammerhead uses a curated/partnership model" — [Pédalons PUBLISH.md](https://github.com/glandais/tribly/tree/develop/karoo). The 2026-08 article supersedes both.
- The library is growing about every two weeks. The October 2026 list has about 35 apps, among them VinApp, Vin-HkE, Xert EBC, Best Bike Split, AI Endurance, KActions, KSafe, Headwind, Powerbar, Reminder, RouteGraph, WattRamp and 7Climb — [Native Hammerhead Extensions](https://support.hammerhead.io/hc/en-us/articles/51862101013019)
- Issues on GitHub were closed "in favor of our extension community forum" [2025-03-03] — [karoo-ext issue #30](https://github.com/hammerheadnav/karoo-ext/issues/30)
- Warning in the sideloading article: "Third-party Extensions and apps may use additional processing resources or data connections, and can result in reduced battery life" — [Companion App - Sideloading](https://support.hammerhead.io/hc/en-us/articles/31576497036827)

### Inferences

- For a Danish club, the least-friction distribution is a public GitHub release. A rider (or parent) shares the APK link to the Companion app once; after that the extension updates itself from `manifest.json`. That needs nobody's approval, but Kadence would have to say plainly that it is unofficial.
- Library inclusion would remove the phone step but binds Kadence to an SDK licence with SRAM whose terms are unknown. It should be read before Kadence commits to it.

### Gaps

- The SDK licensing agreement for extensions is not published. Its terms (data, revocation, open-source, minors) are unknown.
- No public review criteria, and nothing on whether an app limited to one platform's users (one needing a Kadence account) is accepted. Wandrer ("Requires an upgraded Wander account") and VinApp suggest account-gated apps are accepted.
- Whether the Companion app's URL sideloading works with a non-GitHub host (such as a self-hosted Kadence installation) is "only verified" for GitHub.

## 3. Precedents: extensions that talk to a platform or server

### Takeaway

No extension found uploads the ride FIT to a third-party server. KActions/KSafe fire webhooks at ride start and stop without the file. Pédalons is the closest model for a team platform: a device-code login on the Karoo, a list of the team's routes, and one tap to sync. But the route reaches the Karoo **through Hammerhead's cloud**: Pédalons' server pushes it via the public API. VinApp/Vin-HkE are the precedent for a training platform with its own plan and workout player on the Karoo.

### Cited Findings

- **Pédalons Karoo extension** (French team-ride platform, source-available PolyForm Noncommercial): "Browse the upcoming rides of your Pédalons teams", "One-tap sync to Karoo", "Device code authentication (no typing on Karoo)" using "OAuth Device Code flow (RFC 8628)" with a QR code. Its UI text: "Your routes reach the Karoo through Hammerhead. Finish linking it on your phone." The code calls `POST $baseUrl/api/device/routes/{team}/{route}/sync?type=hammerhead` and uses `HttpClient(Karoo(karooSystemService))`, i.e. `MakeHttpRequest` via ktor-client-karoo. Install is by adb — [glandais/tribly/karoo](https://github.com/glandais/tribly/tree/develop/karoo); listed in [awesome-karoo](https://github.com/timklge/awesome-karoo)
- **KActions** (MIT, in the official library): "allows to execute webhooks and send automated messages (whatsapp or sms with live tracking) when you start, stop your activity" — [Native Hammerhead Extensions](https://support.hammerhead.io/hc/en-us/articles/51862101013019), [lockevod/Karoo-KActions](https://github.com/lockevod/Karoo-KActions)
- **KSafe** (successor, in the library since 1.632.2430, 2026-05-14): "two webhook slots fire any HTTP endpoint (GET or POST) through the Karoo network bridge — same path used for emergency alerts, works over Bluetooth tether". It also says "KSafe sends messages through your phone's internet connection via the Hammerhead Companion app" — [Karoo-KSafe README](https://github.com/lockevod/Karoo-KSafe)
- **VinApp / Vin-HkE** (closed source, freeware, both in the library): Vin-HkE has a "Workout player", virtual partner and alerts — [awesome-karoo](https://github.com/timklge/awesome-karoo). VinApp: "It is an independent training system that can turn your Karoo into your cycling training agenda: your training plan, your scheduled sessions, your workout library and the tools to actually execute those workouts" [2026-09-29] — [forum: VinApp Extension](https://support.hammerhead.io/hc/en-us/community/posts/56494925858971)
- **Xert EBC**, **Best Bike Split** (race-plan pacing fields) and **AI Endurance** (records RR intervals "for HRV analysis in AI Endurance") are training platforms with official extensions — [Native Hammerhead Extensions](https://support.hammerhead.io/hc/en-us/articles/51862101013019)
- **Workout+** (Apache-2.0, 2026-10): it redraws the native workout page on the Karoo 2 "while a structured workout runs", reading the native player's state — [angkyria/karoo-workout-plus](https://github.com/angkyria/karoo-workout-plus)
- **veloVigil**: "Telemetry syncs to rider's own Cloudflare backend", "Offline-first telemetry buffering with automatic sync" — a self-hosted-backend precedent, but for telemetry, not the FIT — [awesome-karoo](https://github.com/timklge/awesome-karoo)
- **karoo-garmin-sync** is a Python script run on a computer, not an extension: "This application will synchronize all rides from Hammerhead Karoo to Garmin Connect" (last push 2024-11-07) — [rolanddb/karoo-garmin-sync](https://github.com/rolanddb/karoo-garmin-sync)
- **Squadrats** / **Tilehunting**: "Sync uses the Karoo's built-in HTTP mechanism (WiFi, or Bluetooth via the companion app)" — [awesome-karoo](https://github.com/timklge/awesome-karoo)
- Searching GitHub for `FitFiles` together with `karooext` found only KGhost and the awesome-karoo list. No intervals.icu-specific extension repository was found (`gh search repos "karoo intervals"`, 0 hits) — [GitHub code search](https://github.com/search?q=FitFiles+karooext&type=code)

### Inferences

- A Kadence extension doing "FIT up after the ride" would be new, though each part has a precedent: lifecycle triggers (KActions), All files access to `FitFiles/` (KGhost, ride-replay) and direct WiFi HTTP (RouteGraph).
- Pédalons shows that an independent platform can ship a polished pairing flow with RFC 8628. It also shows that even it relies on Hammerhead's cloud to get content into native Karoo features.

### Gaps

- Not verified whether any extension in the library already uploads FIT files.
- The earlier Kadence note's "extension that fires a webhook at the end of a ride … without the file" matches KActions/KSafe. No file-carrying variant was found.

## 4. Native integrations: workouts down, rides up

### Takeaway

Workouts reach the Karoo natively from TrainingPeaks, intervals.icu, TrainerRoad and Xert (linked in the Hammerhead/SRAM dashboard), from files imported on the dashboard, and from any public-API partner. The Karoo pulls them **over its own WiFi with no phone**, or through the Companion app. Scheduled workouts get a "Today" tag and a Control Center notification. Finished rides upload on their own over the Karoo's WiFi to the SRAM dashboard and from there to linked services, queued until a connection exists.

### Cited Findings

- Linked third-party accounts: "AXS, Intervals.icu, Komoot, Ride with GPS, Sentiero, Strava, Suunto, TrainerRoad, TrainingPeaks, Xert … we'll import/sync rides, workouts, and key data points … You can also publish your rides out to third-party services automatically" [updated 2026-07-27] — [Dashboard - Linking Third-Party Accounts](https://support.hammerhead.io/hc/en-us/articles/360006755614)
- Workouts [updated 2026-08-30]:
  - "Workouts can be imported from your connected Third-party accounts or imported through the Dashboard."
  - "A notification will appear in the Control Center whenever you have a workout scheduled for 'Today'."
  - "NOTE: We do not support RPE-based workouts."
  - Workouts start from the Workouts app → "Follow Workout". "Karoo automatically starts a new lap at the beginning of each workout interval".
  - The rider gets workout control (skip/rewind), workout scale (intensity ±) and pause fields.

  Source: [Karoo OS - Workouts](https://support.hammerhead.io/hc/en-us/articles/18001019006363)

- Dashboard import [2024-05-10]:
  - "The next time your Karoo connects to the internet, this workout will sync to it".
  - ZWO steps limited to Warmup/Cooldown/FreeRide/IntervalsT/SteadyState. "MaxEffort" and "Ramp (coming soon)" are unsupported, as are "Zone-based power targets".
  - FIT workouts need absolute or % targets (power, HR, cadence, speed); "Zone targets (Power and HR) are not supported".
  - "Distance-based workouts … will be converted and imported as time-based workouts".

  Source: [Dashboard - Importing ZWO & FIT based Workouts](https://support.hammerhead.io/hc/en-us/articles/4416694669851)

- Without a phone: "Karoo is an entirely standalone device … Use your home WiFi to sync your routes, activities, training programs" [2024-08-09, written for the Karoo 2] — [Do I need a phone to use Karoo 2?](https://support.hammerhead.io/hc/en-us/articles/360052491734)
- Companion path (new Karoo only): "You can also sync any new Routes/Workouts from your Dashboard onto your Karoo using the Companion App … Otherwise, your Karoo will sync the new route or workout the next time it is on Wi-Fi". A link or file shared to the Companion app "will then be turned into a route or workout" — [Companion App - Uploads and Syncing](https://support.hammerhead.io/hc/en-us/articles/25476943333275)
- Ride upload: "You can set your completed rides to be auto-upload to Strava, Suunto, AXS Web, TrainerRoad, TrainingPeaks, Ride With GPS, Komoot, and Xert directly from your Karoo … The ride will automatically get uploaded when you hit the '✓' button. Note: If the Karoo does not have an active internet connection, the upload will be queued in the background until you connect to the Internet" — [Karoo OS - Auto Upload to Third-Party websites](https://support.hammerhead.io/hc/en-us/articles/25674993682971). This needs the rider signed in: "To have your rides uploaded from the Karoo to the Dashboard automatically, you have to log in" — [Karoo OS - Logging in and Logging out](https://support.hammerhead.io/hc/en-us/articles/25325284260635)
- Recent workout features: compliance score and workout graph in the post-ride summary (1.632.2430, 2026-05-14); "Next Primary Target" fields (1.630.2420, 2026-04-30); "Training Metrics sync … FTP, power & HR zones, and weight … from TrainingPeaks, Strava, intervals.icu, and any third-party connecting through the public API" (1.638.2460, 2026-06-25); "workouts imported through a third-party utilize planned dates" (1.583.2239, 2025-09-18) — [Software Release Notes](https://shop.sram.com/blogs/change-logs)
- WiFi during rides: "Wi-Fi will be turned off for battery savings when starting a ride" (Karoo 1 article) — [Karoo 1 - Live Tracking](https://support.hammerhead.io/hc/en-us/articles/360040810074). 1.571.2185 (2025-07-10): "Karoo 2 ONLY: We've added a toggle for Wi-Fi to remain on when a ride is started" — [Software Release Notes](https://shop.sram.com/blogs/change-logs)

### Inferences

- Through the cloud, the Karoo already does what Kadence wants for (b): a pas pushed with `plannedDate` shows as "Today" on the Karoo after a WiFi sync, with no phone. The cost is that it passes through SRAM's cloud and account.
- For (a), the native path is Karoo → SRAM cloud → Kadence (webhook + FIT, §5). An extension is the only route that avoids SRAM's cloud.

### Gaps

- No primary source on the new Karoo's default WiFi behaviour at ride start. Only Karoo 1, Karoo 2 and a forum request (§1) say WiFi turns off during rides.
- Whether TrainingPeaks and intervals.icu push only planned workouts or also libraries was not checked in their own docs.

## 5. The cloud API today (Oct 2026)

### Takeaway

The public API is live and was extended during 2025–26. `POST /workouts/file` now takes `plannedDate`, workouts and routes can be updated and deleted, and `POST /metrics` pushes FTP and zones. The OpenAPI file was last modified 2026-09-24. The developer account is still described as self-serve (article 2025-11-21, unchanged). The licence text is still "Last Modified: May 22, 2025" and still says keys are obtained "by emailing". No rate limits are documented.

### Cited Findings

- The OpenAPI 3.1 spec is served at `/v1/docs/openapi.yml` with HTTP `last-modified: Thu, 24 Sep 2026`. Base `https://api.hammerhead.io/v1/api/`; OAuth 2.0 authorization code at `https://api.hammerhead.io/v1/auth/oauth/authorize` and `/oauth/token` (refresh tokens supported), `/oauth/deauthorize`. "users will be allowed to select a subset of scopes from the ones requested" — [Hammerhead API docs](https://api.hammerhead.io/v1/docs)
- Scopes: `activity:read` ("read activities and be notified of new ones"), `route:read`, `route:write`, `workout:write` ("push workouts"), `metrics:write` ("push training metrics") — [Hammerhead API docs](https://api.hammerhead.io/v1/docs)
- Endpoints:
  - Activities: `GET /activities`, `GET /activities/{id}`, `GET /activities/{id}/file` (`application/vnd.ant.fit`).
  - Routes: `POST /routes/file` (.gpx .fit .tcx .kml .kmz), `PUT /routes/{id}/file`, `DELETE /routes/{id}`.
  - Workouts: `POST /workouts/file` (multipart, ".fit .zwo", optional query `plannedDate` "YYYY-MM-DD"), `PUT /workouts/{id}/file`, `DELETE /workouts/{id}`.
  - Metrics: `POST /metrics` (weightInKilograms, maxHr, restingHr, heartRateZones, powerFtp, powerZones; "Any unprovided fields are left editable by the user").

  Source: [Hammerhead API docs](https://api.hammerhead.io/v1/docs)

- Webhook: "Activity sync" POST with `{activityId, userId}`, signed with `X-Hmac-Signature` ("HMAC SHA256 signature of the body using your webhook secret as the key"). Response: "Hopefully successful, errors are ignored" — [Hammerhead API docs](https://api.hammerhead.io/v1/docs)
- No rate-limit statement anywhere in the spec (text search for "rate"/"limit" found only pagination) — [openapi.yml](https://api.hammerhead.io/v1/docs/openapi.yml)
- Developer account [2025-11-21, not updated since]:
  1. "Create a developer account on the Hammerhead Dashboard".
  2. Enable it at `dashboard.hammerhead.io/partner/signup`.
  3. Define app name, description and SVG logo.
  4. "Accept the API Licensing agreement".
  5. Then an API settings tab shows "Client ID, Client Secret, Redirect URLs, Webhook secret, Webhook URLs".

  Questions go to `hammerhead.integrations@sram.com` — [Creating a Developer Account](https://support.hammerhead.io/hc/en-us/articles/43558376710683)

- Licence [page updated 2026-07-20; text "Last Modified: May 22, 2025"]:
  - Contracting party: "SRAM, LLC".
  - The licence is "limited, revocable, non-exclusive … solely for your internal business purposes".
  - "You must obtain an API Key through the registration process by emailing hammerhead.integration@sram.com" (singular "integration", unlike the article). "Your API Key may be revoked at any time by us".
  - Forbidden: using the API "to replicate or attempt to replace the user experience of the Company Offering".
  - "we reserve the right to start charging for access".
  - "You agree that you are solely responsible for posting any privacy notices and obtaining any consents from your end users".

  Source: [API Licence Document](https://support.hammerhead.io/hc/en-us/articles/42738760915099)

- Changes from the release notes:
  - 1.583.2239 (2025-09-18): "connected third-parties can now delete Hammerhead routes and workouts … workouts imported through a third-party utilize planned dates".
  - 1.600.2303 (2025-12-11): "anytime a third-party connection utilizing the public API is disconnected by the user, previously imported routes and workouts are automatically removed".
  - 1.618.2377 (2026-03-05): the dashboard shows "the logo of third parties using the public API to sync routes and workouts" and lets users disconnect them.
  - 1.638.2460 (2026-06-25): metrics sync via the public API.

  Source: [Software Release Notes](https://shop.sram.com/blogs/change-logs)

### Inferences

- The API fits Kadence's `DeviceProvider` better than in September: `plannedDate` maps to the pas date, `PUT`/`DELETE` let Kadence keep the Karoo's list in step when a coach moves or deletes a pas, and `/metrics` could push FTP and zones **without weight** (fields left out stay editable), which fits Kadence's no-weight rule.
- The self-serve article and the licence still disagree about how a key is obtained. Kadence would hold one SRAM client per installation (or one per Kadence operator), revocable at will.

### Gaps

- Not verified that the self-serve flow issues working keys without an e-mail step, how many users a client may serve, or whether a self-hosted installation may register its own client.
- No public changelog of the API itself beyond the release-note lines above. Rate limits and webhook retry policy are undocumented ("errors are ignored").

## 6. Account, age, offline use and where data is processed

### Takeaway

The Karoo works for riding without an account, at least per the Karoo 1 onboarding, which has a documented "Skip Onboarding". But auto-upload, dashboard sync, workouts from platforms, the Companion app and the developer test path all need a SRAM account (Hammerhead accounts were migrated to SRAM accounts). SRAM's privacy policy (2025-12-02) says the services are "not intended for children under 16". Hammerhead's older terms say under 13. The controller is SRAM, LLC in Chicago, with transfers from the EU to the US.

### Cited Findings

- "All Hammerhead accounts have been migrated to SRAM accounts" [updated 2026-09-28] — [Hammerhead Dashboard - SRAM Account Migration](https://support.hammerhead.io/hc/en-us/articles/25753466615195)
- Sign-in by QR code on the Karoo, or the SRAM account in Settings → My Account. "Sign-in security tokens on the device expire after 60 days. If your device stops syncing … it may be necessary to sign back in" [updated 2026-07-03] — [Karoo OS - Logging in and Logging out](https://support.hammerhead.io/hc/en-us/articles/25325284260635)
- Karoo 1 onboarding: "Steps to skip the Karoo Onboarding process: Tap on 'ⓘ HELP' … Select 'Skip Onboarding'. You will be taken directly to the Home Screen" [2024-04-14] — [Karoo 1 - Onboarding](https://support.hammerhead.io/hc/en-us/articles/360057305494)
- Developer-side account verification: 1.594.2280 (2025-11-13) "added an account verification step on Karoo sign-in for unverified Hammerhead accounts" — [Software Release Notes](https://shop.sram.com/blogs/change-logs)
- Offline features: "Karoo Share allows riders to easily share routes and profiles with each other directly from one Karoo to another. No phone or internet required" (1.620.2390, 2026-03-19); offline maps — [Software Release Notes](https://shop.sram.com/blogs/change-logs)
- SRAM Global Privacy Policy, "Updated: December 2, 2025": "The Services, including our websites and applications, are not intended for children under 16 years of age". The controller is SRAM, LLC, 1000 W Fulton Market, Chicago. EU→US transfers use adequacy decisions, standard clauses or art. 49 derogations. Collected data includes geolocation and "biometric information … and other health and vital information" — [SRAM Global Privacy Policy](https://www.sram.com/en/company/legal/global-privacy-policy). The Hammerhead OpenAPI's `termsOfService` links to the same policy — [Hammerhead API docs](https://api.hammerhead.io/v1/docs)
- Conflicting older text: Hammerhead Navigation, Inc.'s Terms of Use (help article updated 2026-05-04): "The Site is not intended for and is not designed to attract children under 13 years of age", and it refers to an iubenda-hosted "Hammerhead Privacy Policy" — [What are the terms of use of your devices?](https://support.hammerhead.io/hc/en-us/articles/115006125208)

### Inferences

- For U17 riders (15–16), a SRAM account is officially not meant for them. A Kadence extension that uploads straight from the Karoo to Kadence over WiFi, with the rider never signing in to SRAM, would keep minors' rides out of SRAM's US cloud. That is the strongest data-protection argument for the on-device route.
- The cloud route (§5) fits riders of 16 and over, as the earlier notes already proposed.

### Gaps

- Not verified on a Karoo 3 that onboarding can still be skipped and the device used fully without an account. The skip text is for the Karoo 1. Kadence's extension route depends on this, and on sideloading via the Companion app, which itself needs the Companion app paired. Whether the Companion app requires a SRAM login was not verified.
- Whether a Karoo 3 without a SRAM account can install from the Extension Library is unknown.
- The SDK (extension) licence's data terms are unknown (§2).

## 7. The product: hardware, software, reliability, reviews, future, price

### Takeaway

The Karoo 3 (sold as "Karoo", May 2024) is a well-reviewed, touchscreen-first Android computer. It has a 3.2-inch 292 ppi Gorilla Glass screen, five buttons, WiFi, Bluetooth and ANT+, **no SIM/LTE**, 118 g, a 15-hour claim (12–13 h measured by DCR) and a 35-hour battery-save mode. Software ships about every two weeks. The Karoo 2 lost updates in early 2026 after about six years.

Reliability is generally good, with episodic regressions; the latest was a GPS-loss and freeze bug fixed on 2026-10-07. No successor has been announced. In Denmark it costs from DKK 2,995 (Pricerunner, 2026-10-12). The US list price is now USD 525.

### Cited Findings

**Hardware**

- Official specifications [2024-05-17]:
  - Size and weight: "102.8 x 61.7 x 19.9 mm and weighs 118.1 grams".
  - Screen: "3.2" screen … 292 pixels-per-inch, anti-glare Corning Gorilla Glass, and a responsive touchscreen".
  - Storage and processor: 64 GB storage, "Quad-core 2.0Ghz CPU with 4GB of RAM".
  - Ruggedness: IP67, tested from −10 °C to 50 °C.
  - Satellites: "GPS, GLONASS, GALILEO, SBAS, and MULTI-BAND GNSS".

  Source: [Karoo - Hardware Specifications](https://support.hammerhead.io/hc/en-us/articles/25687624385691)

- Changes from the Karoo 2, per DC Rainmaker [2024-05]:
  - five physical buttons (two on each side plus a new power button);
  - WiFi, Bluetooth Smart and ANT+;
  - "removed SIM card slot";
  - 3,200 mAh battery;
  - claimed "at least 15 hours", measured "about 12-13hrs";
  - "much brighter screen, a loud AF beeper";
  - launch price USD 474.

  Source: [DC Rainmaker Karoo 3 review](https://www.dcrainmaker.com/2024/05/hammerhead-new-karoo-3-review-upgrade.html)

- Runs Android 12 ("the Karoo 3's Android 12") — [karoo-ride-replay README](https://github.com/lgangitano/karoo-ride-replay). "Hammerhead devices are not Google Play Certified devices" — [FAQ: Hammerhead Extensions](https://support.hammerhead.io/hc/en-us/articles/31150180125083)

**Reviews**

- BikeRadar (Warren Rossiter, 2025-01-30): 4/5, "a serious challenger to Garmin and Wahoo", best for SRAM AXS users.
  - Pros: touchscreen, AXS integration, routing, climb tool, "Frequent software updates".
  - Cons: audio alerts reset at startup, limited Shimano Di2, weaker Companion app.
  - Price: GBP 450 / EUR 500 / USD 475.
  - Battery: 15 h standard, 35+ h in battery save ("just over 25 hours" with navigation).

  Source: [BikeRadar review](https://www.bikeradar.com/reviews/training/gps-computers/cycle-computers/hammerhead-karoo-3-review)

- DC Rainmaker on the library [2025-03]: Hammerhead should ensure "lower barriers to entry" for hobbyist developers, as with Garmin's Connect IQ. Ki2 (Shimano Di2) is kept out of the library because of reverse-engineered code — [DC Rainmaker](https://www.dcrainmaker.com/2025/03/hammerhead-karoo-adds-app-store-a-few-thoughts.html)
- A 2026 long-term review (byline "Tom Brennan", 2026-05-03, 9,400 km, 9.0/10) reports about 10.5 h on a race-day setup and "Two ERG mode ride file corruptions in 18 months" — [cyclingarchives.com](https://cyclingarchives.com/hammerhead-karoo-3-review-2026-sram-built-gps-cycling-computer-tested/). **Low reliability as a source.** It names integrations (Today's Plan, Final Surge) that are absent from Hammerhead's own list of linked accounts, and gives a price "unchanged since May 2024" that contradicts SRAM's store (USD 525).

**Software cadence and reliability**

- "Hammerhead regularly releases software updates … as often as multiple times a month … the Hammerhead One, the Hammerhead Karoo 1, and the Hammerhead Karoo 2, no longer receive software updates" [updated 2026-08-22] — [Frequency of Hammerhead Software Updates](https://support.hammerhead.io/hc/en-us/articles/25220913976731)
- The release feed shows a build about every two weeks: 1.661.2545 (2026-10-07), 1.658.2535 (2026-10-01), 1.656.2526 (2026-09-17), 1.652.2514 (2026-09-03), 1.650.2509 (2026-08-20), 1.640.2470 (2026-07-09), 1.638.2460 (2026-06-25) … From spring 2026 most entries are marked "New Karoo ONLY" — [Software Release Notes](https://shop.sram.com/blogs/change-logs)
- The Karoo 2 lost regular updates after the first release of 2026, announced in about October 2025 — [Cycling Weekly](https://www.cyclingweekly.com/products/hammerhead-is-ending-karoo-2-updates-but-im-not-ready-to-let-go) (search snippet only; the page could not be read); [forum: End of support for Karoo2](https://support.hammerhead.io/hc/en-us/community/posts/42385459475355) [2025-10-21]
- October 2026 regression: "Some riders may experience GPS loss during a ride … The Hammerhead Developers have identified a settings/software change late last week that caused the issue" [2026-10-05, 41 comments] — [Known Issue: Karoo - No GPS/Acquiring GPS](https://support.hammerhead.io/hc/en-us/community/posts/56801815634715). Fixed in 1.661.2545 (2026-10-07): "We fixed an issue that resulted in riders losing GPS signal during the ride" — [Software Release Notes](https://shop.sram.com/blogs/change-logs). The same week a user reported freezes "five times on the ride", after the latest update [2026-10-02] — [forum: Karoo 3 freezing mid-ride](https://support.hammerhead.io/hc/en-us/community/posts/56676793844123)
- Shimano: Hammerhead removed Di2 functions at Shimano's request after SRAM bought it (2022) — [Bicycle Retailer](https://www.bicycleretailer.com/product-tech/2022/05/27/shimano-asks-sram-owned-hammerhead-remove-di2-functions-its-head-unit)

**Future and SRAM's commitment**

- No announcement of a new Karoo was found. A forum user speculates about "Karoo 4 … user-replaceable battery because of new EU rules" [2026-04-29]; this is speculation only — [forum: No more updates for Karoo 2?](https://support.hammerhead.io/hc/en-us/community/posts/49628090405915)
- No report of Hammerhead layoffs was found (search 2026-10-12). SRAM bought Hammerhead with the acquisition completed 2021-12-30 — [DC Rainmaker 2022](https://www.dcrainmaker.com/2022/01/sram-acquires-hammerhead-maker-of-karoo-bike-computers.html)
- Signals of continued investment: the self-service extension pipeline (2026-08), new library apps in nearly every release, the public API extended (2025-09 to 2026-06), and the SRAM account migration — [Software Release Notes](https://shop.sram.com/blogs/change-logs)
- Counter-signals: karoo-ext's last feature release was in early 2026, and a developer notes "no feature updates to the SDK for the past months" [2026-05-04] — [karoo-ext releases](https://github.com/hammerheadnav/karoo-ext/releases), [forum: Trainer control](https://support.hammerhead.io/hc/en-us/community/posts/49917447055515). Issues #81–#93 (2026-09/10) were open without a reply on 2026-10-12 — [karoo-ext issues](https://github.com/hammerheadnav/karoo-ext/issues)

**Price**

- Pricerunner.dk, "Hammerhead Karoo GPS Bike Computer": lowest DKK 2,995.00. Offers seen: 2,995, 2,995, 3,137.37 and 3,949. Two more figures (2,889, 2,557.98) could not be tied to a shop or new condition — [Pricerunner.dk](https://www.pricerunner.dk/pl/692-3307417080/Cykeltilbehoer/Hammerhead-Karoo-GPS-Bike-Computer-Sammenlign-Priser). The earlier Kadence note had DKK 3,275–3,949 on 2026-09-29 (`docs/research/garmin-without-partner-access.md` §6).
- SRAM's US store: USD 525.00 (product JSON, updated 2026-10-12) — [shop.sram.com/products/karoo](https://shop.sram.com/products/karoo). The launch price was USD 474.99 / EUR 499.99 / GBP 449.99 — [Cyclingnews](https://www.cyclingnews.com/news/hammerhead-launches-new-karoo-smart-bike-computer-and-companion-app/) (search snippet).
- EUR street prices from search snippets, unverified (pages returned 403): r2-bike EUR 379.50 with "MSRP €559.00" — [r2-bike](https://r2-bike.com/HAMMERHEAD-Karoo-Bike-Computer-3rd-Generation); Bike24 EUR 277.30 — [Bike24](https://www.bike24.com/p2819215.html) (implausibly low; treat as unverified).

### Inferences

- For a teenage road racer, the Karoo is a credible, actively maintained choice at DKK 3,000. The weak points are no Di2 integration, the need for a SRAM account for most cloud features, which is officially 16+, and occasional regressions after the fortnightly updates. On support life, the Karoo 2 got about six years, so a Karoo 3 bought in 2026 plausibly has several years left, but SRAM has not committed to a date.
- Among commercial computers, the Karoo is the most programmable platform found for Kadence: a sideloaded Android app with ride-state hooks, file access and WiFi.

### Gaps

- No EUR price from an official SRAM EU store could be read (the store redirects to the US shop). Danish shop pages were not opened one by one.
- No GPLama or Cycling Weekly full review from 2025–2026 was read. DC Rainmaker has no 2026 Karoo review that was found.
- No primary source on SRAM's Hammerhead roadmap or staffing.
