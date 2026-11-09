# Intensitet og fysiologi: hvad forskningen siger om fordeling og dosering af udholdenhedstræning

Researchnotat, november 2026 (kilderne er hentet og læst 9. november 2026).

**Spørgsmålet.** Kadence skal have sin egen træningsmodel, som AI'ens ugeforslag og
feedback på ture kan stå på. Hvad siger forskningen om, hvordan udholdenhedstræning
skal fordeles og doseres, hvem står bag ideerne, hvor er feltet uenigt, og hvad
betyder det for et planlægningsværktøj, hvor AI'en foreslår og træneren bestemmer?

**Baseline.** Notatet bygger videre på `docs/research/traeningsparadigmer.md`, især
afsnit 4 (intensitetsfordeling og periodisering) og 5 (styrke). Det, der står der,
gentages ikke: Seilers polariserede model og "80/20", Rosenblat 2025 og Silva
Oliveira 2024 (polariseret mod pyramidal), Neal 2013, Stöggl & Sperlich 2014/2015,
Guellich & Seiler 2010 om juniorer, Gallo 2022, Leo 2020, Svendsen 2018,
periodisering og blokke, og Casado m.fl. 2023 om den norske model. Her går vi dybere
i fysiologien bag zonerne, mekanismerne bag lav intensitet, intervaldosering,
dobbelt tærskel, holdbarhed, mængde mod intensitet og den aktuelle uenighed.

**Metode.**

- **Kilderne.** PubMed og PMC blokerede automatisk læsning den 9. november.
  Abstracts er derfor hentet gennem Europe PMC's API, fuldtekster gennem Europe
  PMC's XML (Haugen 2022, Tønnessen 2014), PLoS' egen side (Tønnessen 2014),
  Frontiers (Karsten 2021), Kents universitetsarkiv (Jones 2019, trukket ud af
  PDF'en med et groft værktøj, så tabeller kan mangle) og sportsci.org (Seiler &
  Tønnessen 2009). Springer, Wiley og MSSE kunne ikke læses i fuld tekst.
- **Mærkerne i teksten:**
  - **[læst]**: hentet og læst i fuld tekst.
  - **[abstract]**: kun abstractet er læst, og tallene stammer derfra.
  - **[web]**: siden er læst gennem et værktøj, der opsummerer. En person bør se
    siden igen, før et tal kommer i kode.
  - **[sekundær]**: oplysningen kommer kun fra en anden kilde end originalen.
  - **[søgning]**: kun set i et søgeresultat. Ikke verificeret, og må ikke bruges i kode.
  - **(beregnet)**: tallet står ikke i kilden, men er vores egen regning.
- **Ord.** "Første tærskel" bruges om LT1/VT1/GET/aerob tærskel og "anden tærskel"
  om LT2/VT2/RCP/MLSS/kritisk effekt, medmindre forskellen er pointen. TSS, CTL,
  ATL, TSB, NP og IF er TrainingPeaks' varemærker og nævnes kun, hvor en kilde gør det.

---

## 0. Kort svar

- **Zonerne.** Fysiologerne er enige om to grænser og tre domæner (moderat, hård,
  svær). Første grænse er første laktat- eller ventilationstærskel. Anden grænse er
  ifølge Jones, Poole, Burnley og Vanhatalo **kritisk effekt (CP)**, ikke MLSS, og
  slet ikke 4 mmol/L. CP ligger i snit ca. 7 % over MLSS (Jones 2019). Faste procenter
  af maksimal puls eller VO2max duer ikke som zonegrænser: første tærskel ligger et
  sted mellem 60 og 90 % af maksimal puls, afhængigt af personen (Iannetta 2020).
- **FTP** er en brugbar, men upræcis, stedfortræder for anden tærskel: i Karsten
  2021 lå den 7 ± 13 W under CP med grænser for overensstemmelse fra −19 til +33 W.
  Taletest og RPE holder overraskende godt: RPE 10-11 (Borg 6-20) ved første
  tærskel, 13-15 ved anden (Bok, Rakovac & Foster 2022).
- **Zone 2.** Det er godt underbygget, at eliten lægger 80-90 % af tiden under første
  tærskel, at den tid er billig at hente, og at den hænger sammen med holdbarhed og
  økonomi. Det er **ikke** underbygget, at "zone 2" er den bedste intensitet til
  mitokondrier eller fedtforbrænding; San Millán & Brooks 2018 er en
  tværsnitskorrelation, og Storoschuk m.fl. 2025 afviser påstanden for befolkningen.
- **Hårde pas.** To om ugen i grundperioden, tre op mod sæsonens top, er mønstret i
  verdensklasse (Tønnessen 2014) og i de forsøg, der viser fremgang (Seiler 2013,
  Rønnestad 2015). Tre VO2max-pas i stedet for ét gav ikke mere, kun mere stress
  (Billat 1999). 4 × 8 min ved ca. 90 % af maksimal puls slog både 4 × 4 og 4 × 16
  (Seiler 2013). Korte intervaller (30/15) slår lange i Rønnestads forsøg med
  veltrænede voksne, men andre finder, at det afgørende er andelen af VO2max, man
  når (Odden 2024). Ingen af delene er testet på juniorer.
- **Dobbelt tærskel** hviler stadig kun på observationer af løbere. Det eneste
  eksperimentelle fund er akut: to korte moderate pas samme dag giver mindre
  "drift" og lavere oplevet belastning end ét langt (Talsnes 2024). Intet er
  publiceret om cykelryttere. Det, der kan overføres, er intensitetsdisciplinen
  (ikke over ca. 3 mmol/L), ikke modellen.
- **Holdbarhed** (fald i effekt efter forudgående arbejde) er målbart, pålideligt
  (Mateo-March 2025) og skiller professionelle fra U23 (Leo 2021). Hvordan det
  trænes, er kun korrelationer: mere tid under første tærskel og en mere polariseret
  fordeling hang sammen med bedre træt effekt (Spragg 2023).
- **Mængde.** Verdensklasse i ski og skiskydning træner ca. 770 t/år med 91 % af
  udholdenhedstiden i zone 1-2 (Tønnessen 2014). For den tidsfattige voksne gælder:
  præstationen kan holdes i 15 uger på to pas om ugen eller en til to tredjedele
  mindre tid, hvis intensiteten bevares (Spiering 2021); det er intensiteten, der
  ikke må gå (Hickson 1985).
- **Uenigheden** står mellem "polariseret er optimalt" (Foster, Casado, Seiler m.fl.)
  og "der er intet bevis for det, pyramidalt med tærskelarbejde er mindst lige så godt"
  (Burnley, Bearden & Jones). Metaanalyserne giver uafgjort. For Kadence betyder det,
  at AI'en skal foreslå begge former som lige gyldige og lade træneren vælge.

---

## 1. Tre-zone-modellen og dens grænser

### 1.1 Kort svar

Der er to grænser, alle er enige om, og tre domæner imellem og omkring dem. Den
første grænse er solidt defineret. Den anden er omstridt i navn, men fysiologerne
med mest data (Jones, Poole, Burnley, Vanhatalo) argumenterer for kritisk effekt. De
populære zonemodeller med fem eller syv zoner er trænerværktøjer uden skarpe
fysiologiske markører, og det siger deres ophavsmænd selv.

### 1.2 Fund

**Domænerne og fysiologernes grænser.**

- Seiler & Tønnessen 2009 [web]: tre-zone-modellen defineres af første og anden
  ventilationstærskel (VT1 og VT2). Forfatterne skriver selv, at zonerne i den norske
  fem-zone-skala "are not based on clearly defined physiological markers", og at
  zone 3 i fem-zone-skalaen omtrent svarer til zone 2 i tre-zone-modellen. Tid i
  pulszoner undervurderer hård tid og dens stress; det, atleten oplever, er passets
  samlede belastning, ikke minutter i en pulszone.
- Jamnick, Pettitt, Granata, Pyne & Bishop 2020, Sports Med 50:1729-1756 [abstract].
  Rammen er "construct validity": en metode er gyldig, hvis den fremkalder de
  forstyrrelser af homeostasen (iltoptagelsens kinetik, laktat), der kendetegner
  det moderate, hårde og svære domæne. Deres dom: "prescribing exercise intensity
  based on a fixed percentage of these maximal anchors has little merit for eliciting
  distinct or domain-specific homeostatic perturbations." Der er "some evidence to
  support the validity of LT1, GET, and VT to delineate the moderate and heavy
  domains", men "little evidence to support the validity of most commonly used
  methods, with exception of CP and CS, to delineate the heavy and severe domains".
  De tilføjer, at akutte svar ikke altid forudsiger kronisk tilpasning, så
  træningsstudier mangler.
- Jones, Burnley, Black, Poole & Vanhatalo 2019, Physiol Rep 7(10):e14098 [læst].
  - Anden grænse "typically occurs at 75-90 % VO2max".
  - MLSS defineres som den højeste effekt, hvor laktat stiger under 1 mmol/L mellem
    minut 10 og 30, målt over typisk 4-5 bouts på 30 min på forskellige dage med
    spring på 1 km/t eller 10-30 W. Fordi MLSS skal lande på et af de diskrete trin,
    "the selected MLSS must always be lower than the actual MLSS". Laktatmålere har
    en fejl på 0,2-0,4 mmol/L (Bonaventura 2015, citeret), og laktat er følsom for
    glykogen og væskestatus.
  - "On average, CP has been reported to be ~7% higher than MLSS (e.g., 4%, Smith
    and Jones 2001; 9%, Pringle and Jones 2002; 16%, Dekerle et al. 2003; 5%, Dekerle
    et al. 2005; 9%, Mattioni Maturana et al. 2016; cf. 1%, Keir et al. 2015)."
  - Konklusion: "MLSS and CP should no longer be considered synonymous", og CP
    "should henceforth be considered the gold standard for defining the maximal
    metabolic steady state, i.e. the boundary between the heavy- and severe-intensity
    exercise domain". Ifølge abstractet kan arbejde præcis ved CP holdes "no more
    than approximately 20-30 min".
  - CP bestemmes enten fra 3-5 udmattende forsøg i det svære domæne med varigheder,
    så VO2max nås, hvilket ikke sker under ca. 2 min eller over ca. 15-20 min, eller
    med 3-min all-out-testen (Burnley 2006, Vanhatalo 2007). W′ er arbejdet over CP
    (eksempel i artiklen: CP 234 W, W′ 25,6 kJ).
- Karsten m.fl. 2021 [læst] gengiver fra litteraturen, at tid til udmattelse ved CP
  er ca. 23 min hos både utrænede og trænede, mod 55 ± 8,5 min ved MLSS (Baron 2008)
  [sekundær].
- Poole, Rossiter, Brooks & Gladden 2021, J Physiol 599:737-767 [abstract].
  "Anaerob tærskel" bygger på en forkert præmis: "insufficient O2 is not the primary
  basis for lactataemia". Laktattærsklen er stadig brugbar, "but its conceptual basis
  should now be understood in light of lactate shuttle biology". Grænsen for et
  vedvarende ikke-oxidativt bidrag "is the critical power, which occurs at a
  metabolic rate often far above the LT and separates heavy from very heavy/severe-
  intensity exercise".
- Korzeniewski & Rossiter 2022, Biosci Rep [abstract], giver en muskelbiokemisk
  model af domænerne ("Pi double-threshold"), hvor den hårde/svære grænse "correspond
  to whole-body critical power". Mest af teoretisk interesse.

**Zoneskalaer i praksis.**

- Olympiatoppens fem-zone-skala, som Tønnessen m.fl. 2014 brugte (tabel 2) [læst]:

  | Zone | Typisk laktat (mmol/L) | Typisk puls (% af maks.) | Tre-zone-model | To-delt |
  | ---- | ---------------------- | ------------------------ | -------------- | ------- |
  | 5    | > 5,8                  | > 94                     | > LT2          | HIT     |
  | 4    | 3,7-5,7                | 89-93                    | > LT2          | HIT     |
  | 3    | 2,1-3,6                | 84-88                    | LT1-LT2        | HIT     |
  | 2    | 1,3-2,0                | 74-83                    | < LT1          | LIT     |
  | 1    | < 1,2                  | 54-73                    | < LT1          | LIT     |

  Fodnoten: værdierne er gennemsnit af 29 elitelangrendsløberes selvrapporterede
  grænser, "and individual adjustments are required". Bemærk at zone 3 i denne
  skala, altså "tærskelzonen", regnes som hård (HIT), og at zone 1 og 2 begge ligger
  under første tærskel. Den nyeste udgave af skalaen (2024) er citeret i
  `traeningsparadigmer.md`.

- Seiler-Viken, Mentzoni, Seiler, Skarli & Losnegard 2025, Sci Rep [abstract]:
  778 udholdenhedspraktikere; en fem-zone-skala var mest brugt (47 %), nordmænd 2,7
  gange så tilbøjelige til at bruge den. Nedre grænser for zone 2 og 3 varierede med
  region og idræt, og "Cyclists self-selected the lowest mean %HRmax lower limits of
  Zones 1, 2, and 3", formentlig på grund af længere pas og lavere mekanisk stress,
  hvilket forfatterne ser som grund til "zone 2"-populariteten i cykling.
- Haugen, Sandbakk, Seiler & Tønnessen 2022 [læst]: "no consensus has so far been
  established", og "no single intensity parameter performs satisfactorily in
  isolation".
- Sitko m.fl. 2025, IJSPP [abstract], 14 eksperter (bl.a. Seiler, Mujika, Grappe, Leo,
  Mateo-March, Valenzuela, Zabala): zone 2 "should preferably be performed at
  intensities located immediately below the first lactate or ventilatory threshold".

**Hvor godt holder feltets stedfortrædere?**

- Iannetta m.fl. 2020, MSSE [abstract], 100 personer (46 kvinder, 54 mænd), LT og
  MLSS målt direkte: første tærskel lå ved 45-74 % VO2max, 23-57 % af maksimal
  effekt og **60-90 % af maksimal puls**; MLSS ved 69-96 % VO2max, 44-71 % af
  maksimal effekt og **75-97 % af maksimal puls**. Kvinder lå højere i procent end
  mænd. Konklusion: faste procenter "conform poorly to exercise intensity domains and
  thus do not adequately control the metabolic stimulus".
- Meyler, Bottoms, Wellsted & Muniz-Pumares 2023, Exp Physiol [abstract], n = 10:
  når hårdt arbejde blev givet som procent af VO2max, lå effekten over CP hos 70 %,
  og kun 30 % gennemførte; alle gennemførte, når intensiteten var sat efter CP og
  GET. Variationen i laktat og W′-forbrug var lavere med tærskler. Anbefaling: brug
  fysiologiske tærskler, hvor det er muligt.
- Odden m.fl. (Rønnestad-gruppen) 2024, Eur J Sport Sci [abstract]: 22 veltrænede
  ryttere, 21 pas 5 × 8 min i 9 uger med iltoptagelse målt i alle pas. Jo højere andel
  af VO2max i arbejdsperioderne, jo større fremgang (VO2max R² = 0,54, maksimal
  effekt 0,44). "% of maximal heart rate … exhibited poorer session-to-session
  repeatability compared to % of VO2max."
- **FTP mod CP.** Karsten, Petrigna, Klose, Bianco, Townsend & Triska 2021, Front
  Physiol [læst]: 17 moderat trænede ryttere og triatleter (VO2peak 51 ± 10). CP fra
  12-, 7- og 3-min-forsøg var 256 ± 50 W, FTP (95 % af 20 min) 249 ± 44 W, 20-min-
  effekten 262 ± 46 W. Bias 7 ± 13 W, grænser for overensstemmelse −19 til +33 W,
  r = 0,969. "these estimates of threshold power should not be used interchangeably".
  Fra deres litteratur: Borszcz 2018 fandt grænser på −62 til +60 W mellem FTP og
  individuel anaerob tærskel; Valenzuela 2018 fandt brede grænser hos moderat
  trænede og bedre overensstemmelse hos veltrænede [sekundær]. Artiklen er internt
  inkonsistent om p-værdi og bias mellem abstract og diskussion.
- **Taletest og RPE.** Bok, Rakovac & Foster 2022, Sports Med [abstract]: "The TT and
  RPE appear to be valid measures of both the ventilatory threshold and the
  respiratory compensation threshold." Taletestens tvetydige trin og RPE 10-11 svarer
  til første tærskel; det negative trin og RPE 13-15 til anden. Følelsesskalaen (FS)
  er for variabel ved første tærskel. Hos højt trænede cykelryttere fandt mindre
  studier (2013, 2015) det samme, med VT ved ca. 69 % af maksimal puls [søgning].

### 1.3 Slutninger

- En model for Kadence bør have **to individuelle ankre** pr. rytter (første og
  anden tærskel i watt og puls) og udlede zonerne fra dem. Procent af maksimal puls
  alene er ikke godt nok: Iannettas spænd betyder, at en fast "zone 2" på 74-83 %
  for nogle er over første tærskel og for andre langt under.
- Anden tærskel bør **ikke** sættes lig 4 mmol/L. Hvis en rytter kun har FTP, er den
  en rimelig stedfortræder, men med en usikkerhed på ± 20-30 W hos moderat trænede,
  som AI'en bør sige højt. CP fra et kort og et langt maksimalt forsøg (3 og 12 min,
  som Spragg 2023 brugte på landevej) er fysiologisk bedre begrundet og enkelt at
  få fra FIT-filer.
- Taletest og RPE kan være Kadences **tredje anker** for ryttere uden wattmåler, og
  det er det, en U17-rytter oftest har.
- Olympiatoppens skala er et godt udgangspunkt, fordi den tydeligt mapper til de tre
  domæner og allerede ligger i `traeningsparadigmer.md`. Grænsen mellem zone 2 og 3
  (første tærskel) og mellem 3 og 4 (anden tærskel) er de to, der skal være individuelle.

### 1.4 Huller

- Jamnick 2020 er kun læst som abstract; artiklens konkrete tal for spredning i
  %VO2max ved GET og dens dom over Dmax, OBLA og "+1 mmol" er ikke set.
- Jeg fandt ingen undersøgelse, der sammenligner FTP direkte med MLSS hos
  cykelryttere, og ingen cykelspecifik undersøgelse af spredningen i puls ved første
  tærskel; Iannetta 2020 er på ergometer med blandede personer.
- Jones 2019's tabel med fysiologiske forskelle over og under CP (figur 6) kom ikke
  med i tekstudtrækket.

---

## 2. Zone 2 og lav intensitet: hvad holder, og hvad er overdrevet

### 2.1 Kort svar

At eliten lægger langt det meste af sin tid under første tærskel, er det mest
robuste fund i hele feltet. Mekanismeforklaringen "zone 2 træner mitokondrierne og
laktatclearance bedst" er derimod en hypotese bygget på tværsnitsdata og
laktatshuttle-teori, og en ny narrativ oversigt afviser den som generelt råd.

### 2.2 Fund

**Hvad San Millán og Brooks faktisk viste.**

- San-Millán & Brooks 2018, Sports Med 48:467-479 [abstract]. Indirekte kalorimetri
  og laktat hos professionelle udholdenhedsatleter, moderat aktive og personer med
  metabolisk syndrom. Fedtoxidation var højere og laktat lavere hos de
  professionelle. Fedtoxidation og laktat var omvendt korreleret i alle grupper
  (r = −0,97, −0,98, −0,92; samlet r = −0,76). Konklusionen er en tro, ikke et bevis:
  "we believe that measurements of [La−] and FATox rate during exercise provide an
  indirect method to assess metabolic flexibility and oxidative capacity".
  Studiet er et tværsnit uden træningsintervention; det viser, at trænede har lavere
  laktat ved samme belastning, ikke at træning ved en bestemt intensitet skaber det.
- Brooks 2018, Cell Metab [abstract]: laktatshuttle-teorien. Laktat dannes
  kontinuerligt også aerobt og er energikilde, glukoneogenetisk forstadie og
  signalmolekyle. Det er den teoretiske ramme under San Milláns model.
- Poole, Rossiter, Brooks & Gladden 2021 [abstract] bekræfter: laktat skyldes
  glykolytisk flux, ikke iltmangel.

**Hvad modsiger "zone 2 er optimalt for mitokondrierne"?**

- MacInnis & Gibala 2017, J Physiol [abstract]: "increases in mitochondrial content
  are superior after HIIT compared to MICT, at least when matched-work comparisons
  are made within the same individual", og sprintintervaller giver samme
  mitokondrieindhold som moderat kontinuerlig træning trods meget mindre mængde.
- Storoschuk, Moran-MacDonald, Gibala & Gurd 2025, Sports Med [abstract]: "These
  recommendations largely stem from observational data of elite endurance athletes"
  og "current evidence does not support Zone 2 training as the optimal intensity for
  improving mitochondrial or fatty acid oxidative capacity. Further, evidence
  suggests prioritizing higher exercise intensities (> Zone 2) is critical to
  maximize cardiometabolic health benefits, particularly in the context of lower
  training volumes." Rettet mod befolkningen, ikke atleter.
- Sitko m.fl. 2025 [abstract]: eksperterne forventer brede tilpasninger af zone 2,
  men "These expected adaptations might not be unique to zone 2 and could also be
  induced with sessions performed at slightly higher and lower intensities." En
  kommentar fra Chavez Guevara 2025 (IJSPP) efterlyser en "unbiased analysis"
  [søgning].

**Hvad holder om lav intensitet?**

- Tønnessen m.fl. 2014 [læst]: 91 ± 1 % af udholdenhedstiden i zone 1-2 hos 11
  guldvindere (afsnit 6).
- Haugen m.fl. 2022 [læst]: ≥ 80 % af løbemængden ved lav intensitet. "accumulation
  of high frequency and volume of low-intensity training (LIT) is considered an
  important stimulus for inducing peripheral adaptations (e.g., increased
  mitochondrial biogenesis and capillary density of the skeletal muscle)",
  "Accumulated volume of low intensity running seems to be a characteristic of those
  with better running economy". Om "restitutionsløb": "No scientific studies to
  date support this assumption"; følelsen af restitution skyldes snarere den lave
  belastning.
- Seiler & Tønnessen 2009 [web]: store mængder lav intensitet driver formentlig
  perifere tilpasninger, mindre mængder hård intensitet hjerte og bufferkapacitet;
  men "the signalling effects of specific duration-intensity combinations are not
  yet well understood". De beskriver det "sorte hul", hvor motionister driver op i
  tærskelarbejde på de dage, der skulle være lette.
- Casado, Hanley, Santos-Concejero & Ruiz-Pérez 2021, JSCR [abstract]: 85 elite- og
  verdensklasseløbere; samlet distance (r ≥ 0,75) og lette løb (r ≥ 0,68)
  korrelerede stærkest med præstation efter 3, 5 og 7 år; lange intervaller svagt
  (r ≥ 0,22). Retrospektivt og selvrapporteret.
- Spragg, Leo & Swart 2023, Eur J Sport Sci [abstract]: hos 30 professionelle U23-
  ryttere hang mere tid under VT1 sammen med bedre 2-min-effekt efter 2000 kJ
  (r = 0,43). Korrelation (se afsnit 5).
- Voet, van Erp, Viribay, de Koning & Lamberts 2025, IJSPP [abstract]: hos 10
  semiprofessionelle hang kulhydratoxidation i træt tilstand sammen med tid under
  første laktattærskel, og samme træning gav forskellig effekt på frisk mod træt
  præstation. Lille studie.

### 2.3 Slutninger

- Godt underbygget: lav intensitet er grundstoffet, fordi det kan akkumuleres i
  mængder, hårde pas ikke kan, med lav omkostning, og det er forbundet med
  holdbarhed og økonomi. Det er en **mængde**-begrundelse, ikke en
  mitokondrie-begrundelse.
- Overdrevet: at zone 2 er en særligt "mitokondriel" intensitet; at man skal
  forbrænde fedt under træning for at blive god til det; at én laktatværdi (fx 2,0)
  er en universel grænse. For voksne med få timer er det direkte misvisende: dér
  skal intensiteten op (Storoschuk 2025, Spiering 2021).
- For Kadence: kald zonen "lige under første tærskel" og begrund den med mængde og
  holdbarhed, ikke med mitokondrier.

### 2.4 Huller

- Ingen randomiseret undersøgelse har sammenlignet "zone 2" (lige under første
  tærskel) med lavere eller højere lav intensitet på mitokondrier eller præstation
  hos trænede cykelryttere. San Millán-gruppens 2020-studie af 21 WorldTour-ryttere
  (Frontiers) og Nemkov 2023 (Sports Med) er kun set i søgning [søgning].
- Kritikken af Brooks' tracer-metoder (Sahlin 1987) er kun set i forumtråde
  [søgning] og tæller ikke.

---

## 3. HIIT og tærskelarbejde: dosis, format og effekt

### 3.1 Kort svar

To hårde pas om ugen, med samlet 30-40 minutters arbejde omkring 90 % af maksimal
puls eller så høj andel af VO2max som muligt, er den dosis, forsøgene viser fremgang
med hos trænede voksne. Flere end tre hårde pas giver ikke mere. Formatet (korte
30/15 mod lange 4-8 min) er omstridt, men pointen bag begge lejre er den samme: tid
ved høj andel af VO2max.

### 3.2 Fund

**Rammen.**

- Buchheit & Laursen 2013, Sports Med, del I (43:313-338) og II [abstract]. HIT
  programmeres med "up to nine variables" (arbejdsintensitet og -varighed,
  pauseintensitet og -varighed, modalitet, gentagelser, serier, pause mellem serier
  og dens intensitet). Målet er "at least several minutes per session in their 'red
  zone,' which generally means reaching at least 90% of their maximal oxygen
  uptake". Del II tilføjer den anaerobe glykolytiske andel og den neuromuskulære
  belastning; formater med samme kardiorespiratoriske svar kan have "distinctly
  different anaerobic energy contributions".

**Lange intervaller.**

- Seiler, Jøranson, Olesen & Hetlelid 2013, SJMSS [abstract]. 35 trænede
  motionsryttere (VO2peak 52 ± 6), ca. 6 t/uge, 7 uger, **2 intervalpas/uge** plus
  2-3 lette. 4 × 16 min blev kørt ved 88 % af maksimal puls og 4,9 mmol/L, 4 × 8 ved
  90 % og 9,6 mmol/L, 4 × 4 ved 94 % og 13,2 mmol/L. 4 × 8 gav 11,4 % (8,0-14,9)
  samlet fremgang i VO2peak, effekt ved VO2peak og effekt ved 4 mmol/L, mod 4,2 %
  (kun lav intensitet), 5,6 % (4 × 16) og 5,5 % (4 × 4), p < 0,02. "Accumulating 32
  min of work at 90% HR max induces greater adaptive gains than accumulating 16 min
  of work at ∼95% HR max despite lower RPE."
- Odden m.fl. 2024 [abstract] (afsnit 1): 5 × 8 min ved højeste 40-min-effekt;
  fremgangen fulgte andelen af VO2max i arbejdsperioderne.
- Haugen m.fl. 2022, tabel 2 [læst], for løbere: tærskelintervaller på 3-15 min
  (fx 10-12 × 1000 m, 6-8 × 1500-2000 m, 4 × 5000 m) med 30-75 min samlet
  arbejdstid; VO2max-intervaller på 2-4 min med 2-3 min pause og 15-20 min samlet.
  "Threshold" defineres som "an intensity close to half-marathon pace", altså den
  øvre ende af feltet mellem LT1 og LT2, nær MLSS.

**Korte intervaller.**

- Rønnestad, Hansen, Vegge, Tønnessen & Slettaløkken 2015, SJMSS
  [abstract]. 10 uger, **2 HIT/uge**, indsatsmatchede korte (SI, n = 9) mod lange
  (LI, n = 7) intervaller hos cykelryttere. VO2max +8,7 ± 5,0 % mod +2,6 ± 5,2 %;
  effektstørrelser 0,86-1,54 til fordel for SI på 30 s, 5 min og 40 min all-out.
- Rønnestad, Hansen, Nygaard & Lundby 2020, SJMSS: 3 uger hos eliteryttere, 30/15 mod
  5-min-intervaller, igen til fordel for de korte [søgning]. Fuldteksten kunne ikke
  læses.
- Rønnestad, Øfsteng, Zambolin, Raastad & Hammarström 2021, IJSPP [abstract]. En uges
  chokblok med 5 pas: SI (5 serier af 12 × 30/15) mod LI (6 × 5 min). SI gav 5,7 %
  (1,3-10,3) større fremgang i VO2max og 3,8 % (0,2-7,4) ved 4 mmol/L.
- Almquist m.fl. 2020, SJMSS [abstract], akut hos 8 eliteryttere: SI gav 14 % højere
  gennemsnitseffekt (421 mod 371 W) og mere tid over 90 % VO2max og over 90 % af
  maksimal puls ved samme RPE og laktat.
- Bossi, Mesquida, Passfield, Rønnestad & Hopker 2020, IJSPP [abstract]: 14 ryttere
  (VO2max 69); intervaller med varierende effekt gav mere tid over 90 % VO2max (410
  mod 286 s) ved samme RPE og laktat.
- Mølmen & Rønnestad 2024, APNM [abstract]: narrativ oversigt med beslutningsdiagram
  for valg af intervalformat; fokus på at holde ≥ 90 % VO2max.
- Seiler har indvendt, at 13 × 30/15 reelt fungerer som ét langt interval med
  varierende effekt [sekundær, TrainRight].

**Hvor mange hårde pas?**

| Kilde                       | Dosis                                                                                                                                                                                             | Mærke      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Seiler & Tønnessen 2009     | Eliten med 10-12 pas/uge "likely to dedicate 1-3 sessions weekly to training at intensities at or above the maximum lactate steady state"                                                         | [web]      |
| Billat m.fl. 1999, MSSE     | 8 løbere: ét vVO2max-pas/uge forbedrede vVO2max; tre pas/uge i 4 uger ændrede intet, men noradrenalin efter test steg fra 11,1 til 26,0 nmol/L                                                    | [abstract] |
| Tønnessen m.fl. 2014        | 106 ± 20 hårde pas/år, 63 ± 14 t; ca. 2 om ugen i grundperioden, ca. 3 op mod toppen (p < 0,01)                                                                                                   | [læst]     |
| Haugen m.fl. 2022           | Bowermans regel: "2-3 weekly interval sessions, a weekly long run, and fill the rest with as much LIT as you can handle" gælder "most successful long-distance runners during the last 5 decades" | [læst]     |
| Sandbakk m.fl. 2025         | 12 norske verdensklassetrænere: 2-3 nøgledage om ugen med 3-5 intensive pas (se `traeningsparadigmer.md`)                                                                                         | [abstract] |
| Seiler 2013, Rønnestad 2015 | 2 hårde pas/uge i forsøgene med fremgang                                                                                                                                                          | [abstract] |

**Fordeling med samme belastning.**

- Filipas, Bonato, Gallo & Codella 2022, SJMSS [abstract]. 60 veltrænede mandlige
  løbere, 16 uger, samme belastning: pyramidal, polariseret, pyramidal → polariseret
  eller omvendt. Alle blev bedre; PYR → POL mest (ca. +3,0 % relativ VO2peak, +1,7 %
  fart ved 2 mmol, +1,5 % ved 4 mmol og 5 km). Det er den eneste kontrollerede
  undersøgelse af **rækkefølge** af fordelinger.
- Treff m.fl. 2017, Front Physiol [abstract]. 14 nationale eliteroere, 11 uger, zone 1
  låst på ca. 93-94 %: polariseret (6 % zone 3) var ikke bedre end pyramidal (3 %
  zone 2). Med så meget zone 1 er forskellen mellem de to fordelinger små.
- Hebisz & Hebisz 2024, PLoS One [abstract]: 24 veltrænede kvindelige ryttere i 8
  ugers polariseret program (SIT, HIIT, LIT, hvile i 4-dages mikrocyklus); lav
  kadence under intervallerne gav større fremgang. Nævnes, fordi det er et af få
  kontrollerede cykelforsøg med kvinder.

**Ét langt eller to korte moderate pas.**

- Kjøsen Talsnes, Torvik, Skovereng & Sandbakk 2024, Front Physiol [abstract]. 14
  mandlige udholdenhedsatleter (VO2max 69), 6 × 10 min moderat mod 2 × (3 × 10 min)
  med 6,5 t imellem, tids- og intensitetsmatchet. I det lange pas steg puls, laktat
  og RPE fra første til anden halvdel (168 → 173 slag, 2,60 → 3,01 mmol/L, 13,4 →
  14,8); i det delte pas faldt de (171 → 166, 2,72 → 2,14). Det lange gav højere
  liggende puls bagefter, højere session-RPE (7,0 mod 6,0) og mere træthed og
  ømhed næste morgen. "the lower cost of the two shorter sessions indicates that such
  organization could allow more accumulated time at this intensity."

### 3.3 Slutninger

- **Standarddosis for en planlægger:** 2 hårde pas/uge i grundperioden, højst 3 op
  mod form, og resten let. Det er fælles for verdensklassens praksis og de
  kontrollerede forsøg. Flere end 3 hviler på ingenting.
- **Standardformat:** 4 × 8 min ved ca. 90 % af maksimal puls (eller lige over anden
  tærskel) er det bedst dokumenterede enkeltpas hos trænede voksne cykelryttere.
  30/15 er et stærkt alternativ i Rønnestads data, men alle hans forsøg er på
  veltrænede eller elite-voksne med n = 7-9 pr. gruppe. Hos juniorer er intet testet.
- Diskussionen "korte mod lange" handler om det samme: andelen af VO2max, der nås.
  Kadence kan ikke måle den, men kan vise puls som andel af maksimal puls i
  arbejdsperioderne og samlet tid over ca. 90 %, med forbeholdet fra Odden om
  pulsens ringere gentagelighed.
- Tærskelarbejde er ikke farligt i sig selv; det kommer i stedet for noget. Haugens
  løbere laver 30-75 min samlet tærskelarbejde pr. pas, men to gange om ugen inden
  for 11-14 pas.

### 3.4 Huller

- Der findes ingen metaanalyse af korte mod lange intervaller hos cykelryttere;
  Mølmen & Rønnestad 2024 er en narrativ oversigt, og kun abstractet er læst.
- Rønnestad 2020 (elite, 3 uger) og Stöggl & Sperlich 2015's effektstørrelser er
  ikke læst her; 2014-forsøget står i `traeningsparadigmer.md`.
- Ingen undersøgelse af intervaldosering hos U17-U19-ryttere er fundet.

---

## 4. Den norske model og laktatstyret træning

### 4.1 Kort svar

Casado m.fl. 2023's forbehold står ved magt (se `traeningsparadigmer.md` 4.5): kun
observationer, kun løbere på 1500-10.000 m, ingen kontrollerede studier. Siden er der
kommet en systematisk oversigt over de samme løbere (Kelemen 2023), ét akut forsøg,
der støtter rationalet bag at dele tærskelpas (Talsnes 2024), og en begrebsmæssig
sammenligning med østafrikansk træning (Grivas 2026). Om cykelryttere findes intet
fagfællebedømt.

### 4.2 Fund

- Kelemen, Benczenleitner & Tóth 2023, Sci J Sport Perf 3(1):38-46,
  doi 10.55860/NBXV4075 [web]. Systematisk oversigt over syv artikler om 13 norske
  eliteløbere: 120-180 km/uge; ca. 75-80 % ved lav intensitet; 2-4 ugentlige pas ved
  anaerob tærskel, kontinuerligt eller som intervaller, "often two on the same day
  during the base period"; 1-2 ugentlige pas med korte intervaller eller sprint;
  lange intervaller over tærskel sjældent i grundperioden; styring med laktatmåler
  eller puls. Abstractet har trykfejl i pulsgrænserne og skal læses igen før brug.
- Marius Bakkens egen beskrivelse (mariusbakken.com) [web]. Læge, tidligere løber
  (13:06 på 5000 m), begyndte at måle laktat sidst i 1990'erne og at doble
  tærskelpas i 1999; "over 5,500 lactate tests". Han sænkede målet "from the standard
  level of 4.0 mmol/l down initially to below 3.0" og lå typisk på 2,3-3,0; nogle
  topløbere har tærskel ved 2,0. Lette løb: "we are below 1.0 mml/l, heart rate
  below 70 % of max". Ugen: "twice-a-week two threshold sessions and usually once a
  week a session with different stimuli" (bakke). Formater fra 30 s til 10 min, fx
  6-min-intervaller om morgenen og 1 min/30 s eller 45/15 om aftenen. Ca. 180 km/uge.
  Begrundelsen er, at muskeltonus, ikke stofskiftet, begrænser belastningen, og at
  måleren lader ham akkumulere mere tærskeltid uden at overtræne. Om andre: "the
  adaptive processes in the body are similar from one person to the other", men
  individuelle forskelle betyder noget. Triatlontræner Arild Tveiten anvender
  lignende principper på tværs af svøm, cykel og løb.
- Kjøsen Talsnes m.fl. 2024 [abstract] (afsnit 3): det første eksperimentelle fund, der
  støtter rationalet: to korte moderate pas samme dag giver mindre fysiologisk drift
  og lavere omkostning end ét langt. Akut, 14 mænd, løb, ingen træningseffekt målt.
- Grivas m.fl. 2026, Front Physiol [abstract]: "the Norwegian model emphasizes
  threshold-density training, lactate-guided intensity control, structured interval
  formats, and repeated moderate-intensity sessions embedded within a high volume of
  low-intensity work"; begge systemer "appear capable of supporting world-class
  endurance performance", så "elite endurance performance does not depend on a single
  optimal training model".
- Sandbakk m.fl. 2025 (se `traeningsparadigmer.md`): dobbelt tærskel bruges i løb og
  langrend, men ikke universelt blandt de norske verdensklassetrænere [søgning for
  denne detalje].
- Seiler-Viken m.fl. 2025 [abstract] minder om, at cykelryttere sætter deres
  zonegrænser lavere end løbere; "tærskel" er ikke det samme tal på tværs af idrætter.

### 4.3 Slutninger

- **Hvad der kan overføres til ikke-elite-ryttere:** intensitetsdisciplinen, altså at
  tærskelpas kører **under** anden tærskel (Bakkens 2,3-3,0 mmol/L svarer til
  Olympiatoppens zone 3, ikke zone 4), og ideen om at dele et langt tærskelpas i to,
  når man vil have mere kvalitetstid uden mere træthed. Begge dele kan Kadence
  støtte uden laktatmåler: med watt og puls lige under anden tærskel og med
  "to pas samme dag" som en passtruktur.
- **Hvad der ikke kan overføres:** 10-14 pas om ugen, afhængigheden af en laktatmåler
  (fejl 0,2-0,4 mmol/L, Jones 2019; fingerprik på børn), og rationalet selv.
  Bakkens begrænsning er muskeltonus og stødbelastning fra løb; cykelryttere kan
  allerede akkumulere store mængder uden stød, så fordelen ved "tærskeltæthed" er
  mindre åbenlys dér, og cykelryttere ligger i forvejen med mere tid mellem
  tærsklerne end andre (Sperlich 2023 i `traeningsparadigmer.md`). Guellich & Seiler
  2010 advarer mod netop det hos juniorer.
- Modellen bør fortsat ikke tilbydes som paradigme. Laktatfelter kan være
  valgfrie og trænerindtastede, så en træner, der måler, kan gemme sine tal.

### 4.4 Huller

- Ingen fagfællebedømt undersøgelse af dobbelt tærskel hos cykelryttere, hverken
  observation eller forsøg, er fundet. Cykelversioner findes kun på blogs [søgning].
- Ingen kontrolleret undersøgelse af hele modellen over tid hos nogen gruppe.
- Tjelta 2019 om Ingebrigtsen-brødrene og Haugen/Tjeltas senere arbejde er ikke
  fundet i Europe PMC og er ikke læst.

---

## 5. Holdbarhed ("durability")

### 5.1 Kort svar

Holdbarhed er faldet i fysiologiske mål og i effekt efter forudgående arbejde. Det er
målbart fra almindelige FIT-filer, pålideligt mellem gentagelser, større hos
professionelle end hos U23 og hos bedre end hos dårligere ryttere. Intensiteten af det
forudgående arbejde betyder mere end kilojoule alene. Hvordan det trænes, er kun
korrelationer: mere tid under første tærskel og en mere polariseret fordeling.

### 5.2 Fund

**Begrebet og målingen.**

- Maunder, Seiler, Mildenhall, Kilding & Plews 2021, Sports Med [abstract]. Holdbarhed
  defineres som "the time of onset and magnitude of deterioration in physiological-
  profiling characteristics over time during prolonged exercise". Profiler målt i
  udhvilet tilstand "are not static".
- Hunter, Maunder, Jones, Gallo & Muniz-Pumares 2025, Exp Physiol [abstract].
  "greater relative intensity and duration resulting in more marked deterioration
  of baseline measures"; protokoller skal styre ernæring og miljø for at være
  gentagelige.
- Sánchez-Jiménez, Salas-Montoro, Mateo-March, Priego-Quesada, Zabala & Pérez-Díaz
  2026, Eur J Appl Physiol [abstract]. Systematisk oversigt over 21 studier: "power
  output declines of 10-20% were observed after 2.5-15 kJ kg⁻¹ of prior high-
  intensity work, whereas similar or greater work volumes at lower intensities
  resulted in smaller performance decrements." Kilojoule "does not account for
  intensity, limiting its accuracy in durability assessments."
- Mateo-March m.fl. 2025, Int J Sports Med [abstract]. 18 professionelle: bedste
  effekter for 10 s til 20 min efter 0-40 kJ/kg; fald tydeligt efter 20 kJ/kg; høj
  gentagelighed (SEM < 5 %, ICC > 0,90), lavest for 10 s.
- Mateo-March m.fl. 2025, J Sci Med Sport [abstract]. 42 kvinder og 42 mænd: fald
  efter > 10 kJ/kg hos begge køn; kvinder faldt mere efter 20 kJ/kg (4, 4 og 2 % for
  1, 5 og 20 min) og 30 kJ/kg (8, 6 og 7 %).

**Hvad hænger det sammen med?**

- Spragg, Leo & Swart 2023, MSSE [abstract]. 10 professionelle på 19,2 ± 0,8 år
  (VO2max 74,4, CP 5,6 W/kg). CP målt frisk og efter 5 × 8 min ved 105-110 % CP.
  Fald i CP hang sammen med relativ maksimal effekt (r = 0,89), relativ VO2max
  (0,84), effekt ved VT1 (0,75-0,83), bruttoeffektivitet ved 300 W (0,87) og
  negativt med kulhydratoxidation ved 200 W (−0,70). Regressionen forklarede
  R² = 0,96-0,98, men med n = 10 er det overtilpasset.
- Valenzuela m.fl. 2023, IJSPP [abstract]. 12 professionelle (VO2max 83): 20-min-
  effekt faldt 2,9 % efter ca. 4 timer og 40 kJ/kg (386 → 375 W), men fra −8,5 til
  +1,1 % mellem ryttere, og **uden** sammenhæng med VO2max, VT eller maksimal effekt.
  Modsiger Spragg på det punkt.
- Leo m.fl. 2021, IJSPP [abstract]. Tour of the Alps: professionelle havde højere
  relativ effekt efter 1000-3000 kJ end U23, mens den eksterne belastning var ens
  og den interne højere hos U23. Effektprofilen forudsagde klassement og UCI-point
  (R² = 0,90-0,99). "The power profile after 1000 to 3000 kJ of total work could be
  used by practitioners to evaluate the readiness of U23 cyclists to move into the
  professional ranks."
- Inoue, Mateo-March m.fl. 2026, SJMSS og JSCR [abstract]. 25 XCO-ryttere: de bedste
  faldt 4-10 % efter en 140-min træthedsprotokol, de svageste 14-20 %; den trætte
  10/20-test forklarede 89 % af variationen i løbspræstation.

**Hvordan trænes det?**

- Spragg, Leo & Swart 2023, Eur J Sport Sci [abstract] (også i
  `traeningsparadigmer.md`): hos 30 U23-professionelle hang mere tid under VT1
  sammen med bedre 2-min-effekt efter 2000 kJ (r = 0,43), og et skift mod mere
  polariseret fordeling med bedre 12-min-effekt efter 2000 kJ (r = 0,41). Den trætte
  profil varierede mere over sæsonen end den friske og var dårligst sidst på sæsonen.
- Voet m.fl. 2025 [abstract]: intet enkelt belastningsmål forudsagde fremgang; frisk og
  træt præstation reagerede forskelligt på samme træning.
- Ingen randomiseret undersøgelse af, hvilken træning der forbedrer holdbarhed, er fundet.

### 5.3 Slutninger

- Kadence kan beregne en **frisk og en træt effektprofil** fra FIT-filer (bedste
  effekt for 1, 5, 12 og 20 min efter 0, 10, 20 og 30 kJ/kg eller efter faste
  kJ-trin), som Spragg, Leo og Mateo-March gør, og vise faldet i procent. Målet er
  pålideligt hos professionelle (Mateo-March 2025) og meningsfuldt for U19 og U23,
  fordi juniorløb er korte, men internt hårde (Gallo 2022), og fordi det er præcis
  dét, der skiller U23 fra professionelle (Leo 2021).
- kJ/kg kræver kropsvægt, som Kadence ikke gemmer som tal (NNR-referencevægt i
  stedet). Absolutte kJ pr. rytter over tid er brugbare til at følge den enkelte,
  men ikke til at sammenligne ryttere. Sánchez-Jiménez 2026 minder om, at kJ uden
  intensitet er et dårligt mål for træthed, så tiden over anden tærskel før
  indsatsen bør vises ved siden af.
- "Sådan træner du holdbarhed" må formuleres som det, det er: hos U23-professionelle
  hang mere let tid og færre pas mellem tærsklerne sammen med bedre træt effekt.
  Intet mere.
- Hos U17 er der ingen data, og ingen grund til at vise et holdbarhedstal.

### 5.4 Huller

- Ingen interventionsstudier af træning for holdbarhed. Ingen data for U17 eller for
  juniorer under 19 år. Ingen data for motionister på 6-8 t/uge.
- Hunter 2025 og Sánchez-Jiménez 2026 er kun læst som abstract.

---

## 6. Mængde mod intensitet, og den mindste virksomme dosis

### 6.1 Kort svar

I verdensklasse stiger præstationen med mængden, og mængden består af let træning.
For den, der har få timer, er svaret omvendt: intensiteten er det, der ikke må
skæres væk. Begge dele er godt underbygget, men af hver sin population.

### 6.2 Fund

**Verdensklasse.**

- Tønnessen, Sylta, Haugen, Hem, Svendsen & Seiler 2014, PLoS One 9(7):e101796
  [læst]. 11 norske guldvindere i langrend og skiskydning (4 mænd, 7 kvinder; mændene
  havde 41 guld tilsammen, kvinderne 25), året før deres bedste resultat: 770 ± 99 t
  og 470 ± 68 pas; 94 ± 3 % udholdenhed, 5 ± 2 % styrke, 1 ± 1 % sprint. Målt i tid
  var 91 ± 1 % af udholdenhedstiden lav intensitet (zone 1-2) og 9 ± 1 % hård (zone
  3-5); zonerne fordelte sig 86,0 / 5,3 / 3,3 / 3,3 / 2,1 %. Talt i **pas** var det
  77 ± 2 % lette og 23 ± 2 % hårde. Hård træning udgjorde 63 ± 14 t og 106 ± 20
  pas. Mængden faldt 32 ± 15 % fra grundperiode til topform, mest ved at skære let
  træning (−31 ± 17 %), mens hårde pas steg fra ca. 2 til ca. 3 om ugen og de
  samlede pas lå på 8-10. "Only three out of 11 athletes took a rest day during the
  final 5 days prior to their most successful competition", og "we did not observe
  the recommended ∼50% training volume reduction".
- Seiler & Tønnessen 2009 [web]: "Elite endurance athletes perform 80 % or more of
  their training at intensities clearly below their lactate threshold." En
  teenagecykelrytter med fem træningsdage ligger på 10-15 t/uge, en professionel
  med 1000-km-uger på 25-30 t. Tolereret mængde er omvendt relateret til den
  ballistiske og excentriske belastning i idrætten; løb tåler mindre end cykling og
  svømning. Intensiveringsstudier i veltrænede skiløbere gav kun beskedne
  ændringer. Tyske juniorroere lagde 95 % under 2 mmol/L.
- Haugen m.fl. 2022 [læst]: løbere i verdensklasse laver 11-14 pas/uge, ≥ 80 % let,
  og træner typisk to gange om dagen for at nå mængden; "Successful endurance
  athletes in cross-country skiing, biathlon, cycling, triathlon, swimming, and
  rowing train considerably more (800-1200 h per year)". De advarer også: "many
  unsuccessful athletes have applied the same 'recipe' as successful runners", og
  doping i international atletik må medregnes som bias.
- Casado m.fl. 2021 [abstract]: samlet distance forklarede ≥ 57 % af variationen i
  præstation hos 85 eliteløbere.
- van Erp, Sanders & de Koning 2020, IJSPP [abstract]: 4 års data for 20 mænd og 10
  kvinder på professionelt niveau; mænd havde længere og mere let træning, kvinder
  "compensate their lower training volume, with a higher training intensity"; den
  samlede belastning (målt med TrainingPeaks' mål) var næsten ens.

**Den mindste dosis.**

- Spiering, Mujika, Sharp & Foulis 2021, JSCR 35:1449-1458 [abstract]. "endurance
  performance can be maintained for up to 15 weeks when training frequency is
  reduced to as little as 2 sessions per week or when exercise volume is reduced by
  33-66% (as low as 13-26 minutes per session), as long as exercise intensity
  (exercising heart rate) is maintained." "Insufficient data exists to make specific
  recommendations for athletes." Konklusion: "exercise intensity seems to be the key
  variable".
- Hickson, Kanakis, Davis, Moore & Rich 1982, J Appl Physiol [abstract]. 13 personer
  trænede 40 min/dag, 6 dage/uge i 10 uger (VO2max +10-20 %), derefter 15 uger med
  26 eller 13 min/dag ved samme intensitet og hyppighed. VO2max og 5-min-udholdenhed
  blev holdt i begge grupper; udholdenhed over 2 timer faldt 10 % (139 → 123 min) i
  13-min-gruppen.
- Hickson, Foster, Pollock, Galassi & Rich 1985, J Appl Physiol [abstract]. Samme
  design, men intensiteten skåret med en eller to tredjedele: VO2max faldt i begge
  grupper, langtidsudholdenhed faldt 21 % (184 → 145 min) og 30 % (202 → 141 min),
  og venstre ventrikels masse gik tilbage til udgangspunktet. "training intensity is
  an essential requirement for maintaining the increased aerobic power".
- Hicksons forsøgspersoner var nytrænede voksne, ikke atleter. Barbieri m.fl. 2024
  (Front Physiol) konkluderer, at der er "a dearth of data" om reduceret træning hos
  udholdenhedsatleter [søgning].
- Storoschuk m.fl. 2025 [abstract] og MacInnis & Gibala 2017 [abstract] (afsnit 2):
  ved lav mængde giver højere intensitet mest.
- Seiler 2013's deltagere trænede ca. 6 t/uge med 2 intervalpas og fik 11 % fremgang
  på 7 uger [abstract].

### 6.3 Slutninger

- Dosis-respons for mængde er veldokumenteret på tværs af idrætter i toppen, men
  som observation. Det, der kan overføres til U17-U23, står i
  `traeningsparadigmer.md` (Karlsson 2021, Staff 2023): ca. 50 t mere om året, og
  næsten alt af det let.
- Til Motionisten og den tidsfattige træner: Kadence kan skelne mellem **vedligehold**
  (2 pas/uge, kort, men med intensiteten bevaret, i op til ca. 15 uger) og
  **opbygning**, og sige det. "To hårde og så meget let, du kan" er en rimelig
  tommelfingerregel, men tallene bag den er fra motionister og nytrænede.
- At hårde pas skal stige fra to til tre, mens let mængde skæres op mod
  sæsonens vigtigste løb, er det bedst dokumenterede mønster for topform og passer
  med DCU's årshjul.

### 6.4 Huller

- Ingen dosis-respons-kurve for ugentlige timer hos cykelryttere på 5-12 t/uge er
  fundet. Ingen data om den mindste dosis hos juniorer.
- Tønnessen 2014 handler om ski; cykelmodstykket (Gallo 2022, Leo 2020) står i
  `traeningsparadigmer.md` og er langt mindre.

---

## 7. Hvor feltet er uenigt, 2022-2026

### 7.1 Kort svar

Uenigheden handler mindre om data end om ord og om, hvad "optimalt" betyder. Begge
sider er enige om, at det meste skal være let, og at hårde pas skal doseres. De
strides om zone 2, om tælling og om, hvorvidt man overhovedet kan tale om én optimal
fordeling.

### 7.2 Fund

**Polariseret mod pyramidal (MSSE 54(6), 2022).**

- Burnley, Bearden & Jones 2022, "Polarized Training Is Not Optimal for Endurance
  Athletes", doi 10.1249/MSS.0000000000002869 [sekundær: lida-register og
  FastRunning]. De anfægter, at "80 % let, 20 % hårdt" afspejler praksis; de fleste
  træner pyramidalt. De frygter, at polariseringsfortalere skræmmer atleter væk fra
  tærskelarbejde i zone 2, som de ser som vigtigt for løbsspecifik biomekanisk,
  fysiologisk og psykologisk tilpasning, og citerer Jack Daniels og Renato Canova.
  Deres zone 2 ligger mellem laktattærsklen og kritisk effekt. I svaret på Foster:
  "We conclude that there is presently no evidence that a specifically polarized
  training intensity distribution is optimal", og programmer "do and should
  prioritize zone 1 and zone 2 over zone 3", altså pyramidalt. De bemærker, at Foster
  kritiserede tærskeltræning, men så selv slog polariseret og pyramidal sammen.
- Foster, Casado, Esteve-Lanao, Haugen & Seiler 2022, "Polarized Training Is Optimal
  for Endurance Athletes", doi 10.1249/MSS.0000000000002871, og svaret
  doi 10.1249/MSS.0000000000002923 [sekundær]. Atleter "self-select for a large total
  percentage of low intensity (Zone 1) training", 60-90 % på tværs af ski, cykling,
  svømning og roning; let træning driver mitokondrier gennem calciumsignalering med
  lav autonom stress, hård træning gennem AMPK med risiko for inflammation; Billat
  1999 viser, at løbere tåler under 10 % i zone 3. De medgiver, at pyramidal kan
  være lige så god, og at det kan afhænge af disciplinen, og de henviser til HERITAGE-
  studiets individuelle respons. Kommentatoren konkluderer, at debatten ingen klar
  vinder har.
- Metaanalyserne (Rosenblat 2025, Silva Oliveira 2024, i `traeningsparadigmer.md`)
  giver uafgjort mellem polariseret og pyramidal, og Filipas 2022 peger på, at
  rækkefølgen pyramidal → polariseret kan være bedre end begge alene.

**Tre betydninger af "zone 2".** Seilers zone 2 er feltet mellem de to tærskler.
Burnley og Jones' zone 2 er det samme felt, men med CP som øvre grænse. Den populære
"zone 2" (San Millán, podcasts) er intensiteten **under** første tærskel, altså
Seilers zone 1 og Olympiatoppens zone 2. Sitko 2025 forsøger at låse den populære
betydning til "lige under første tærskel". Meget af den offentlige strid skyldes, at
de tre betydninger blandes.

**Tælling.** Tønnessen 2014 viser forskellen tydeligt: 91/9 målt i tid, 77/23 målt i
pas. Seiler tæller pas efter deres mål; Burnley og Jones tæller tid. Begge er rigtige,
men de giver forskellige fordelinger af den samme træning.

**Anden tærskel.** Jones, Poole, Burnley og Vanhatalo: CP er guldstandarden. Den
tyske og norske laktattradition (Mader og Heck, Olympiatoppen) bruger MLSS eller faste
laktatværdier. Forskellen er i snit ca. 7 % af effekten (Jones 2019), nok til at
flytte et tærskelpas fra "hårdt domæne" til "svært domæne".

**Korte mod lange intervaller.** Rønnestad-gruppen (Lillehammer) mod Seiler
(Kristiansand), begge i Norge. Data for de korte er konsistente, men små; Odden 2024
fra Rønnestads egen gruppe peger på, at det fælles er andelen af VO2max.

**Zone 2-hypen.** San Millán og Brooks mod Gibala og Gurd (Storoschuk 2025).
Eksperterne i Sitko 2025 lander imellem: zone 2 er god, men ikke unik.

**Holdbarhed.** Spragg 2023 fandt stærke sammenhænge med laboratoriemål,
Valenzuela 2023 ingen. Og om kJ som træthedsmål er brugbart alene, siger Sánchez-
Jiménez 2026 nej.

**Dobbelt tærskel.** Entusiasterne mod alle, der bemærker, at der ikke findes et
eneste kontrolleret studie (Casado 2023 selv, Kelemen 2023).

**Periodisering.** Se `traeningsparadigmer.md` 4.4: formen betyder mindre end
belastning og fordeling.

### 7.3 Slutninger

- For et værktøj er den vigtigste konsekvens, at AI'en **ikke må præsentere én
  fordeling som den rigtige**. Den kan sige: "Det meste let. To hårde pas. Om de
  hårde pas ligger lige under anden tærskel eller klart over, er to lige gyldige
  skoler, og din træner vælger."
- Kadences ordforråd skal undgå "zone 2" som fagudtryk og i stedet sige "under
  første tærskel", "mellem tærsklerne" og "over anden tærskel".
- Kadence bør vise fordelingen **både** i tid og i pas, så en træner af begge skoler
  kan læse den.

### 7.4 Huller

- Burnley 2022 og Foster 2022 er ikke læst i originalen (MSSE er lukket); argumenterne
  er fra registertekst og en kommentar. Sprogbrugen om "zone 2" i Burnleys tekst
  bør tjekkes af en person.

---

## 8. Hvad det betyder for Kadence

AI'en foreslår, træneren bestemmer. Nedenfor er de konkrete krav, forskningen
stiller til modellen, ugeforslagene og feedbacken.

**Zonemodellen.**

1. **To individuelle ankre pr. rytter:** første tærskel og anden tærskel, hver i watt
   og puls, med dato og kilde (test, estimat fra ture, trænerens skøn). Zonerne
   udledes af ankrene, aldrig af procent af maksimal puls alene (Iannetta 2020,
   Jamnick 2020). `taerskler-fra-turene.md` beskriver, hvordan ankrene kan estimeres.
2. **Skala:** Olympiatoppens fem zoner med den eksplicitte mapping til tre domæner
   (zone 1-2 under første tærskel, zone 3 mellem, zone 4-5 over anden). Standardværdierne
   fra tabellen i afsnit 1 kan bruges som udfyldning, før rytteren har egne tal, med
   teksten "typiske værdier, din træner justerer".
3. **Anden tærskel:** når kun FTP findes, sættes anden tærskel lig FTP med en vist
   usikkerhed på ± 20-30 W (Karsten 2021). Når rytteren har et maksimalt 3-min- og
   12-min-forsøg, beregnes CP og W′ og foretrækkes. 4 mmol/L bruges ikke.
4. **Tredje anker for ryttere uden watt:** taletest og RPE (Borg 6-20: 10-11 ved
   første tærskel, 13-15 ved anden; Bok 2022). Check-in'ens RPE kan kalibreres mod det.

**Ugeforslag.**

5. **Standard:** 2 hårde pas om ugen i grundperioden, 3 op mod sæsonens mål, resten
   under første tærskel. Løbsdage tæller som hårde pas. Over 3 hårde pas kræver
   trænerens aktive valg og får en begrundelse med (Billat 1999, Tønnessen 2014).
6. **To skoler, ét valg:** polariseret (hårde pas over anden tærskel, lidt imellem)
   eller pyramidal (en del af det hårde lige under anden tærskel). AI'en foreslår
   den, træneren har valgt for holdet, og nævner den anden som lige gyldig.
7. **Pasbibliotek med evidensmærke:** 4 × 8 min ved ca. 90 % af maksimal puls som
   standard-VO2max-pas (Seiler 2013); 30/15-serier som alternativ for voksne (Rønnestad
   2015, 2021); tærskelintervaller på 3-15 min med 30-60 min samlet arbejde for
   voksne, mindre for U17; et "delt tærskelpas" (to korte moderate pas samme dag) som
   mulighed for dem, der kan (Talsnes 2024). Hvert pas bærer sit evidensniveau og
   den population, det er testet på, så AI'en kan sige "testet på veltrænede voksne,
   ikke på juniorer".
8. **Motionist med få timer:** en "vedligehold"-tilstand: 2 pas om ugen med
   intensiteten bevaret kan holde formen i op til ca. 15 uger (Spiering 2021);
   skæres intensiteten, går formen (Hickson 1985). AI'en siger, hvilken tilstand den
   foreslår for.
9. **Mængdeudvikling for U17-U23** følger `traeningsparadigmer.md` (ca. 50 t mere
   om året, næsten alt let). Den norske model tilbydes ikke; laktatfelter kan være
   valgfrie, trænerindtastede.

**Feedback på ture.**

10. **Intensitetsdisciplin på lette dage:** vis tid mellem tærsklerne på dage, der
    var planlagt lette, og sig det som en kollega ("Turen lå 40 % mellem tærsklerne;
    planen var under første tærskel"). Leo 2020's U23-ryttere lå 20/70/10 og
    forfatterne kaldte det "poor intensity zone discipline".
11. **Hårde pas:** vis puls som andel af maksimal puls i arbejdsperioderne og samlet
    tid over ca. 90 %, med forbeholdet om pulsens gentagelighed (Odden 2024). Målet
    er "flest mulige minutter højt", ikke "højest mulig watt i det første interval".
12. **Fordeling i to visninger:** tid i zoner og pas efter mål, side om side
    (Tønnessen 2014: 91/9 mod 77/23).
13. **Holdbarhed for U19 og U23:** frisk og træt effektprofil (bedste 1-, 5-, 12- og
    20-min-effekt efter faste mængder forudgående arbejde) med fald i procent og
    tiden over anden tærskel før indsatsen ved siden af. Eget navn, ikke
    TrainingPeaks'. Ikke for U17, hvor der ingen data er. Rådet om træning formuleres
    som korrelation: mere let tid og færre pas mellem tærsklerne hang sammen med bedre
    træt effekt hos U23-professionelle (Spragg 2023).
14. **Ordvalg i AI-svar:** "under første tærskel", "mellem tærsklerne", "over anden
    tærskel" i stedet for "zone 2" og "tærskel"; aldrig mitokondrie- eller
    fedtforbrændingsargumenter for let træning, kun mængde og holdbarhed.

**Hvad modellen skal skrive om sig selv.**

15. Modellens dokumentation skal nævne, at ingen RCT findes for juniorlandevejsryttere,
    at holdbarhed kun er korreleret med træning, at korte intervaller kun er testet på
    voksne, og at de to skoler er uafgjort. Det er dogma seks (AI'en foreslår) i praksis:
    AI'en kan kun være ærlig om usikkerheden, hvis modellen er det.

---

## 9. Ikke verificeret eller ikke fundet

- Jamnick 2020, Buchheit & Laursen 2013, Burnley 2022, Foster 2022, Mølmen &
  Rønnestad 2024, Spragg 2023 (begge), Maunder 2021, Hunter 2025, Sánchez-Jiménez
  2026, Iannetta 2020, Meyler 2023, Bok 2022, Storoschuk 2025, Sitko 2025: kun
  abstract eller registertekst. Fuldtekster bør læses, før tal går i kode.
- Rønnestad 2020 (elite, 3 uger, 30/15): kun søgning.
- Stöggl & Sperlich 2015's effektstørrelser: ikke læst her.
- Ingen cykelstudie af dobbelt tærskel. Ingen interventionsstudie af holdbarhed.
  Ingen FTP-mod-MLSS-studie. Ingen dosis-respons for timer hos ryttere på 5-12 t/uge.
  Ingen intervaldoseringsstudie hos U17-U19.
- Affiliationer i afsnit 10 er taget fra artiklernes forfatterlinjer, hvor de er læst,
  ellers fra almen viden; de mærket ° er ikke verificeret den 9. november 2026.

---

## 10. Personer og kilder

### 10.1 Personerne

| Person                           | Tilhørsforhold                                                                                       | Står for                                                                    | Nøgleudgivelse                                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Stephen Seiler                   | Universitetet i Agder, Kristiansand                                                                  | Polariseret træning, tre-zone-modellen, tælling af pas efter mål, 4 × 8-pas | Seiler 2010 (IJSPP), Seiler m.fl. 2013 (SJMSS), Seiler & Tønnessen 2009 (Sportscience)                                |
| Espen Tønnessen                  | Høyskolen Kristiania°, tidligere Olympiatoppen                                                       | Verdensklassens træningsdagbøger, "The Road to Gold"                        | Tønnessen m.fl. 2014, PLoS One, doi 10.1371/journal.pone.0101796                                                      |
| Øyvind Sandbakk                  | NTNU / UiT Norges arktiske universitet°                                                              | Norsk træningspraksis, trænerinterviews, akut fysiologi i moderat træning   | Sandbakk m.fl. 2025 (Sports Med Open); Kjøsen Talsnes m.fl. 2024, doi 10.3389/fphys.2024.1428536                      |
| Thomas Haugen                    | Høyskolen Kristiania°                                                                                | Integrering af forskning og "results-proven practice"                       | Haugen m.fl. 2022, Sports Med Open, doi 10.1186/s40798-022-00438-7                                                    |
| Bent R. Rønnestad                | Høgskolen i Innlandet, Lillehammer                                                                   | Korte intervaller (30/15), blokperiodisering, tid ved ≥ 90 % VO2max         | Rønnestad m.fl. 2015, SJMSS, doi 10.1111/sms.12165; Rønnestad m.fl. 2021, IJSPP, doi 10.1123/ijspp.2020-0647          |
| Knut Sindre Mølmen               | Høgskolen i Innlandet°                                                                               | Oversigt over intervaltræning, beslutningsdiagram                           | Mølmen & Rønnestad 2024, APNM, doi 10.1139/apnm-2023-0603                                                             |
| Nicholas Jamnick                 | Victoria University, Melbourne (ved udgivelsen)                                                      | Construct validity af intensitetsankre                                      | Jamnick m.fl. 2020, Sports Med, doi 10.1007/s40279-020-01322-8                                                        |
| David J. Bishop                  | Victoria University, Melbourne                                                                       | Mitokondrier, træningsintensitet; senior på Jamnick 2020                    | Som ovenfor                                                                                                           |
| Andrew M. Jones                  | University of Exeter                                                                                 | Kritisk effekt som anden grænse, VO2-kinetik                                | Jones m.fl. 2019, Physiol Rep, doi 10.14814/phy2.14098                                                                |
| Anni Vanhatalo                   | University of Exeter                                                                                 | Kritisk effekt, 3-min all-out-test                                          | Som ovenfor                                                                                                           |
| Mark Burnley                     | University of Kent (2019), nu Loughborough University°                                               | Kritisk effekt; kritiker af "polariseret er optimalt"                       | Burnley, Bearden & Jones 2022, MSSE, doi 10.1249/MSS.0000000000002869                                                 |
| David C. Poole                   | Kansas State University                                                                              | Intensitetsdomæner, "anaerob tærskel" er en misforståelse                   | Poole m.fl. 2021, J Physiol, doi 10.1113/JP279963                                                                     |
| George A. Brooks                 | University of California, Berkeley                                                                   | Laktatshuttle-teorien                                                       | Brooks 2018, Cell Metab, doi 10.1016/j.cmet.2018.03.008                                                               |
| Iñigo San Millán                 | University of Colorado School of Medicine°; træner i UAE Team Emirates°                              | "Zone 2", metabolisk fleksibilitet, laktat og fedtoxidation                 | San-Millán & Brooks 2018, Sports Med, doi 10.1007/s40279-017-0751-x                                                   |
| Martin J. Gibala                 | McMaster University                                                                                  | HIIT og sprintintervaller, mitokondrier; medforfatter på zone 2-kritikken   | MacInnis & Gibala 2017, J Physiol, doi 10.1113/JP273196; Storoschuk m.fl. 2025, doi 10.1007/s40279-025-02261-y        |
| Brendon J. Gurd                  | Queen's University, Kingston°                                                                        | Mitokondriel tilpasning; senior på zone 2-kritikken                         | Storoschuk m.fl. 2025                                                                                                 |
| Martin Buchheit & Paul Laursen   | Buchheit: dengang ASPIRE, Doha°; Laursen: AUT, Auckland°                                             | Programmering af HIT, ni variable, tid over 90 % VO2max                     | Buchheit & Laursen 2013, Sports Med, doi 10.1007/s40279-013-0029-x og 10.1007/s40279-013-0066-5                       |
| Carl Foster                      | University of Wisconsin-La Crosse                                                                    | Taletest, session-RPE, forsvarer af polariseret træning                     | Foster m.fl. 2022, MSSE, doi 10.1249/MSS.0000000000002871; Bok, Rakovac & Foster 2022, doi 10.1007/s40279-022-01690-3 |
| Arturo Casado                    | Universidad Rey Juan Carlos, Madrid°                                                                 | Den norske model i løb, lette løbs betydning                                | Casado m.fl. 2023 (IJERPH); Casado m.fl. 2021, JSCR, doi 10.1519/JSC.0000000000003176                                 |
| Marius Bakken                    | Læge, tidligere eliteløber, Norge                                                                    | Ophavsmand til dobbelt tærskel og laktatstyring under 3 mmol/L              | mariusbakken.com/the-norwegian-model.html; medforfatter på Casado 2023                                                |
| Leif Inge Tjelta                 | Universitetet i Stavanger°                                                                           | Norske løberes træning                                                      | Medforfatter på Casado 2023                                                                                           |
| Ed Maunder                       | Auckland University of Technology                                                                    | Begrebet holdbarhed                                                         | Maunder m.fl. 2021, Sports Med, doi 10.1007/s40279-021-01459-0                                                        |
| Daniel Muniz-Pumares             | University of Hertfordshire°                                                                         | Tærskelbaseret ordination, metode for holdbarhed                            | Meyler m.fl. 2023, Exp Physiol, doi 10.1113/EP090878; Hunter m.fl. 2025, doi 10.1113/EP092120                         |
| James Spragg                     | University of Cape Town° / træner                                                                    | Holdbarhed hos U23-professionelle                                           | Spragg, Leo & Swart 2023, MSSE, doi 10.1249/MSS.0000000000003024; Eur J Sport Sci 2023                                |
| Peter Leo                        | Universität Innsbruck°                                                                               | U23-ryttere, effektprofil efter arbejde                                     | Leo m.fl. 2021, IJSPP, doi 10.1123/ijspp.2020-0381                                                                    |
| Pedro L. Valenzuela              | Universidad de Alcalá / Hospital 12 de Octubre, Madrid°                                              | Holdbarhed i felten, zone 2-ekspertpanel                                    | Valenzuela m.fl. 2023, IJSPP, doi 10.1123/ijspp.2022-0202                                                             |
| Manuel Mateo-March               | Universidad Miguel Hernández, Elche°                                                                 | Holdbarhed fra effektprofiler, pålidelighed, kønsforskelle                  | Mateo-March m.fl. 2025, doi 10.1016/j.jsams.2025.02.009 og 10.1055/a-2555-8961                                        |
| Teun van Erp                     | Stellenbosch University°                                                                             | Professionelle rytteres træningsdata                                        | van Erp, Sanders & de Koning 2020, IJSPP, doi 10.1123/ijspp.2019-0320; Voet m.fl. 2025, doi 10.1123/ijspp.2024-0321   |
| Danilo Iannetta & Juan M. Murias | University of Calgary (ved udgivelsen)                                                               | Spredning i tærskler som procent af maksimum                                | Iannetta m.fl. 2020, MSSE, doi 10.1249/MSS.0000000000002147                                                           |
| Bettina Karsten                  | University of Greenwich (ved udgivelsen)°                                                            | FTP mod kritisk effekt                                                      | Karsten m.fl. 2021, Front Physiol, doi 10.3389/fphys.2020.613151                                                      |
| Luca Filipas                     | Università degli Studi di Milano°                                                                    | Rækkefølge af pyramidal og polariseret                                      | Filipas m.fl. 2022, SJMSS, doi 10.1111/sms.14101                                                                      |
| Gunnar Treff & Billy Sperlich    | Treff: Universität Ulm (dengang)°; Sperlich: Universität Würzburg                                    | Polariseret mod pyramidal hos roere; Polarization-Index                     | Treff m.fl. 2017, Front Physiol, doi 10.3389/fphys.2017.00515                                                         |
| Véronique Billat                 | Université d'Évry°                                                                                   | vVO2max-intervaller, én mod tre hårde pas                                   | Billat m.fl. 1999, MSSE, doi 10.1097/00005768-199901000-00024                                                         |
| Robert C. Hickson                | University of Illinois at Chicago°                                                                   | Reduceret træning: intensitet bevarer, varighed kan skæres                  | Hickson m.fl. 1982, doi 10.1152/jappl.1982.53.1.225; 1985, doi 10.1152/jappl.1985.58.2.492                            |
| Barry A. Spiering & Iñigo Mujika | Spiering: US Army Research Institute of Environmental Medicine°; Mujika: Universidad del País Vasco° | Mindste dosis til vedligehold; tapering                                     | Spiering m.fl. 2021, JSCR, doi 10.1519/JSC.0000000000003964                                                           |
| Sebastian Sitko                  | Universidad de Zaragoza°                                                                             | Ekspertkonsensus om "zone 2"                                                | Sitko m.fl. 2025, IJSPP, doi 10.1123/ijspp.2024-0303                                                                  |
| Daniel Bok                       | Sveučilište u Zagrebu°                                                                               | Subjektive metoder: taletest, RPE, følelsesskala                            | Bok, Rakovac & Foster 2022, Sports Med                                                                                |
| Olympiatoppen                    | Norges olympiske toppidrætscenter                                                                    | Fem-zone-skalaen, "results-proven practice"                                 | olt-skala.nif.no/olt_2024_no.pdf (i `traeningsparadigmer.md`)                                                         |

### 10.2 Kilderne

**Læst i fuld tekst**

- Haugen T, Sandbakk Ø, Seiler S, Tønnessen E 2022, Sports Med Open: https://doi.org/10.1186/s40798-022-00438-7
- Jones AM, Burnley M, Black MI, Poole DC, Vanhatalo A 2019, Physiol Rep 7(10):e14098: https://doi.org/10.14814/phy2.14098 (læst via https://kar.kent.ac.uk/75502/)
- Karsten B m.fl. 2021, Front Physiol 11:613151: https://doi.org/10.3389/fphys.2020.613151
- Tønnessen E m.fl. 2014, PLoS One 9(7):e101796: https://doi.org/10.1371/journal.pone.0101796

**Læst som web/opsummering**

- Seiler S, Tønnessen E 2009, Sportscience 13:32-53: https://www.sportsci.org/2009/ss.htm
- Bakken M, "The Norwegian model": https://www.mariusbakken.com/the-norwegian-model.html
- Kelemen B, Benczenleitner O, Tóth L 2023, Sci J Sport Perf 3(1):38-46: https://doi.org/10.55860/NBXV4075 (via https://lida.sport-iat.de/ta/Record/4085594)
- Long M, "Poles apart", FastRunning (om Burnley/Foster-debatten): https://fastrunning.com/running-athletics-news/poles-apart/34206
- Registerposter for Burnley m.fl. 2022 og Foster m.fl. 2022: https://lida.sport-iat.de/ta/Record/4076014 og https://lida.sport-iat.de/ta/Record/4076013

**Abstracts (Europe PMC)**

- Almquist NW m.fl. 2020, SJMSS: https://doi.org/10.1111/sms.13672
- Billat VL m.fl. 1999, MSSE: https://doi.org/10.1097/00005768-199901000-00024
- Bok D, Rakovac M, Foster C 2022, Sports Med: https://doi.org/10.1007/s40279-022-01690-3
- Bossi AH m.fl. 2020, IJSPP: https://doi.org/10.1123/ijspp.2019-0260
- Brooks GA 2018, Cell Metab: https://doi.org/10.1016/j.cmet.2018.03.008
- Buchheit M, Laursen PB 2013, Sports Med, del I: https://doi.org/10.1007/s40279-013-0029-x; del II: https://doi.org/10.1007/s40279-013-0066-5
- Burnley M, Bearden SE, Jones AM 2022, MSSE: https://doi.org/10.1249/MSS.0000000000002869
- Casado A m.fl. 2021, JSCR: https://doi.org/10.1519/JSC.0000000000003176
- Casado A, Foster C, Bakken M, Tjelta LI 2023, IJERPH: https://doi.org/10.3390/ijerph20053782
- Filipas L m.fl. 2022, SJMSS: https://doi.org/10.1111/sms.14101
- Foster C m.fl. 2022, MSSE: https://doi.org/10.1249/MSS.0000000000002871; svar: https://doi.org/10.1249/MSS.0000000000002923
- Grivas GV m.fl. 2026, Front Physiol: https://doi.org/10.3389/fphys.2026.1878492
- Hebisz R, Hebisz P 2024, PLoS One: https://doi.org/10.1371/journal.pone.0311833
- Hickson RC m.fl. 1982, J Appl Physiol: https://doi.org/10.1152/jappl.1982.53.1.225
- Hickson RC m.fl. 1985, J Appl Physiol: https://doi.org/10.1152/jappl.1985.58.2.492
- Hunter B m.fl. 2025, Exp Physiol: https://doi.org/10.1113/EP092120
- Iannetta D m.fl. 2020, MSSE: https://doi.org/10.1249/MSS.0000000000002147
- Inoue A m.fl. 2026, SJMSS: https://doi.org/10.1111/sms.70324; JSCR: https://doi.org/10.1519/JSC.0000000000005669
- Jamnick NA m.fl. 2020, Sports Med: https://doi.org/10.1007/s40279-020-01322-8
- Kjøsen Talsnes R m.fl. 2024, Front Physiol: https://doi.org/10.3389/fphys.2024.1428536
- Korzeniewski B, Rossiter HB 2022, Biosci Rep: https://doi.org/10.1042/BSR20220798
- Leo P m.fl. 2021, IJSPP: https://doi.org/10.1123/ijspp.2020-0381
- MacInnis MJ, Gibala MJ 2017, J Physiol: https://doi.org/10.1113/JP273196
- Mateo-March M m.fl. 2025, J Sci Med Sport: https://doi.org/10.1016/j.jsams.2025.02.009
- Mateo-March M m.fl. 2025, Int J Sports Med: https://doi.org/10.1055/a-2555-8961
- Maunder E m.fl. 2021, Sports Med: https://doi.org/10.1007/s40279-021-01459-0
- Meyler S m.fl. 2023, Exp Physiol: https://doi.org/10.1113/EP090878
- Mølmen KS, Rønnestad BR 2024, APNM: https://doi.org/10.1139/apnm-2023-0603
- Odden I m.fl. 2024, Eur J Sport Sci: https://doi.org/10.1002/ejsc.12202
- Poole DC, Rossiter HB, Brooks GA, Gladden LB 2021, J Physiol: https://doi.org/10.1113/JP279963
- Rønnestad BR m.fl. 2015, SJMSS: https://doi.org/10.1111/sms.12165
- Rønnestad BR m.fl. 2021, IJSPP: https://doi.org/10.1123/ijspp.2020-0647
- San-Millán I, Brooks GA 2018, Sports Med: https://doi.org/10.1007/s40279-017-0751-x
- Sánchez-Jiménez JL m.fl. 2026, Eur J Appl Physiol: https://doi.org/10.1007/s00421-025-05885-0
- Seiler S, Jøranson K, Olesen BV, Hetlelid KJ 2013, SJMSS: https://doi.org/10.1111/j.1600-0838.2011.01351.x
- Seiler-Viken SA m.fl. 2025, Sci Rep: https://doi.org/10.1038/s41598-025-17023-z
- Sitko S m.fl. 2025, IJSPP: https://doi.org/10.1123/ijspp.2024-0303
- Spiering BA, Mujika I, Sharp MA, Foulis SA 2021, JSCR: https://doi.org/10.1519/JSC.0000000000003964
- Spragg J, Leo P, Swart J 2023, MSSE: https://doi.org/10.1249/MSS.0000000000003024
- Spragg J, Leo P, Swart J 2023, Eur J Sport Sci: https://doi.org/10.1080/17461391.2022.2049886
- Storoschuk KL, Moran-MacDonald A, Gibala MJ, Gurd BJ 2025, Sports Med: https://doi.org/10.1007/s40279-025-02261-y
- Treff G m.fl. 2017, Front Physiol: https://doi.org/10.3389/fphys.2017.00515
- Valenzuela PL m.fl. 2023, IJSPP: https://doi.org/10.1123/ijspp.2022-0202
- van Erp T, Sanders D, de Koning JJ 2020, IJSPP: https://doi.org/10.1123/ijspp.2019-0320
- Voet JG m.fl. 2025, IJSPP: https://doi.org/10.1123/ijspp.2024-0321

**Kun set i søgning**

- Rønnestad BR, Hansen J, Nygaard H, Lundby C 2020, SJMSS, korte mod lange intervaller hos eliteryttere.
- Barbieri A m.fl. 2024, Front Physiol, detraining hos udholdenhedsatleter: https://doi.org/10.3389/fphys.2023.1334766
- Chavez Guevara IA 2025, IJSPP, kommentar til Sitko m.fl.: https://doi.org/10.1123/ijspp.2025-0120
- Taletest hos højt trænede cykelryttere 2013 og 2015 (PubMed 23007491 og 25259472).
