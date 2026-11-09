# Digitale, adaptive og AI-drevne træningssystemer: modeller, logik og evidens

Læst 9. november 2026. Baggrundsnote til Kadences egen træningsmodel.
TrainingPeaks er dækket i `../trainingpeaks-analyse.md` og
`../trainingpeaks-premium.md` og gentages ikke her; TrainingPeaks' egne
begreber (TSS, CTL, ATL, TSB, NP, IF) er varemærker og nævnes kun, hvor
en kilde selv bruger dem.

Mærkning: **[læst]** = fuld tekst læst, **[abstract]** = kun
abstract/metadata læst, **[søgning]** = kun set i søgeresultater eller
sekundære kilder, ikke åbnet. Søgebudgettet løb tør midt i arbejdet, så
en række huller er markeret som netop huller frem for at blive gættet.

---

## 1. Systemerne og deres offentliggjorte logik

### Takeaway

Alle de kommercielle systemer bygger på tre offentlige byggesten:
Banisters impuls-respons-model (1975), en belastningsenhed (TRIMP, en
effekt-baseret stress-score eller sRPE) og en effekt-varighedsmodel
(FTP eller kritisk effekt/W′). Det, der er proprietært, er altid det
samme lag: hvordan systemet går fra tilstand til _anbefaling_. Ingen af
dem har offentliggjort en uafhængig evaluering af, at anbefalingsmotoren
giver bedre resultater end en fast plan.

### Cited Findings

**TrainerRoad – Adaptive Training og Progression Levels** (USA; lanceret
som lukket beta 25. februar 2021)

- Progression Levels er en skala 1–10 pr. zone i syv zoner (Endurance,
  Tempo, Sweet Spot, Threshold, VO2 Max, Anaerobic Capacity, Sprint) og
  beskrives som "dynamic, changing, real-time markers of progress";
  input er seneste pas, forholdet mellem zonerne, træningshistorik og
  svar på spørgeskemaet efter passet. Workout Levels er en skala 1–10
  for hvert pas i biblioteket, ens for alle, og tager højde for
  gentagelser, intervallængde og pause ud over TSS/IF (deres termer).
  Kombinationen giver fem sværhedsgrader: Achievable, Productive,
  Stretch, Breakthrough, Not Recommended. [læst]
  — https://www.trainerroad.com/blog/how-to-use-adaptive-training/
- Tilpasninger ændrer ikke passets struktur eller intensitet; de
  skifter _hvilket_ pas der ligger i kalenderen. Efter hvert pas, hvert
  web-besøg og hver app-åbning tjekkes der for ændringer; så vises
  "Adaptations Pending", og atleten trykker "Accept Adaptations". Et
  spørgeskema efter passet (Easy, Moderate, Hard, Very Hard, All Out,
  kan besvares op til syv dage senere) kan "affirm or correct" det,
  systemet selv har udledt; pauser midt i arbejdsintervaller tolkes
  som tegn på, at passet var for hårdt. Pauser, sygdom og skade kan
  markeres i kalenderen, og niveauerne sænkes automatisk efter fravær.
  [læst] — samme kilde
- AI FTP Detection estimerer FTP ud fra al træning med effektdata (inde,
  ude, strukturerede og ustrukturerede ture, også fra Zwift og ROUVY) og
  tilbydes hver 28. dag; atleten accepterer eller afviser, og en
  ventende værdi sænkes automatisk, hvis formen falder inden accept.
  Eneste præcisionsudsagn er kvalitativt: modellen "was trained on an
  enormous data set and can predict decreases in FTP even after long
  (weeks to months) training interruptions". Ingen fejlrate oplyst.
  [læst] — https://support.trainerroad.com/hc/en-us/articles/4406225507867-AI-FTP-Detection
- Ved lanceringen talte TrainerRoad om "an unprecedented data set", men
  gav ingen tal for ture eller atleter; hvis rytteren forbedrer sig,
  byttes passet til et hårdere af samme varighed med højere IF og TSS
  (deres termer), og rytteren kan acceptere eller lade systemet rette
  automatisk. [læst] — https://road.cc/content/tech-news/trainerroad-launches-adaptive-training-281199
- Hvad der er proprietært: hele ML-laget ("an internally developed
  machine learning system"). Ingen peer-reviewed publikation, ingen
  uafhængig evaluering fundet. Patentsøgning kunne ikke gennemføres
  (søgebudget). [søgning]

**Xert** (Baron Biosystems, Canada; Armando Mastracci)

- Fitness Signature er tre tal: Threshold Power, High Intensity Energy
  (HIE) og Peak Power; de giver Maximal Power Available (MPA)
  sekund for sekund, og signaturen opdateres primært gennem
  "breakthroughs" (ture hvor effekten overstiger den modellerede MPA).
  En signatur uden nyligt breakthrough markeres som "stale".
  Beta-programmet blev annonceret 28. februar 2016 med løftet om at
  undgå "difficult and often inaccurate tests". [læst]
  — https://forum.slowtwitch.com/t/xert-beta-program-advanced-power-data-analytics-1/715844
  ; hjælpecenter-artikler kun set i søgning (403 ved hentning) [søgning]
- XSS (Xert Strain Score): "100 XSS means 1 hour at Threshold Power,
  unfatigued, for every athlete"; belastningen pr. sekund deles i low,
  high og peak strain, som akkumuleres og "used in fitness prediction"
  i tre separate impuls-respons-modeller. Mastracci indrømmer samme
  sted, at "XSS isn't accounting for central fatigue, at least not
  directly". [læst] — https://forum.xertonline.com/t/xss/6793
  (Mastracci som "xertedbrain", 1. februar 2017)
- Mastracci skrev i juli 2025 i Intervals.icu-forummet, at Xert
  "extends the Morton three-parameter model" og har "improved Banister's
  model". [læst] — https://forum.intervals.icu/t/three-dimensional-impulse-response-model/109644
- Træningsrådgiveren (Xert Adaptive Training Advisor, XATA) foreslår
  dagens pas ud fra nylig træning, friskhed og mål; standardprogrammet
  "Continuous Improvement" har et fokus på ca. 6 minutters effekt.
  [søgning] — Xert Help Center (baronbiosys.zendesk.com), set via søgning
- Ingen uafhængig validering af signaturudtrækket eller rådgiveren
  fundet. Modellen er i sin kerne en kritisk effekt-/W′-model med et
  ekstra parameter (Peak Power), hvilket er offentligt (Morton 1996),
  mens udtrækket og rådgiverens regler er lukkede.

**Wahoo SYSTM / 4DP** (tidligere The Sufferfest)

- 4DP måler fire tal: Neuromuscular Power ("typically sustained for 5
  to 15 seconds"), Anaerobic Capacity (ca. 1 minut, trættet), Maximal
  Aerobic Power (3–8 minutter, testet som 5 minutter) og FTP
  (20-minutters indsats). Testen Full Frontal måler alle fire;
  rampetesten Half Monty måler FTP og MAP og _estimerer_ de to andre.
  Seks ryttertyper (Sprinter, Attacker, Pursuiter, Time Trialist,
  Climber, Rouleur). Wahoo skriver selv: "Your Rider Type isn't
  prescriptive; it's diagnostic." Ingen studier eller data nævnt.
  [læst] — https://eu.wahoofitness.com/blog/wahoo-athlete-profile-why-4dp-is-the-best-cycling-training-power-methodology/
- Hvert interval i et pas indekseres til den af de fire dimensioner,
  det belaster, i stedet for FTP plus en fast multiplikator. Planerne
  er ikke adaptive: ugedage kan ikke vælges, og at flytte ét pas tager
  "four mouse clicks" ("a royal PITA"). [læst] — Brian Gray,
  Slowtwitch, 4. marts 2022, https://slowtwitch.com/training/wahoo-systm-long-term-review/
- Wahoo anbefaler gentest hver 8.–12. uge; Neal Henderson er "Head of
  Sports Science" og krediteres for 4DP; Mac Cassin optræder i Wahoos
  sportsvidenskabelige podcast. Ingen af delene kunne verificeres i
  en primærkilde (Cyclingnews-artiklen hentede kun overskriften).
  [søgning]
- Hvad der er offentligt: de fire mål og testprotokollen. Proprietært:
  hvordan pasintensiteter afledes af profilen. Ingen uafhængig
  validering fundet.

**JOIN** (Nederlandene; Jim van den Berg)

- Van den Berg beskriver selv algoritmen som en opskalering af "the
  daily decisions I made as a coach". Udviklingen begyndte i 2019, de
  første adaptive planer kom oktober 2020. Planen justeres efter
  "how hard a session felt (Rate of Perceived Exertion)" og efter
  tilgængelig tid, med en "Polarized training balance". Ingen studier,
  universiteter eller publikationer nævnes. [læst]
  — https://join.cc/cycling-tips/the-story-of-join-how-an-adaptive-training-app-changed-cycling
- Van den Berg har læst human movement science, har en grad i
  sportspsykologi og træner professionelle (Taco van der Hoorn, Pascal
  Eenkhoorn). JOIN beskrives som "based on fairly complex science and
  the very best coaching philosophies and knowledge" uden kilder;
  artiklen er sponsoreret indhold. [læst]
  — https://road.cc/content/feature/join-smart-cycling-app-everything-you-need-know-305687
- Den nye plan (september 2026) viser Fitness (akkumuleret arbejde de
  seneste uger), Fatigue (de seneste dage), Form (= Fitness minus
  Fatigue, "readiness to perform"), Level og eFTP – altså en klassisk
  fitness-fatigue-model i egne ord uden formler. [læst]
  — https://join.cc/cycling-tips/meet-the-new-join-plan-your-complete-training-picture
- Readiness hviler på "two simple inputs: how sore your muscles feel,
  and how well recovered you are"; wearables (Whoop, Oura, Garmin,
  Fitbit) er valgfri og "should complement your own feeling, not
  replace it". JOIN leverer et estimat, og "If the estimate doesn't
  match how you feel, you can adjust it". Justeringen kan ændre
  passets "type, duration, or intensity". [læst]
  — https://join.cc/cycling-tips/train-smarter-with-readiness-optimize-every-ride
- **Opgavens antagelse om et JOIN-studie i Sports Medicine – Open
  (2021–2024) kunne ikke bekræftes.** Det eneste akademiske spor er et
  kandidatspeciale fra Utrecht (2023) om feedback på metrikker i
  JOIN-appen, lavet i samarbejde med firmaet, ikke en validering af
  algoritmen. [abstract] — https://studenttheses.uu.nl/handle/20.500.12932/44124

**Athletica** (Paul Laursen, Andrea Zignoli m.fl.)

- Athletica siger, at modellerne bygger på "first-principle logic",
  HIIT Science-principperne og "a pinch of modern machine learning
  methods"; idéen opstod i 2015 hos Paul Laursen og Stephen Brown,
  Andrea Zignoli leder backend-logikken, Martin Buchheit har bidraget
  til grundprincipperne. Evidensen, der fremhæves, er stifternes
  publikationslister (Laursens "over 200 refereed manuscripts"), ikke
  produktstudier. [læst] — https://athletica.ai/about-ai-coaching-training
- Grundlaget beskrives som "Banister's load-response equations" plus
  Critical Power, "Workout Reserve" og "integration of HRV responses";
  designmålet er at systemet skal "coach with you, not instead of
  you". [læst] — Paul Laursen, https://news.athletica.ai/posts/the-models-behind-the-magic-how-you-re-shaping-the-future-of-ai-coaching
- Den konverserende AI-coach bygger på "AI agents" og "RAG
  (retrieval-augmented) AI"; den læser "the relevant training files"
  og svarer på fx "Should I adjust today's session given how I've been
  sleeping?". Hvilken sprogmodel, og om coachen kan ændre planen eller
  kun foreslå, oplyses ikke. [læst]
  — https://news.athletica.ai/posts/your-training-is-about-to-change-inside-athletica-s-new-ai-coach-hrv-engine-new-athletica-interface
- Publikation: "Signatures of Fatigue: Transformer-Based Sentiment
  Analysis for Internal Load Monitoring" (Zignoli; Sport Performance
  Science Reports ifølge podcast-omtale): to-trins NLP-pipeline over
  atleters fritekstkommentarer, XGBoost-forudsigelse; subjektiv "feel"
  var stærkeste prædiktor for følelsestilstand, løb gav mere "joy" end
  roning. Portfoliosiden angiver hverken venue, år, DOI eller
  stikprøve; en podcastbeskrivelse nævner over 55.000 kommentarer.
  [læst (portfolio) / søgning (tal)]
  — https://andreazignoli.github.io/portfolio/portfolio-1

**Humango** (Eric Abecassis; grundlagt august 2019)

- Den virtuelle coach "Hugo" re-optimerer planen løbende i et stort
  løsningsrum (firmaet hævder ca. 20 billioner mulige planer for seks
  pas om ugen), med input fra wearables, tilgængelighed, mål og
  gruppetræning; maskinlæring bruges til outlier-detektion og
  metrikberegning. Validering er begrænset til feedback fra ca. 1.000
  tidlige brugere siden december 2020; patent er "pending"; ingen
  studier. Kilden er et firma-interview. [læst]
  — https://www.scientia.global/humango-harnessing-artificial-intelligence-to-boost-athlete-performance

**AI Endurance**

- Træner en "Digital Twin", et neuralt netværk pr. bruger, og lover en
  plan "computed for your physiology, re-optimized every time you
  train", der maksimerer forudsagt løbsdagspræstation. Firmaet skriver,
  at det har "published the science to back it up", men linker ikke til
  publikationen; en BMC-artikel nævner appen i forbindelse med DFA α1.
  Beviserne på siden er testimonials. [læst] — https://aiendurance.com/

**Zwift**

- "Zwift uses your unique FTP to set your training zones and tailor
  each workout to your fitness level." [læst]
  — https://support.zwift.com/en_us/workouts-and-ftp-faq-HyJXHL_v1x.md
- Planerne er ikke adaptive; de kan ikke sættes på pause, men har et
  ekstra to-ugers vindue til at blive færdige. [søgning] — Zwift support,
  set via søgning

**Garmin / Firstbeat**

- Training Effect (TE) bygger primært på EPOC estimeret under passet,
  skaleret efter personens fitness; skala 0–5 (0,0–0,9 ingen effekt;
  1,0–1,9 minor/recovery; 2,0–2,9 maintaining; 3,0–3,9 improving;
  4,0–4,9 highly improving; 5,0 "temporarily overreaching"). [læst]
  — https://www.firstbeat.com/en/science-and-physiology/epoc-and-training-effect/
- Firstbeats white paper "Indirect EPOC Prediction Method Based on
  Heart Rate Measurement" (maj 2005, opdateret marts 2012): modellen
  er EPOC(t) = f(EPOC(t−1), intensitet(t), t) (Saalasti 2003, en
  ph.d. om neurale netværk til pulsserier). Validering: 32 raske
  voksne (38 ± 9 år, VO2max 44,0 ± 8,8 ml/kg/min), r² = 0,79 mod målt
  EPOC, MAE 9,4 / 14,0 / 16,9 ml/kg ved 40 %, 70 % og maksimal
  belastning, samlet 13,7 ml/kg – publiceret som ACSM-abstract (Rusko
  et al. 2003), ikke som fuld artikel. [læst]
  — https://www.firstbeat.com/wp-content/uploads/2015/10/white_paper_epoc.pdf
- Training Readiness bruger seks faktorer: "Sleep score (last night)",
  "Recovery time", "HRV status", "Acute load", "Sleep history (last 3
  nights)", "Stress history (last 3 days)"; bånd 95–100 Prime, 75–94
  High, 50–74 Moderate, 25–49 Low, 1–24 Poor. Ingen formel, ingen
  vægte. [læst] — https://www8.garmin.com/manuals/webhelp/GUID-31D23DBB-57C2-4DF7-A0C9-8D1A00AB4BE7/EN-US/GUID-C21BE0C8-A08E-4DA1-B6C6-2E0E2DDDB372.html
- Training Status afgøres af trenden i VO2max-estimatet; Training Load
  er en 7-dages sum af EPOC-baseret stress; Load Focus deler i low
  aerobic / high aerobic / anaerobic; belastningsratioen akut/kronisk
  mærkes "High" fra 1,5. Sekundær kilde, der selv påpeger, at båndene
  ikke er valideret som skadestærskler. [læst, sekundær]
  — https://the5krunner.com/garmin-features/training/

**Polar – Training Load Pro** (white paper, Polar Research and
Technology, 12. november 2019, revideret marts 2025) [læst]
— https://www.polar.com/img/static/whitepapers/pdf/polar-training-load-pro-white-paper.pdf

- Cardio Load = Banisters TRIMP, beregnet pr. sekund ("Based on a
  survey of scientists and practitioners, we found that the
  traditional Banister TRIMP formula remains the preferred method").
  Muscle Load = gennemsnitseffekt × varighed (kJ). Perceived Load =
  RPE (1–10) × varighed, med Foster 2001 som kilde.
- Strain = rullende gennemsnit af daglig Cardio Load over 7 dage,
  Tolerance over 28 dage, valgt "Based on recommendations by Gabbett";
  Tolerance "can vary between three to six weeks". Strain gøres
  analog med Banisters negative funktion, Tolerance med den positive.
- Cardio Load Status = Strain/Tolerance: < 0,8 Detraining (eller
  Recovering i 14 dage efter overreaching), 0,8–1,0 Maintaining,
  1,0–1,3 Productive, > 1,3 Productive eller Overreaching afhængigt af
  absolutte niveauer. Skades- og sygdomsrisiko: "injury likelihood is
  low (<10%) when the acute-to-chronic load ratio … is within the range
  of 0.8–1.3" og "doubles when the ratio exceeds 1.5", med Blanch &
  Gabbett 2016 og Hulin et al. 2016 (rugby) som kilder.
- Afsnittet "Validity" er én sætning: beregningerne "are based on
  scientifically accepted methods". Under begrænsninger står, at
  overførslen til individuelle udholdenhedssporter er antaget, "even
  though research confirmation is lacking". Hele
  acute:chronic-litteraturen er desuden siden blevet kritiseret
  metodisk (bl.a. Impellizzeri og kolleger, IJSPP 2020 – ikke åbnet i
  denne læsning). [ikke verificeret]
- Polar er dermed den mest gennemsigtige af producenterne: formlerne
  står i white paperet. Til gengæld er evidensen for selve
  statuskategorierne lånt fra holdsport.

**Whoop og Oura** – se afsnit 4.

**Intervals.icu** (David Tinker, Sydafrika)

- Fitness/Fatigue/Form bruges "iso of the trademarked CTL/ATL/TSB ™".
  Fitness har 42 dages tidskonstant, Fatigue 7 dage, begge kan ændres
  af brugeren; Form kan vises absolut eller som procent af Fitness
  ((Fitness − Fatigue) × 100 / Fitness). Form beregnes af _dagens_
  Fitness minus Fatigue, "while most other platforms use yesterday's".
  Planlagte pas tæller med indtil midnat og smides så væk, hvis de ikke
  blev kørt. [læst] — https://forum.intervals.icu/t/fitness-page-a-guide-to-getting-started/17702
- eFTP: "uses the best sufficiently long maximal effort to estimate CP,
  a shorter effort to estimate W′, and best 1-second power for pMax"
  (Tinker, juli 2025). Samme tråd: Intervals.icu er begyndt at
  implementere "the three-dimensional impulse-response model" (arXiv
  2503.14841, tre energisystemer, en strain-score som alternativ til
  TSS), første skridt er at vise de tre komponenter pr. tur; ingen
  valideringspåstand. [læst] — https://forum.intervals.icu/t/three-dimensional-impulse-response-model/109644
- Intervals.icu er ikke open source, men har en åben API og en meget
  åben udviklerdialog i forummet. [søgning]

**GoldenCheetah** (open source; Mark Liversedge m.fl.)

- Banister-modellen blev lagt ind januar 2019 med Levenberg–Marquardt
  (samme kode som CP-fittet), efter Clarke & Skibas regneark. Tre frie
  parametre: p0 (utrænet grundniveau), k1 og k2; tidskonstanterne t1
  og t2 blev taget _ud_ af fittet, fordi det gav "implausibly low,
  similar values", og er nu brugerkonstanter (plausibelt 30–50 d og
  7–20 d). Maksimale indsatser findes automatisk (4–60 min) uden
  planlagte tests; der kræves ca. 20+ observationer over to år for et
  stabilt fit. Liversedge om 42/7: konstanterne "can't be validated
  because they don't correspond to anything measurable", og CTL/ATL er
  vægtede glidende gennemsnit, mens Banisters kurver er henfaldende
  akkumuleringer, så skalaerne er forskellige; at læse ATL/TSB kalder
  han "tasseography". [læst]
  — https://markliversedge.blogspot.com/2019/01/implementing-banister-impulse-response.html
- Effekt-varighed: Morton 3-parameter-model (CP, W′, Pmax); et "power
  index" udtrykker en indsats som procent af en gennemsnitsatlets
  forudsagte effekt for varigheden (ca. 140 % elite, 70 % utrænet);
  power index × 2,61 ≈ CP, fordi gennemsnitsatletens CP var 261 W –
  "only indicative". [læst]
  — https://markliversedge.blogspot.com/2019/01/performance-tests-and-power-index.html

### Inferences

- Markedet deler sig i tre lag: (a) tilstandsmodeller, der er åbne og
  gamle (Banister, TRIMP, CP/W′), (b) proprietære
  _estimations_-metoder (TrainerRoads niveauer og FTP-detektion, Xerts
  signaturudtræk, Firstbeats EPOC) og (c) proprietære
  _anbefalings_-regler. Kun lag (a) har en forskningslitteratur; lag
  (b) har i bedste fald producentens egen validering (Firstbeat: r² =
  0,79 på 32 personer; Polar: formler men lånt evidens); lag (c) har
  ingen offentliggjort evidens overhovedet.
- De to systemer, der tydeligst "holder mennesket i loopet", er
  TrainerRoad (forslag → "Accept Adaptations", survey der kan
  overrule maskinen, decline af FTP) og JOIN (eget estimat, som
  brugeren retter; wearables "should complement your own feeling").
  Athletica formulerer samme princip ("coach with you, not instead of
  you") men dokumenterer ikke mekanikken.
- Hverken Xert, TrainerRoad, Wahoo, JOIN, Humango, Athletica eller AI
  Endurance har et uafhængigt studie, der viser, at deres adaptive
  plan slår en velskrevet fast plan. "Adaptiv" er i praksis
  markedsføring for "bytter pas efter en score".

### Gaps

- TrainerRoads eventuelle patenter, datasættets størrelse og
  Progression Levels' konkrete regler (hvor meget et niveau stiger og
  falder, henfald ved pause) er ikke offentlige og kunne ikke
  eftersøges yderligere.
- Xerts hjælpecenter (baronbiosys.zendesk.com) afviste hentning; den
  nøjagtige definition af Training Load/Status og "improvement rate"
  er kun kendt fra søgeuddrag.
- JOINs formodede peer-reviewed artikel blev ikke fundet; hvis den
  findes, er den ikke indekseret under de oplagte navne.
- Wahoo: Hendersons og Cassins præcise roller i udviklingen af 4DP
  kunne ikke verificeres i en primærkilde.
- Zwift: ingen 2026-dokumentation om eventuelt adaptive planer fundet.

---

## 2. Evidens for algoritmestyret træning

### Takeaway

Den bedst undersøgte form for algoritmestyring er HRV-styret træning,
og to meta-analyser fra 2021 når samme sted hen: små, ikke-signifikante
fordele på præstation og VO2max, en moderat fordel på submaksimale mål,
og færre non-respondere. Banister-styret planlægning er vist som
_muligt_ (optimering giver automatisk en taper), men modellen selv har
statistiske problemer. Der findes ingen randomiserede studier af
kommercielle adaptive apps.

### Cited Findings

**HRV-styret træning**

- Düking et al. 2021 (J Sci Med Sport 24(11):1180–1192, DOI
  10.1016/j.jsams.2021.04.012): 8 studier, 198 deltagere, 9
  interventioner. Submaksimale fysiologiske mål: Hedges' g = 0,296
  (95 % CI 0,031–0,562, p = 0,028). Præstation: g = 0,079 (−0,050 til
  0,393, p = 0,597). VO2peak: g = 0,171 (−0,213 til 0,371, p = 0,130).
  HRV-styring gav "fewer non-responders and more positive responders
  regarding performance" og indeholdt typisk færre moderate/hårde pas.
  [abstract] — https://lida.sport-iat.de/ta/Record/4073164?lng=en ;
  https://pubmed.ncbi.nlm.nih.gov/34489178/
- Manresa-Rocamora, Sarabia, Javaloyes, Flatt & Moya-Ramón 2021 (Int J
  Environ Res Public Health 18(19):10299): 8 studier, 10
  analyseenheder, 199 deltagere (106 HRV-styret, 93 fast plan),
  gennemsnitsalder 31,8 ± 4,8 år, interventioner på 2–8 uger. VO2max
  SMD 0,13 (−0,12; 0,39); udholdenhedspræstation 0,20 (−0,09; 0,48,
  p = 0,18); vagal HRV 0,50 (0,09; 0,91) efter metodekorrektion. Risiko
  for bias "high or unclear" i de fleste studier; kun ét studie havde
  blindet måling. Forfatternes konklusion om fitness og præstation:
  "current data suggest it is only by a small margin". Inkluderede
  studier: Kiviniemi 2007 (løbere) og 2010, Vesterinen 2016 (løbere),
  Nuuttila 2017, Schmitt 2018 (skiløbere), da Silva 2019, Javaloyes
  2019 og 2020 (cykelryttere). [læst]
  — https://pmc.ncbi.nlm.nih.gov/articles/PMC8507742/
- Javaloyes et al. 2019 (IJSPP; 17 veltrænede cykelryttere) og 2020
  (J Strength Cond Res; 20 ryttere, 8 uger, HRV-styret vs.
  blokperiodisering): HRV-gruppen forbedrede peak power,
  tærskeleffekt og 40-min tidskørsel inden for gruppen, men "there
  were no differences between groups" i begge studier. Universidad
  Miguel Hernández de Elche. [abstract]
  — https://pubmed.ncbi.nlm.nih.gov/31490431/ ;
  https://dspace.umh.es/handle/11000/30650
- Ingen af de inkluderede HRV-studier omfatter unge; aldersspændet i
  Manresa-Rocamora er 22–39 år. [læst]

**Banister-styret planlægning og modellens gyldighed**

- Coggan (TrainingPeaks, "The Science of the Performance Manager"):
  den oprindelige impuls-respons-model "has been shown to account for
  > 70%, and often >90%, of the day-to-day variation in performance" i
  > studier med hyppige præstationsmålinger. Performance Manager
  > fjerner gain-faktorerne og erstatter integralerne med eksponentielt
  > vægtede gennemsnit; 42 og 7 dage er "nominal values based on the
  > scientific literature"; valideringen af selve Performance Manager
  > var ca. to dusin betatestere i 2005–2006, og varianter med
  > dynamiske tidskonstanter "none proved to be discernably better".
  > Begrænsninger, han selv nævner: modellen er "purely descriptive",
  > "assumes that there is no upper limit … to performance", kræver
  > mange præstationsmålinger, og brugen "entails some degree of
  > 'art'". [læst] — https://www.trainingpeaks.com/learn/articles/the-science-of-the-performance-manager/
- Carey, Crow, Ong, Blanch, Morris, Dascombe & Crossley (IJSPP, DOI
  10.1123/ijspp.2016-0695): et begrænset optimeringsproblem for
  australsk fodbolds præ-sæson med Banister-forudsagt præstation som
  mål og acute:chronic-begrænsninger; planer kunne genereres
  automatisk, og "using a Banister-model objective led to plans that
  included a taper in training load prior to competition". Forfatterne
  skriver samtidig, at "the accuracy of these models in predicting
  performance has been limited". [læst, pdf-udtræk]
  — https://david-carey.github.io/files/%5BIJSPP%5D%20Carey%20-%20Optimizing%20Preseason%20Training%20Loads%20in%20Australian%20Football.pdf
- Imbach, Sutton-Charani, Montmain, Candau & Perrey 2022 (Sports
  Medicine – Open 8:29, DOI 10.1186/s40798-022-00426-x; Univ.
  Montpellier/IMT Mines Alès): fitness-fatigue-modellernes
  forudsigelsesevne er "mitigated" på grund af forenklet fysiologi og
  én samlet belastningsvariabel; "two identical training sessions that
  occur at different training stages would induce similar
  adaptations"; "improving model complexity … does not guarantee the
  best model performances". Anbefaling: stacking-ensembler, hvor flere
  FFM'er og ML-modeller kombineres af en gennemsigtig meta-model –
  "the machine-learning approach is not an alternative to FFMs, but
  rather a way to take advantage of models" med fysiologisk grundlag.
  [læst] — https://pmc.ncbi.nlm.nih.gov/articles/PMC8894528/
- Marchal, Benazieb, Weldegebriel, Méline & Imbach 2025 (Scientific
  Reports, DOI 10.1038/s41598-025-88153-7): Bayesiansk analyse med
  krydsvalidering på to uafhængige datasæt – "The FFM showed major
  statistical flaws": fitness- og fatigue-parametrene var dårligt
  identificerbare, og "adding the fatigue-related parameters did not
  significantly improve the model's predictive ability" (p > 0,40).
  "Both results question the relevance of the fatigue part of the
  model formulation." [abstract]
  — https://library.kab.ac.ug/Record/doaj-art-b0487c71f0ab4ccbbee98e52bad2c766/Description
- Liversedges praktiske erfaring i GoldenCheetah peger samme vej:
  modellen er lineær, kan ikke vise aftagende udbytte, fits er
  ustabile, og ét belastningstal er "too blunt". [læst] — se afsnit 1.
- Imbach et al. 2022 (Scientific Reports, "Training load responses
  modelling and model generalisation in elite sports", DOI
  10.1038/s41598-022-05392-8) findes, men indhold ikke læst. [søgning]

**AI-coach-forsøg 2023–2026**

- Eneste registrerede forsøg fundet: "Adaptive Self-Efficacy-Based AI
  Coaching for Cycling" (University of Miami, ClinicalTrials.gov
  NCT07318233, 2025): AI-leveret coaching, der tilpasser
  self-efficacy-støtte ud fra fysiologisk feedback, mod statiske
  bekræftelser og en kontrolgruppe; primært udfald effekt i en
  20-min tidskørsel. Ingen resultater endnu. [abstract]
  — https://www.epistemonikos.org/en/documents/428e0298230d9a0c5164668da61383a5cf1767ba
- Ingen randomiserede studier af TrainerRoad, Xert, JOIN, Athletica,
  Humango eller AI Endurance fundet. Søgningen kunne ikke fuldføres
  (budget), så fraværet er ikke bevist, men ingen af firmaerne
  henviser selv til et sådant studie.

### Inferences

- Den ærlige sammenfatning er: at styre dagens intensitet efter en
  daglig markør (HRV eller tilsvarende) giver ikke målbart bedre
  præstation i gruppegennemsnit, men ser ud til at reducere antallet
  af ryttere, der _ikke_ får noget ud af træningen – mest fordi det
  fjerner hårde pas på dårlige dage. Det er et argument for en
  "bremse", ikke for en "speeder".
- Banister-modellen er brugbar som _sprog_ (fitness, træthed, form) og
  som _struktur_ (en taper falder ud af optimering), men ikke som
  _præcis forudsigelse_ for den enkelte; tidskonstanterne 42/7 er
  nominelle, og fatigue-delen er statistisk svagest.
- Alt det ovenstående er målt på voksne. Der er ingen evidens for
  algoritmestyret træning hos U17–U23.

### Gaps

- Kiviniemi 2007, Vesterinen 2016 og Nuuttila 2017 er kun set via
  meta-analysen, ikke i fuld tekst.
- Ingen Banister-styret _randomiseret_ interventionsstudie (hvor planen
  blev lagt af modellen og sammenlignet med en træners plan) blev
  fundet; Carey et al. er en simulering.
- Kataoka/Spiess/Rasmussen fra opgaveteksten kunne ikke eftersøges.

---

## 3. Sprogmodeller i træningsplanlægning

### Takeaway

Fire peer-reviewed evalueringer fra 2024–2026 siger det samme: LLM'er
svarer korrekt på det, de svarer på (ca. 90 % korrekthed), men udelader
det meste af det, en komplet plan kræver (ca. 41 % dækning), progredierer
for hurtigt, stiller ikke opfølgende spørgsmål og bruger ikke måledata.
Kvaliteten stiger kraftigt med mere og bedre input. Forfatterne
anbefaler samstemmende: brug dem som udkast og forklaring, aldrig uden
en kyndig gennemlæsning.

### Cited Findings

- Düking, Sperlich, Voigt, Van Hooren, Zanini & Zinner 2024, "ChatGPT
  Generated Training Plans for Runners are not Rated Optimal by
  Coaching Experts, but Increase in Quality with Additional Input
  Information", J Sports Sci Med 23:56–72 (TU Braunschweig, Würzburg,
  Köln, Maastricht, Loughborough). Tre prompts af stigende detalje for
  en fiktiv 20-årig løber, 10 trænere med kandidatgrad og ≥5 års
  erfaring, 22 kriterier på 1–5. Medianer 2, 3 og 4 for plan 1, 2 og 3;
  plan 1 lå under plan 3 på 15 af 22 kriterier (p < 0,05). Selv plan
  3 fik kun neutrale karakterer for helbredsscreening, test,
  kontekstfaktorer og træningsfrekvens, og volumenprogressionen blev
  vurderet under neutral, fordi "training variables … increased too
  quickly, which risks injury". ChatGPT stillede ikke de opfølgende
  spørgsmål, en træner ville stille, og "does not use wearable data".
  Inter-rater-enighed faldt fra κ = 0,43 til 0,00, jo bedre planen
  blev. Anbefaling: ikke bruge planerne uden ekspertgennemgang;
  sprogmodeller "cannot yet handle motivation, monitoring, or plan
  adjustments"; AI-værktøjer bør give "trustworthy citations and
  evidence rankings". [læst] — https://jssm.org/jssm-23-56.xml-Fulltext
- Zaleski et al. 2024, JMIR Medical Education 10:e51308 (Hartford
  Hospital / UConn): ChatGPT bedt om individuelle anbefalinger for alle
  26 kliniske populationer i ACSM's retningslinjer, scoret mod en
  rubrik med ti kategorier. Dækning: "only 41% of the content expected
  in a gold-standard exercise recommendation"; korrekthed af det
  leverede ca. 91 % (90,7 %); læsbarhed på college-niveau. Hyppigste
  fejl: unødvendig lægelig godkendelse før træning, ingen omtale af
  medicin, FITT-principperne (frekvens, intensitet, tid, type)
  manglede. [læst, UConn-omtale; artiklen selv blev ikke leveret af
  serveren] — https://today.uconn.edu/2024/02/are-chatgpt-exercise-recommendations-just-what-the-doctor-ordered ;
  https://mededu.jmir.org/2024/1/e51308
- D'hoe, Kirk, Boone & Colosio 2026, "ChatGPT Outperforms Personal
  Trainers in Answering Common Exercise Training Questions", J Sports
  Sci Med 25:235–261 (Ghent, King's College London, Saint-Étienne):
  ChatGPT 3.5 mod ni personlige træneres egne svar på deres hyppigste
  kundespørgsmål, 27 blindede bedømmere (18 PT'er, 9 ph.d.-forskere),
  0–10 på korrekthed, forståelighed og handlingsanvisning. ChatGPT
  scorede højere på 6 af 9 spørgsmål (fx 7,96 mod 5,49, p < 0,0001);
  trænerne vandt ingen. ChatGPT-svar var 241 ord mod 140. Forfatterne
  kalder fundet "exploratory and hypothesis-generating rather than
  definitive". [læst] — https://www.jssm.org/jssm-25-235.xml-Fulltext
- Biology of Sport har 2024–2025 publiceret to ekspertvurderinger af
  GPT-4- og Gemini-genererede hypertrofi-/styrkeprogrammer
  ("Reproducibility and quality of hypertrophy related training plans
  …" og "A professional assessment of training plans … developed by
  generative artificial intelligence"). Ikke åbnet. [søgning]
  — https://www.termedia.pl/Reproducibility-and-quality-of-hypertrophy-related-training-plans-generated-by-GPT-4-and-Google-Gemini-as-evaluated-by-coaching-experts,78,55336,1,1.html

### Inferences

- Fejltypen er systematisk og relevant for unge: for hurtig
  progression og manglende kontekst (skader, vækst, skole, sygdom) er
  præcis de fejl, en ungdomstræner ikke må lave. Det, LLM'er er gode
  til – klare, korrekte svar på afgrænsede spørgsmål – er præcis
  "forklar formen" og "hvorfor ligger dette pas her".
- Kvaliteten af en plan fra en sprogmodel afhænger af, hvad der står
  i prompten. Det taler for, at Kadence giver modellen den
  strukturerede kontekst (klasse, DCU-ramme, seneste uger, check-ins),
  og at _reglerne_ (max progression, hviledage, klassens timetal)
  håndhæves i kode uden om modellen.

### Gaps

- Ingen af studierne tester 2025–2026-modeller eller RAG-opsætninger
  som Athleticas; resultaterne gælder ChatGPT 3.x/GPT-4-æraen.
- Ingen studier af LLM-genererede _cykel_-planer eller planer til unge
  fundet.

---

## 4. Kritik og risici: readiness-scorer, "at træne efter tallet", unge

### Takeaway

Sammensatte scorer (Whoop Recovery, Oura Readiness, Garmin Body
Battery/Training Readiness) er uden offentliggjorte formler og i det
væsentlige uvaliderede, selv om deres HRV-input måler godt. Litteraturen
om monitorering af unge advarer mod overvågning, kropsfokus og svagt
samtykke og anbefaler frivillighed, uddannelse og en holistisk ramme.
Tjenesternes egne aldersgrænser spænder fra 13 (Strava, Whoop) over 16
(TrainingPeaks' privatlivspolitik) til 18 med forældretilladelse
(Zwift).

### Cited Findings

- Doherty et al. 2025, "Readiness, recovery, and strain: an evaluation
  of composite health scores in consumer wearables", Translational
  Exercise Biomedicine (De Gruyter), DOI 10.1515/teb-2025-0001
  (University College Dublin): 14 sammensatte scorer fra 10 producenter
  (Oura Readiness og Resilience, WHOOP Strain, Recovery og Stress
  Monitor, Garmin, Polar, Fitbit, Samsung, Suunto, Ultrahuman, Coros,
  Withings) vurderet på offentlig dokumentation. Ingen producent
  offentliggør sin formel, og få leverer empirisk validering eller
  peer-reviewed evidens; flere scorer er utilgængelige for forskere
  bag betalingsmure. Anbefaling: offentliggør logikken, test på tværs
  af alder, køn og kliniske grupper. Doherty peger desuden på
  dobbelttælling: dårlig søvn følges typisk af lavere HRV, og begge
  tæller. [abstract + søgning] — https://doi.org/10.1515/teb-2025-0001 ;
  https://www.ucd.ie/newsandopinion/news/2025/april/11/opinion-howtrustworthyisyourfitnesstrackerscore
- Et studie af elite-svømmere fandt, at WHOOP's Recovery-score ikke
  konsekvent hang sammen med oplevet restitution, stress eller
  hvilestofskifte, selv om WHOOP's HRV gjorde. Sekundære kilder angiver
  overnatnings-HRV mod EKG med CCC 0,99 (Oura Gen 4) og 0,94 (WHOOP
  4.0) (Dial et al.). Tal ikke verificeret i primærkilde. [søgning]
- Warden (80/20 Endurance, 2020, opdateret 2026): at jagte et højere
  langtidsbelastningstal driver atleter ind i en "moderate intensity
  rut"; tre pas med samme belastningstal (1,5 t zone 2, 53 min zone X,
  45 min zone 3) bygger forskellige evner; "Regardless of what the CTL
  says, if you are getting faster, your plan is working." [læst]
  — https://www.8020endurance.com/performance-management-chart-is-lying-to-you/
- Lundberg, Parry & Cumming, "Growth and Maturation Assessment in
  Youth Sport: Balancing Benefits and Risks", Scand J Med Sci Sports,
  DOI 10.1111/sms.70361: vurdering af vækst og modning kan forebygge
  skader hos hurtigt voksende og modvirke modningsbias i udvælgelse,
  men bekymringer om kropsbillede og spiseforstyrrelser er "valid";
  risikoen ligger i _kommunikationen og miljøet_, ikke i målingen.
  Fem principper: uddan interessenterne, beskyt privatlivet, gør
  deltagelse frivillig, lad uddannede fagfolk måle, og indlejr det i
  et holistisk, børnecentreret monitoreringssystem. [abstract]
  — https://www.citedrive.com/en/discovery/growth-and-maturation-assessment-in-youth-sport-balancing-benefits-and-risks/
- Curd & Buchanan (Duke Deep Tech, 11. august 2026) om college-atleter:
  "performance monitoring can morph into personal surveillance";
  synlige scorer bliver sammenligningsværktøj mellem holdkammerater;
  "consent is more of a formality than a meaningful decision", fordi
  rekrutteringen er overstået, når der underskrives. NCAA-undersøgelse
  oktober 2025 (ca. 6.800 atleter): over 60 % bruger
  præstationsteknologi. Anbefalinger: skriftligt formål pr. værktøj,
  rollebaseret adgang, specifikt og tilbagekaldeligt samtykke adskilt
  fra disciplin og udtagelse, sletning når atleten stopper. Gælder
  voksne college-atleter, ikke børn. [læst]
  — https://deeptech.duke.edu/blog-post/no-pain-no-privacy-athletic-wearables-and-limits-consent/
- Aldersgrænser i brugsvilkår (læst 9. november 2026):
  - Strava: "at least 13 years old, or such higher age as may be
    required in your jurisdiction"; under 18 får andre
    standard-privatlivsindstillinger; Terms of Service (2026),
    Effective Date 28. september 2026. [læst]
    — https://www.strava.com/legal/terms
  - Whoop: "at least 13 years of age" eller lokal lovs minimum; under
    13 "may not, under any circumstances or for any reason, use the
    Services"; ingen forældresamtykke-mekanisme; version dateret 3.
    august 2026 (via ConductAtlas; Whoops egen side afviste hentning).
    [læst, sekundær] — https://conductatlas.com/platform/whoop/whoop-terms-of-use/provision/CA-P-060219/minimum-age-requirement-13-years/
  - Zwift: under 18 "may use our Platform only with the permission of a
    parent or legal guardian"; under 16 "must satisfy any consent
    mechanism required via the Platform"; Last Updated 2. juni 2026.
    [læst] — https://support.zwift.com/en_us/terms-of-service-HJt7VBYyH.md
  - TrainingPeaks: privatlivspolitikken siger "we do not knowingly
    collect Personal Data directly from children under 16 years of
    age" uden forældresamtykke (effektiv 28. juni 2023, opdateret 28.
    juli 2026); selve brugsvilkårene lå som ulæselig pdf. [læst]
    — https://www.trainingpeaks.com/privacy/
  - Garmin Connect: ikke tjekket. [hul]

### Inferences

- Kadence bør behandle enhver "readiness"-score udefra (Whoop, Oura,
  Garmin) som et _uvalideret signal_ og aldrig som input til en
  automatisk ændring. Hvis noget skal vises, så de rå mål (hvilepuls,
  HRV, søvntimer) med rytterens eget check-in som den primære kilde –
  det er også JOINs egen konklusion.
- Et tal, som hele holdet kan se, bliver en rangliste. Det er det
  stærkeste argument i litteraturen for, at ryttere kun ser egne tal,
  og at træneren ser tilstande og tendenser frem for tal at
  sammenligne på.
- Kadence er allerede mere restriktiv end markedet (RLS mellem
  ryttere, forældre via rytteren, fuld sletning); det er et
  konkurrenceargument, ikke en begrænsning.

### Gaps

- Ingen systematisk oversigt over etik ved wearables hos _mindreårige_
  i sport blev fundet; litteraturen er narrativ og om college/elite.
- "Orthosomnia"-kommentaren i J Sport Health Sci 2023 og
  privatlivsanalysen af 17 wearable-producenter (2025) er kun set via
  Duke-bloggen.

---

## 5. Åbne modeller, der er værd at overveje

### Takeaway

De åbne byggesten er: Banisters impuls-respons-model (som sprog og
struktur, ikke som orakel), TRIMP og sRPE som belastning, Fosters
monotoni og strain, kritisk effekt med W′ og Skibas W′-balance, og en
form-/friskhedsvisning med 42/7-dages konstanter. Rampe-reglen "5–8
point om ugen" er én træners erfaring (Friel 2015) uden data, og
tærsklerne for monotoni (1,5–2,0) er folklore oven på Fosters
individuelle tærskler.

### Cited Findings

- **Banister/fitness-fatigue.** Oprindelig: Banister, Calvert, Savage &
  Bach 1975, "A systems model of training for athletic performance",
  Aust J Sports Med; Banister & Calvert 1980, Can J Appl Sport Sci
  5:170–176 (begge citeret i Polars white paper). [læst, via Polar]
  Coggans forenkling: 42/7 dage som nominelle værdier, ATL-konstanten
  den, der påvirker mest, kan justeres (kortere for nogle
  udholdenhedsatleter, længere for masters). [læst] — Coggan, se afsnit 2.
  GoldenCheetahs erfaring: plausible t1 30–50 d, t2 7–20 d, ≥20
  observationer over to år. [læst] — Liversedge, se afsnit 1.
  Statistisk status: fatigue-parametrene forbedrer ikke forudsigelsen
  (Marchal 2025); modellen er identificerbar kun med mange
  præstationsmålinger (Imbach 2022). [abstract/læst]
- **Form-heuristik.** Coggan: TSB (deres term) under −10 "usually
  doesn't feel fresh", over +10 "usually would be", −10 til +10
  "neutral"; bedre læst som "how fully-adapted an individual is to
  their recent training load" end som præstation. [læst]
  Intervals.icu-brugere holder form over −22 til −30 og bruger
  procent-form, når fitness nærmer sig 100. [læst]
- **Rampe-rate.** Friel, "The CTL Ramp Rate", 15. maj 2015: "I've found
  that an increase in CTL of about 5 to 8 points per week is about
  right for most"; eliter kan tåle >10 "for a week or less before
  backing off"; ingen data eller kilder, kun "I've found". Han nævner
  selv, at overtræning, sygdom og udbrændthed viser sig med ugers
  forsinkelse, og at livsstress bør sænke rampen. [læst]
  — https://www.goodreads.com/author_blog_posts/8386404-the-ctl-ramp-rate
  Sekundære kilder giver 3–7 om ugen eller risikobånd efter niveau
  (ved CTL ≤ 45: 4 lav, 6 moderat, 8+ høj); ingen er autoritativ.
  [søgning] FasCat: CTL-konstant 42, ATL 3–7 (kortere for yngre,
  længere for ældre), masters 75–100, professionelle 90–150, Grand
  Tour 150–170 efter bjergetaper; "does not account for specificity
  of training adaptations". [læst] — https://fascatcoaching.com/tips/performance-manager-chart/
- **TRIMP.** Banisters TRIMP med køns-specifik vægtning fra
  puls–laktat-forholdet er stadig den foretrukne formel blandt
  forskere og praktikere ifølge Polars rundspørge; Polar beregner den
  pr. sekund. [læst] — Polar white paper.
- **sRPE, monotoni og strain.** Foster 1998, "Monitoring training in
  athletes with reference to overtraining syndrome", Med Sci Sports
  Exerc 30(7):1164–1168: 25 erfarne atleter, belastning = sessions-RPE
  × varighed, monotoni = dagligt gennemsnit/standardafvigelse, strain
  = belastning × monotoni; "a high percentage of illnesses could be
  accounted for", når atleter overskred _individuelt identificerbare_
  tærskler, mest knyttet til strain. [abstract]
  — https://www.sponet.de/sponet/Record/4001707 ; Foster et al. 2001,
  "A new approach to monitoring exercise training", J Strength Cond
  Res 15:109–115 (sRPE-metoden). [læst, via Polar]
  De udbredte tærskler (monotoni < 1,5 godt, > 2,0 for ensformigt) er
  sekundære tommelfingerregler, ikke Fosters tal; Runalyze bruger en
  anden formel (gennemsnit/(SD + gennemsnit), kritisk > 0,67), så
  tærskler er ikke sammenlignelige mellem værktøjer. [læst/søgning]
  — https://runalyze.com/glossary/monotony
- **Acute:chronic-ratio.** Polars 7/28-dages ratio med 0,8–1,3 som
  "sweet spot" og 1,5 som fordobling af skadesrisiko stammer fra
  rugby/AFL/cricket (Blanch & Gabbett 2016; Hulin 2016); Polar
  erkender selv manglende bekræftelse i udholdenhedssport. [læst]
- **Kritisk effekt og W′.** Morton 3-parameter-model (CP, W′, Pmax)
  bruges af GoldenCheetah og, ifølge Mastracci, udvidet af Xert;
  Intervals.icu udleder CP fra bedste lange maksimalindsats, W′ fra en
  kortere og Pmax fra 1 s. [læst] Skiba, Chidnok, Vanhatalo & Jones
  2012 (Med Sci Sports Exerc 44(8):1526–1532) er W′bal-modellen;
  feltvalidering Skiba, Clarke, Vanhatalo & Jones 2014 (Int J Sports
  Physiol Perform 9(6):900–904): 8 trænede triatleter, ROC-areal 0,914
  for at skelne udmattede fra ikke-udmattede. Bartram et al. (elite
  holdforfølgelse, 6 ryttere) fandt, at modellen undervurderer
  W′-genopbygning hos eliter; Black et al. 2023 og en bi-eksponentiel
  model (2023) viser, at tidskonstanten τ "differed markedly between
  participants". [søgning – citationer ikke åbnet]
  — https://ore.exeter.ac.uk/repository/handle/10871/15727 ;
  https://informahealthcare.com/doi/full/10.1080/17461391.2023.2238679
- **Tre-dimensionel impuls-respons** (arXiv 2503.14841): belastning
  pr. energisystem (aerob, glykolytisk, PCr) med en strain-score som
  alternativ til ét tal; under implementering i Intervals.icu, endnu
  i peer review. [læst, forum] — https://www.arxiv.org/pdf/2503.14841v2
- **Undervisningsressource.** Clarke & Skiba 2013, "Rationale and
  resources for teaching the mathematical modeling of athletic
  training and performance", Adv Physiol Educ 37(2):134–152, med
  regneark, som GoldenCheetah byggede på. Ikke åbnet (403). [søgning]

### Inferences

- Det, der kan tages direkte: TRIMP og sRPE som to uafhængige
  belastningsmål (Polars model er et godt forbillede for at vise dem
  _side om side_ i stedet for at lægge dem sammen), Fosters monotoni
  som tjek på ensformighed, 42/7-dages fitness/træthed/form som
  _visning_ med Coggans egne forbehold, og W′bal som værktøj på Rulle
  og i pasbyggeren.
- Det, der ikke bør tages som regel: en fast rampegrænse i point pr.
  uge (Friels 5–8 er erfaring for voksne), faste ACWR-tærskler fra
  holdsport, og et enkelt belastningstal som mål i sig selv.
- Skal Kadence bruge en Banister-model til at _forudsige_, kræver det
  mange præstationsmarkører (≥20 ifølge Liversedge) – for unge
  ryttere med korte sæsoner er det urealistisk. Brug den til at
  _beskrive_.

### Gaps

- Ingen validering af 42/7 (eller andre konstanter) hos unge
  cykelryttere fundet.
- Ingen kilde, der etablerer monotoni-tærsklerne 1,5/2,0 empirisk ud
  over Fosters individuelle tærskler.

---

## 6. Hvad trænere ønsker af teknologi, og hvordan systemerne holder mennesket i kontrol

### Takeaway

Verdensklasse-udholdenhedstrænere monitorerer for at forstå, træffe
bedre beslutninger og undgå skade og sygdom – ikke for at lade
systemet beslutte – og de beder sportsvidenskaben om "suitable
information at the right time". De produkter, der er bedst om det,
bruger forslag-og-accept, egen-rettelse af maskinens skøn og
korte forklaringer.

### Cited Findings

- Timmerman, Stanley, Abbiss, Lawler & Raynor 2023, "Why I monitor":
  World-class endurance coaches' perspectives of athlete monitoring,
  ECSS-kongressen Paris 4.–7. juli 2023: 12 mandlige trænere (kano,
  landevej og bane, roning, triatlon, svømning; 7 lande; 16,8 ± 6,4
  års erfaring; alle med top-3 ved Major Games/VM/Grand Tour).
  Temaer: "Athlete involvement", "Tracking progress", "Learning and
  understanding", "Decision making", "Achieving athletic potential".
  Trænerne oplever, at monitorering giver mere kontekstualiserede
  beslutninger, færre skader og sygdom, og mere engagerede atleter;
  sportsvidenskaben bør levere "suitable information at the right time
  to the coach". [abstract] — https://lida.sport-iat.de/twm/Record/4086227?lng=en
- En 2024-rundspørge blandt 30 praktikere omkring olympiske og
  paralympiske atleter: data bruges til at _støtte_ trænerens
  beslutning; i engelsk professionel fodbold viser en MMU-undersøgelse
  (IJSPP 2024-0300, "Verbal Feedback Is the Primary Mechanism for
  Performance-Related Review …"), at mundtlig feedback dominerer, og
  at "strategies to foster trust and improve buy-in to monitoring have
  yet to be fully established". [søgning] Et britisk akademistudie
  (107 fodboldtrænere, 2026) værdsætter belastningsmonitorering til
  skadesforebyggelse, men rapporterer mangel på uddannelse,
  kommunikation og ressourcer, især hos deltidstrænere. [søgning]
- UX-mønstre set i systemerne (alle [læst], se afsnit 1):
  - TrainerRoad: "Adaptations Pending" → "Accept Adaptations";
    spørgeskema efter passet kan "affirm or correct"; FTP-detektion
    accepteres eller afvises og kan slettes bagefter; tilpasninger
    ændrer _hvilket_ pas, ikke passets indhold.
  - JOIN: systemet giver et estimat af readiness, brugeren retter det
    ("you can adjust it"); wearables er sekundære til egen fornemmelse;
    et rødt punkt viser manglende feedback.
  - Athletica: "coach with you, not instead of you"; coachen svarer
    med reference til atletens data (RAG).
  - Wahoo: profilen er "diagnostic", ikke "prescriptive".
  - Polar: ét tal, men tre separate belastninger og en tekst pr.
    status ("Listen to your body and don't forget rest days").

### Inferences

- Fællesnævneren er: maskinen _foreslår_ et konkret, lille skift (ét
  pas, én FTP-værdi, én readiness), viser _hvorfor_ i én sætning, og
  mennesket siger ja, nej eller retter. Det er præcis Kadences dogme
  "AI'en foreslår, træneren beslutter" – med den tilføjelse, at
  rytterens eget check-in bør kunne overrule maskinens skøn, før
  træneren overhovedet ser det.
- Trænernes behov er _forståelse_ og _timing_, ikke flere tal. Det
  taler for få tilstande ("klar", "slidt", "for ensformigt", "for
  hurtig stigning") med én begrundelse hver, frem for dashboards.

### Gaps

- En egentlig undersøgelse af _trænernes holdning til AI-genererede
  planer_ (Thornton/Coutts eller andre, 2020–2026) blev ikke fundet;
  det, der findes, handler om monitorering og teknologi generelt.
  Coutts' IJSPP-leder "In the age of technology, Occam's razor still
  applies" (2014) kunne ikke åbnes (403). [søgning]

---

## Personer og kilder

| Person                                                           | Tilknytning                                                            | Står for                                                                                         | Nøglekilde                                                                                                             |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Eric W. Banister                                                 | Simon Fraser University (Canada), †                                    | Impuls-respons-modellen (1975) og TRIMP                                                          | Banister et al. 1975, Aust J Sports Med; Banister & Calvert 1980, Can J Appl Sport Sci 5:170–176 (via Polar, [læst])   |
| Andrew R. Coggan                                                 | Fysiolog, USA; ophav til Performance Manager og effektzoner            | Forenklingen 42/7 uden gain-faktorer; "art" i læsningen                                          | "The Science of the Performance Manager", TrainingPeaks [læst]                                                         |
| Joe Friel                                                        | Træner og forfatter, USA                                               | Rampe-reglen 5–8 point/uge (erfaring, ingen data)                                                | "The CTL Ramp Rate", 15. maj 2015 [læst]                                                                               |
| Carl Foster                                                      | University of Wisconsin–La Crosse                                      | sRPE, monotoni, strain                                                                           | Foster 1998, MSSE 30(7):1164–1168 [abstract]; Foster et al. 2001, JSCR 15:109–115                                      |
| Philip F. Skiba                                                  | Advocate Lutheran General Hospital / University of Exeter              | W′-balance-modellen; CP i praksis                                                                | Skiba et al. 2012 MSSE; Skiba et al. 2014 IJSPP 9(6):900–904 [søgning]; Clarke & Skiba 2013 Adv Physiol Educ [søgning] |
| Mark Liversedge                                                  | GoldenCheetah-udvikler, UK                                             | Åben implementering af Banister og Morton 3P; kritik af 42/7                                     | markliversedge.blogspot.com, januar 2019 [læst]                                                                        |
| David Tinker                                                     | Udvikler af Intervals.icu, Sydafrika                                   | Fitness/Fatigue/Form med justerbare konstanter, eFTP fra CP/W′, 3D-IR-model på vej               | forum.intervals.icu (2021–2025) [læst]                                                                                 |
| Armando Mastracci                                                | Stifter, Baron Biosystems / Xert, Canada                               | Fitness Signature, MPA, XSS; udvidet Morton-model                                                | Slowtwitch 2016, Xert-forum 2017, Intervals-forum 2025 [læst]                                                          |
| Nate Pearson                                                     | CEO, TrainerRoad, USA                                                  | Adaptive Training, Progression Levels (ML, lukket)                                               | TrainerRoad-blog og support [læst]; rolle via søgning                                                                  |
| Neal Henderson, Mac Cassin                                       | Wahoo Sports Science (tidl. The Sufferfest), USA                       | 4DP: fire effektmål og ryttertyper                                                               | Wahoo-blog [læst]; roller [søgning]                                                                                    |
| Jim van den Berg                                                 | Stifter af JOIN, Nederlandene; human movement science, sportspsykologi | Algoritmen som kodning af egne trænerbeslutninger; RPE og readiness som brugerens signal         | join.cc [læst]; road.cc [læst]                                                                                         |
| Paul B. Laursen                                                  | Medstifter af Athletica og HIIT Science; AUT (New Zealand)             | "Modelling-first": Banister + CP + HRV + LLM-agenter; "coach with you, not instead of you"       | news.athletica.ai [læst]                                                                                               |
| Andrea Zignoli                                                   | AI/data scientist, Athletica; Università di Trento                     | Backend-logik; sentimentanalyse af træningskommentarer                                           | "Signatures of Fatigue", SPSR (portfolio [læst])                                                                       |
| Martin Buchheit                                                  | HIIT Science; tidl. PSG                                                | Grundprincipperne i HIIT Science                                                                 | athletica.ai/about [læst]                                                                                              |
| Eric Abecassis                                                   | Stifter af Humango (2019), USA                                         | Optimerende AI-coach "Hugo"; patent pending; ingen studier                                       | scientia.global [læst]                                                                                                 |
| Heikki Rusko, Sami Saalasti                                      | Firstbeat Technologies / Jyväskylä, Finland                            | EPOC fra puls via neurale net; Training Effect                                                   | Firstbeat white paper 2005/2012 [læst]                                                                                 |
| Polar Research and Technology                                    | Polar Electro Oy, Kempele, Finland                                     | Training Load Pro: TRIMP, Muscle Load, Perceived Load, Strain/Tolerance                          | White paper 2019/2025 [læst]                                                                                           |
| Peter Düking, Billy Sperlich                                     | TU Braunschweig / Universität Würzburg                                 | Meta-analyse af HRV-styret træning (2021); ChatGPT-løbeplaner (2024)                             | JSAMS 24:1180–1192 [abstract]; JSSM 23:56–72 [læst]                                                                    |
| Agustín Manresa-Rocamora, Alejandro Javaloyes, Manuel Moya-Ramón | Universidad Miguel Hernández de Elche                                  | HRV-styrede cykelstudier (2019, 2020) og meta-analyse (2021)                                     | IJERPH 18:10299 [læst]; IJSPP 2019, JSCR 2020 [abstract]                                                               |
| Frank Imbach, Stéphane Perrey, Robin Candau; Antoine Marchal     | Univ. Montpellier / IMT Mines Alès / Seenovate                         | Konceptuelle og statistiske svagheder i fitness-fatigue-modeller; ML som supplement              | Sports Med Open 2022 [læst]; Sci Rep 2025 [abstract]                                                                   |
| David L. Carey, Tim Gabbett (medforfattere Blanch, Hulin)        | La Trobe / Australien                                                  | Optimering af planer med Banister-mål; acute:chronic-ratioen                                     | IJSPP 2016-0695 [læst]; BJSM 2016 (via Polar)                                                                          |
| Amanda Zaleski, Linda Pescatello                                 | Hartford Hospital / UConn                                              | ChatGPT mod ACSM: 41 % dækning, 91 % korrekthed                                                  | JMIR Med Educ 2024;10:e51308 [læst, via UConn]                                                                         |
| Brecht D'hoe, Jan Boone, Alessandro Colosio                      | Ghent University                                                       | ChatGPT 3.5 slog personlige trænere på 6/9 spørgsmål                                             | JSSM 2026;25:235–261 [læst]                                                                                            |
| Cailbhe Doherty                                                  | University College Dublin                                              | Sammensatte wearable-scorer er uvaliderede og uigennemsigtige                                    | Transl Exerc Biomed 2025, DOI 10.1515/teb-2025-0001 [abstract]                                                         |
| Wouter Timmerman, Chris Abbiss m.fl.                             | Edith Cowan University, Australien                                     | Hvorfor verdensklasse-trænere monitorerer                                                        | ECSS 2023 [abstract]                                                                                                   |
| Tommy R. Lundberg, Sean P. Cumming                               | Karolinska / University of Bath                                        | Etik i måling af unge: frivillighed, uddannelse, holistisk ramme                                 | SJMSS, DOI 10.1111/sms.70361 [abstract]                                                                                |
| David Warden                                                     | 80/20 Endurance, USA                                                   | "Performance Management Chart is lying to you" – ét belastningstal driver mod moderat intensitet | 80/20 Endurance 2020/2026 [læst]                                                                                       |

Tilknytninger i tabellen, som ikke står i den citerede kilde (fx
Edith Cowan University, Karolinska/Bath, Trento), er fra almen viden og
bør tjekkes, før de citeres videre.

Alle web-kilder læst 9. november 2026. Zendesk-sider (Xert, Wahoo
support), Whoops egen vilkårsside, PubMed, De Gruyter, Human Kinetics og
American Physiological Society afviste automatisk hentning; de er
mærket [søgning] eller [abstract] og bør åbnes i en browser, hvis et tal
derfra skal bruges i produktet.

---

## Hvad det betyder for Kadence

### Åbne modeller, Kadence bør tage ind

1. **To belastninger, ikke én.** Beregn TRIMP (Banister, pr. sekund,
   fra pulsen) og sRPE × varighed (fra check-in'et) som to separate
   tal, som Polar gør, og vis dem side om side. Når de glider fra
   hinanden (samme effekt, højere puls og højere RPE), er det et
   tegn, der er værd at vise træneren. Læg ikke tallene sammen til én
   score.
2. **Fitness/træthed/form som visning med Kadences egne navne**, 42/7
   dages konstanter som standard, med Coggans forbehold tydeligt:
   "beskriver, hvor tilvænnet du er til de seneste ugers belastning",
   ikke "forudsiger din præstation". Vis form både absolut og som
   procent af fitness (Intervals.icu). Det er allerede det, formkurven
   gør (ADR 0109); denne note bekræfter valget og advarer mod at gå
   videre til Banister-_forudsigelse_ uden ≥20 præstationsmarkører.
3. **Fosters monotoni** på ugebasis som et stille tjek: er ugen for
   ensformig? Brug individuelle tendenser frem for faste tærskler
   (1,5/2,0 er folklore).
4. **Kritisk effekt og W′ fra turene** (bedste lange maksimalindsats →
   CP, kortere → W′, 1 s → Pmax, som Intervals.icu), med W′-balance på
   Rulle og som "kan rytteren holde dette interval?"-tjek i
   pasbyggeren. Det er den eneste model i noten med en egentlig
   feltvalidering (AUC 0,91), og dens kendte svaghed –
   genopbygningshastigheden er individuel – skal stå ved siden af.
5. **DCU-rammen og klassens timetal som hårde grænser i kode**, uden om
   både model og sprogmodel. Det er det, LLM-studierne viser, maskinen
   ikke selv passer på (for hurtig progression, ingen kontekst).

### Hvor adaptiv planen skal være

- **Adaptiv som bremse, ikke som speeder.** Evidensen (to
  meta-analyser) siger, at daglig styring ikke giver bedre
  gennemsnitspræstation, men færre ryttere, der ikke får noget ud af
  træningen – fordi hårde pas fjernes på dårlige dage. Kadences
  tilpasning bør derfor kunne _nedjustere, flytte eller aflyse_ ét pas
  ud fra check-in og de seneste ture, og aldrig _optrappe_ af sig
  selv.
- **Tilpas hvilket pas, ikke passets indhold** (TrainerRoads princip):
  foreslå et andet pas fra biblioteket eller en lettere variant, så
  træneren kan genkende, hvad der skete.
- **Ét forslag ad gangen, med én begrundelse**, som en "Ændring
  afventer"-tilstand træneren accepterer, afviser eller retter. For
  ryttere uden træner (personligt arbejdsrum) er det rytteren selv.
- **Ugehorisont.** Tilpas den kommende uge ud fra den forgangne;
  sæsonplanen (DCU-rammen) rører maskinen ikke ved.
- **Readiness er rytterens eget ord.** Check-in'et (søvn, ømhed,
  humør, RPE) er den primære kilde, som hos JOIN; wearable-tal er
  valgfrie og vises rå, aldrig som en fremmed "score", og aldrig som
  automatisk input til planen.

### Hvad træneren skal se

- Få tilstande med én sætning hver: "Ugen er mere ensformig end de
  sidste fire", "Belastningen er steget hurtigere end rytterens
  sædvanlige", "Puls og oplevet anstrengelse er højere end effekten
  tilsiger – tre pas i træk". Trænerne i Timmerman et al. vil have
  forståelse og timing, ikke flere tal.
- Tendenser frem for niveauer, og aldrig ryttere sammenlignet på et
  tal i en liste (Duke-notatet og Lundberg et al. om, hvad synlige
  scorer gør ved et hold).
- Hvor et tal vises, vises kilden og usikkerheden ved siden af
  ("TRIMP fra puls; mangler for to ture uden pulsbælte").
- Sprogmodellen bruges til det, den er god til ifølge D'hoe og Düking:
  at forklare formen, at skrive udkastet til ugen ud fra en
  struktureret prompt med klasse, DCU-ramme, seneste fire uger og
  check-ins, og at svare på afgrænsede spørgsmål. Hvert svar
  saniteres og caps'es, og enhver _handling_ er en knap, træneren
  trykker på.

### Hvad Kadence bevidst ikke skal gøre

- Ingen sammensat "readiness"- eller "recovery"-score. Doherty et al.
  2025: ingen producent offentliggør formlen, få validerer, og
  signalerne dobbelttælles. Kadence skal ikke bygge en til.
- Ingen automatisk FTP-/tærskeldetektion, der skriver sig selv ind;
  et forslag med accept/afvis, som TrainerRoad, og med tydelig
  markering af, at det er et estimat uden oplyst fejlrate hos nogen.
- Ingen fast rampegrænse i "point pr. uge" som regel; Friels 5–8 er
  en voksen træners erfaring. Brug rytterens egen historik og DCU's
  timetal for klassen som grænse i stedet.
- Ingen acute:chronic-tærskler fra holdsport (0,8–1,3; 1,5) som
  skadesvarsel for unge landevejsryttere; Polar skriver selv, at
  bekræftelsen mangler i udholdenhedssport.
- Ingen Banister-_forudsigelse_ af præstation for den enkelte; fatigue-
  parametrene er ikke identificerbare (Marchal 2025), og unge har ikke
  nok præstationsmarkører.
- Ingen plan skrevet færdig af sprogmodellen uden gennemlæsning, og
  ingen progressionsregler i prompten alene; grænserne ligger i kode.
- Ingen tal, et hold kan rangeres efter, og ingen wearable-data som
  krav. Det er allerede Kadences rytter-isolation og dogmer; denne
  note viser, at markedet går den modsatte vej, og at litteraturen
  giver Kadence ret.
- Ingen påstand om, at Kadences model er "valideret", før en vinter
  med et rigtigt hold er kørt (dogme syv). Ingen af de kommercielle
  systemer har et uafhængigt studie; Kadence skal ikke låne deres
  retorik.
