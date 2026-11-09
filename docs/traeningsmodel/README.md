# Kadences træningsmodel

Kadences egen model for at foreslå, forklare og følge træning for landevejsryttere fra U17 til masters, fra motion til elite. Den er grundlaget for AI'ens ugeforslag, dens feedback på ture og dens coaching, og den er skrevet, så en træner kan læse den og være uenig.

Modellen bygger på ni researchnotater i `docs/research/traeningsmodel/` (intensitet og fysiologi, periodisering, belastning og monitorering, unge og udvikling, voksne og ældre, styrke og off-bike, coaching og psykologi, sundhed, digitale systemer og AI) og på de ældre notater om træningsparadigmer, seniorprofiler, forældre og ernæring. Reglerne, modellen holder, står nummereret i [regler.md](regler.md). Personerne og kilderne, den læner sig op ad, står i [kilder-og-personer.md](kilder-og-personer.md).

## 1. Hvad modellen er, og hvad den ikke er

Modellen er et sæt principper og regler for, hvordan Kadence lægger et udkast til en uge, hvordan det kommenterer en tur, og hvad det siger til en rytter, en træner og en forælder. Den lever to steder: som rækværk i kode (`src/modules/load/guardrails.ts`, `src/modules/dcu`, `src/modules/paradigms`) og som ord i AI'ens prompter (`src/modules/assist`). Koden holder grænserne. Prompten holder tonen og forklaringen.

Det, modellen gør:

- Den **foreslår**. AI'en laver et udkast til den nærmeste uge, foreslår én ændring ad gangen og begrunder den i én sætning. En træner, eller rytteren selv i et personligt arbejdsrum, siger ja, nej eller retter. Det er dogme fem: AI'en foreslår, en træner beslutter, og den skriver, sender og sletter aldrig noget selv.
- Den **beskriver**. Kondition, træthed og friskhed er beskrivelser af, hvad rytteren har lavet på det seneste og over længere tid. Coggan kalder selv sin model "purely descriptive" (Coggan, TrainingPeaks [læst]), og Kadence siger det samme højt.
- Den **forklarer**. Hvert tal, der vises, har en kilde og en usikkerhed ved siden af sig. Hvert forslag har et hvorfor.

Det, modellen ikke gør:

- Den **diagnosticerer ikke**. Overtræning er en udelukkelsesdiagnose for en læge (Meeusen m.fl. 2013 [læst]). Skade, sygdom, lav energitilgængelighed, hjernerystelse og mental sundhed hører til hos læge, fysioterapeut og træner. Kadence samler mønstret og peger på, hvem der skal se det.
- Den **giver ikke lægeråd**. Aldrig et præparat, en dosis, en raskmelding eller en tilladelse til at køre løb.
- Den **forudsiger ikke for den enkelte**. Ingen belastningsmodel har vist sig at forudsige skade, sygdom eller præstation for én rytter (Hellard m.fl. 2006 [abstract]; Impellizzeri m.fl. 2020 [abstract]; Marchal m.fl. 2025 [abstract]). AI'en må sige "din belastning er steget 30 % på en uge" og "det er mere, end du plejer", men ikke "du er i form til lørdag" eller "du bliver syg".
- Den **er ikke valideret**. Intet af det, modellen bygger på, er afprøvet på unge danske landevejsryttere, og ingen af de kommercielle adaptive systemer har et uafhængigt studie bag sig. Kadences egen vinter med et rigtigt hold er den eneste validering, der tæller (dogme syv).

## 2. Hvem den er for

Kadence har seks lag. DCU's anbefalinger fra 2025 er rammen for de tre ungdomsklasser (ADR 0014). Resten er Kadences egne profiler, forankret i kilder, men ikke et forbunds tal (ADR 0091). Masters er ikke en egen profil i dag; det er en Supermotionist, eventuelt med et flag for konkurrence (åbent spørgsmål til Martin).

| Lag                                           | Timeramme                                                                    | Hårde pas om ugen                                                         | Restitution                                                                                                 | Styrke                                                                                                                                                    | Sundhedsforbehold                                                                                                                     | Tone                                                                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **U17** (15–16 år)                            | DCU 2025: 429–490 t nov–sep; længste tur højst 4 t eller 120 km              | Højst 2 inkl. løb (Kadences skøn; DCU's eksempeluger har ét løb + ét pas) | Mindst én hviledag; 1–2 dage uden cykel om ugen (DCU); let uge hver 3.–4. uge i vinteren                    | 2–3 pas nov–medio mar, 1 i sæsonen, 48 t imellem (DCU); tung styrke efter tilvænning (DCU) eller teknik, hop og sprint til efter vækstspurten (NCF-vejen) | Modning styrer præstation og skadesrisiko; søvn 8–10 t; timer om ugen højst lig alder; menstruation som vitalt tegn; ingen ranglister | Til rytteren i du-form; procesmål; ingen prognoser; forældre ser trivsel og kalender, ikke watt              |
| **U19** (17–18 år)                            | DCU 2025: 554–622 t; længste tur højst 5 t eller 150 km                      | 2–3 inkl. løb                                                             | Som U17; nedtrapning 7–10 dage før et A-løb                                                                 | Som U17; DCU's progression 3 × 12 → 3 × 8 → 4 × 6 RM                                                                                                      | Søvn 8–10 t; overgangen U19 → U23 er den kritiske (Gallo m.fl. 2022 [abstract]); løbsdage vokser, ikke intensiteten                   | Som U17                                                                                                      |
| **U23** (19–22 år)                            | DCU 2025: 694–870 t; ingen grænse for længste tur                            | 2–3 inkl. løb; op til 3 mod sæsonens mål                                  | Nedtrapning 7–14 dage; 2–3 ugers forberedelsesblok midt i sæsonen er muligt; blokke er et trænerværktøj     | 2 pas i vinteren, 1 i sæsonen; 8 uger uden styrke giver målbart tab (Rønnestad m.fl. 2016 [abstract])                                                     | Holdbarhed kan vises (frisk og træt effektprofil); knogler (27 % lav knogletæthed før 20 år, Hilkens m.fl. 2023 [læst])               | Som voksen, men stadig uden sammenligning med andre                                                          |
| **Motionist** (voksen, ca. 5 t om ugen)       | Kadences skøn: ca. 280 t nov–sep; gulvet er WHO's 150–300 min om ugen        | 1                                                                         | 3–4 dage uden belastning; fra ca. 45 år mindst 48 t efter en lang tur eller tung styrke (Kadences skøn)     | 2 pas i vinteren, 1 i sæsonen; småhop i programmet                                                                                                        | Over 35 år, stillesiddende eller med risikofaktorer: tal med lægen før hård træning (ESC 2020 [læst, delvist])                        | En uge med én lang tur og ét kort hårdt pas er en god uge; "alt tæller"; aldrig "i din alder bør du"         |
| **Supermotionist** (voksen, ca. 10 t om ugen) | Kadences skøn: ca. 520 t; loftet er NCF's 700–1.100 t for de bedste seniorer | 2                                                                         | 1–3 dage uden belastning; fra ca. 50 år aldrig to hårde dage i træk, lang tur og tung styrke ikke samme dag | 2 pas i vinteren, 1 i sæsonen; fra ca. 50 år 2 pas hele året plus power                                                                                   | Som Motionist; hjerteflimren og forkalkning hos livslange mandlige atleter nævnes nøgternt, hvis der spørges                          | Som Motionist                                                                                                |
| **Masters og ældre** (konkurrence, 50+, 70+)  | Som Supermotionist, 8–12 t; alder er en svag variabel, målinger er stærke    | 2, ikke 3; løbsuge erstatter et hårdt pas                                 | Én hel hviledag om ugen (Friels 5+2, erfaring); afstand mellem de slidsomme belastninger vokser             | Styrke er ikke valgfri efter 50: tung og hurtig, 2–3 dage om ugen (Fragala m.fl. 2019 [abstract])                                                         | Ingen aldersrabat på intensitet: to hårde pas om ugen i fem år var sikkert for raske 70-årige (Stensvold m.fl. 2020 [abstract])       | Som Motionist; kvinder 45–60: søvn, udmattelse og led tolkes som restitutionsbehov, ikke som mangel på vilje |

Det, der ikke skifter mellem lagene: tærsklerne er individuelle, det meste af tiden er let, check-in'et vejer tungest, og AI'en afgør aldrig noget om et menneske.

## 3. De bærende principper

Hvert princip siger, hvad det hævder, hvor stærk evidensen er (stærk, moderat, svag, erfaring; se afsnit 8), og hvad det betyder i produktet.

### 3.1 Lav intensitet først, og let skal være let

Det mest robuste fund i hele feltet er, at eliten lægger 80–90 % af sin tid under første tærskel: 91 % hos norske guldvindere målt i tid, 77 % målt i pas (Tønnessen m.fl. 2014 [læst]). Lav intensitet er grundstoffet, fordi det kan akkumuleres i mængder, hårde pas ikke kan, med lav omkostning, og fordi det hænger sammen med holdbarhed og økonomi (Haugen m.fl. 2022 [læst]; Spragg m.fl. 2023 [abstract]). Det er en mængdebegrundelse. Forklaringen "zone 2 træner mitokondrierne bedst" er folklore: San-Millán & Brooks 2018 er et tværsnit uden træning, og Storoschuk m.fl. 2025 [abstract] afviser påstanden. Den anden halvdel af princippet er disciplinen: juniorer og U23-ryttere glider op i midten af sig selv. Leo m.fl. 2020 fandt 20/70/10 hos U23-professionelle og kaldte det "poor intensity zone discipline" [web]; hos tyske juniorer blev dem bedre, der kørte mest under 2 mmol/L, og dem dårligere, der kørte mest ved 3–6 (Guellich & Seiler 2010 [abstract]). Polariseret og pyramidal fordeling er uafgjort (Rosenblat m.fl. 2025 [abstract]); meget tærskeltræning klarer sig dårligst.

Evidens: stærk for observationen, moderat for virkningen (ingen RCT hos juniorlandevejsryttere), folklore for mitokondrie-historien.

I produktet: profilen "Lav intensitet først" (ADR 0053) med 75–80 % af pasene lave og højst 10 % mellem tærsklerne i november–februar, og flaget `mid_zone`. AI'en begrunder let træning med mængde og holdbarhed, aldrig med fedtforbrænding. Den siger "under første tærskel", "mellem tærsklerne" og "over anden tærskel", ikke "zone 2". Fordelingen vises både i tid og i pas, så begge skoler kan læse den.

### 3.2 To individuelle tærskler, ikke procent af maksimal puls

Fysiologerne er enige om to grænser og tre domæner. Første tærskel ligger et sted mellem 60 og 90 % af maksimal puls afhængigt af personen (Iannetta m.fl. 2020 [abstract]), så en fast "zone 2" på 74–83 % er for nogle over tærsklen og for andre langt under. Anden tærskel er ifølge Jones, Poole, Burnley og Vanhatalo kritisk effekt, som i snit ligger ca. 7 % over MLSS og langt fra 4 mmol/L (Jones m.fl. 2019 [læst]). FTP er en brugbar, men upræcis stedfortræder: 7 ± 13 W under kritisk effekt med grænser fra −19 til +33 W hos moderat trænede (Karsten m.fl. 2021 [læst]). Taletest og RPE holder overraskende godt: RPE 10–11 (Borg 6–20) ved første tærskel, 13–15 ved anden (Bok m.fl. 2022 [abstract]).

Evidens: stærk for de to grænser, moderat for kritisk effekt som anden grænse (omstridt mellem CP- og laktattraditionen), moderat for RPE som anker.

I produktet: hver rytter bør have to ankre i watt og puls med dato og kilde, og zonerne udledes af dem. Kadences syv zoner er i dag procent af tærskel (`src/modules/workouts/structure.ts`); det er en tilnærmelse, modellen vil væk fra. Når kun FTP findes, siger AI'en usikkerheden højt. Kritisk effekt fra et kort og et langt maksimalt forsøg foretrækkes, når det findes. RPE er det tredje anker for en U17-rytter uden wattmåler.

### 3.3 To til tre hårde pas om ugen, aldrig to i træk, og løb tæller

Verdensklassen kører ca. 2 hårde pas om ugen i grundperioden og ca. 3 op mod formtoppen (Tønnessen m.fl. 2014 [læst]); tolv norske verdensklassetrænere, heriblandt i landevej, anbefaler 2–3 hårde dage spredt over ugen og "aldrig to hårde dage i træk" (Sandbakk m.fl. 2025 [læst]). Forsøgene, der viser fremgang, bruger 2 hårde pas om ugen (Seiler m.fl. 2013 [abstract]; Rønnestad m.fl. 2015 [abstract]); tre VO2max-pas i stedet for ét gav ikke mere, kun mere stress (Billat m.fl. 1999 [abstract]). Et endagsløb for unge er 40 % af tiden over den respiratoriske kompensationstærskel (Rodríguez-Marroyo m.fl. 2011 [abstract]) og tæller som en hård dag. For U17 er loftet på 2 hårde dage inklusive løb Kadences egen syntese af trænerpraksis, de to nulfund hos juniorer og IOC's advarsel; det er ikke et tal fra en kilde.

Evidens: moderat (konsistent praksis plus små forsøg på voksne; intet på juniorer).

I produktet: en vagt i ethvert ugeudkast. Over 3 hårde pas kræver trænerens aktive valg og får en begrundelse med. Hviledag eller meget let dag mindst hver 7.–9. dag (Walther m.fl. 2025 [læst]). Standardpasset for voksne er 4 × 8 min ved ca. 90 % af maksimal puls (Seiler m.fl. 2013); 30/15 er et alternativ for voksne, testet på n = 7–9 pr. gruppe og aldrig på juniorer. Hvert pas i biblioteket bærer sit evidensniveau og den population, det er testet på.

### 3.4 Mængden vokser langsomt, og årene bygger rytteren

Verdensklasseløbere i langrend øgede mængden 35 % fra bedste juniorsæson til bedste seniorsæson, næsten udelukkende ved lav og moderat intensitet; den høje intensitet var uændret (Walther m.fl. 2023 [læst, web]). Langrendsløbere steg ca. 55 t om året fra 16 til 22 år (Karlsson m.fl. 2021 [abstract]); Olympiatoppen siger +50 t om året [læst]. I cykling havde de, der nåede WorldTour, flere løbstimer som 18-årige, ikke mere træning (Svendsen m.fl. 2018 [abstract]). Prædiktorerne for junior- og seniorsucces er modsatte: voksne verdensklasseatleter startede senere, trænede mindre i hovedsporten som børn og kom senere ind i talentprogrammer (Barth m.fl. 2022 [abstract]; Güllich & Barth 2024 [læst, web]). DCU siger det samme med andre ord: for U17 er det vigtigste ikke at træne for meget, og 10–15 % mere om året er naturligt for U19 (DCU_U19_kompendium_2016 p. 12).

Evidens: moderat (beskrivende for dem, der nåede toppen; ikke testet som intervention).

I produktet: DCU's timer er rammen, med en korridor på ±20 % som Kadences læsning af "hverken meget mere eller meget mindre" (ADR 0015). Rampe-vagten markerer en uge mere end 15 % over gennemsnittet af de foregående. Når AI'en foreslår en sæsonplan fra år til år, holder den stigningen jævn og siger det højt: det, der adskiller dem, der blev rigtig gode, er flere rolige timer over mange år, ikke flere hårde pas som 16-årig. Anden sport om vinteren er ikke spildtid. Juniorranglister præsenteres aldrig som prognoser.

### 3.5 Sæsonen ligger fast, ugen tegnes om

Ingen af de store periodiseringsmodeller er efterprøvet i den form, de fremsættes i (Afonso m.fl. 2019 [læst]; Kiely 2018 [læst]). Blokperiodisering har den bedste evidens, og den er lille og svag: VO2max SMD 0,40 over seks poolede studier med gennemsnitlig PEDro 3,7/10 (Mølmen m.fl. 2019 [abstract]); det største cykelstudie fandt ingen forskel, og hos juniorer gav blokke ingen fordel og dårligere humør (McGawley m.fl. 2017; Walther m.fl. 2026 [abstract]). Omvendt og undulerende periodisering har ingen påvist fordel i udholdenhed. Det, verdensklassen deler, er ugens rytme, ikke årsmodellen; de norske trænere kører traditionel periodisering med blokke brugt "langt mere dynamisk end i teorien" (Sandbakk m.fl. 2025 [læst]). Kiely har ret i det centrale, at samme belastning giver forskellig tilpasning i forskellige mennesker og på forskellige dage, og hans svar er ikke at afskaffe planen, men et skelet med start, kontrolpunkter og mål, justeret ud fra løbende information. Det eneste rækkefølgeprincip med støtte i både forsøg og praksis er, at specificiteten stiger mod målet (Filipas m.fl. 2022 [abstract]; Tønnessen m.fl. 2014).

Evidens: moderat for skelettet og ugens rytme, svag for enhver bestemt årsmodel.

I produktet: DCU's faser (pause → mængde → lange intervaller → korte intervaller → sæson, `src/modules/dcu/phases.ts`) og løbene ligger fast, og alt planlægges baglæns fra A-løb og lejre. AI'en laver udkast til den nærmeste uge, højst to, og laver næste uge igen ud fra det, der blev kørt. Den lette uge er standard hver 4. uge i vinteren, udløses af data og udgår i sæsonen. Blokke med fem hårde pas findes som trænerværktøj til U23 og voksne (ADR 0025), aldrig som standard for U17 og U19, og aldrig som planlagt overbelastning lige før en nedtrapning (Aubry m.fl. 2014 [abstract]: 70 % infektioner mod 20 %).

### 3.6 Spring i belastning er risikoen, ikke et forhold

Det akut:kroniske forhold med et "sweet spot" på 0,8–1,3 blev taget op af IOC i 2016 og pillet fra hinanden fra 2017 til 2025: matematisk kobling, vilkårlige vinduer, ingen årsagsmodel, og når den kroniske belastning blev erstattet med tilfældige tal, kom de samme sammenhænge ud (Lolli m.fl. 2019 [abstract]; Impellizzeri m.fl. 2020 [abstract]; Wang m.fl. 2020–2025 [abstract]). Alle data er fra holdsport. Det, der står tilbage, er den gamle lære: pludselige spring efter lav belastning følges af flere skader og sygdomme, og en høj, jævnt opbygget belastning beskytter (Gabbett 2016 [læst]; Jones m.fl. 2017 [abstract]). Gabbetts egen grænse er under 10 % om ugen; IOC's sygdomskonsensus siger det samme (Schwellnus m.fl. 2016 [læst, delvist]). Friels rampegrænse på 5–8 point om ugen er én træners erfaring uden data (Friel 2015 [læst]). Fosters monotoni og strain hænger sammen med sygdom ved individuelle tærskler (Foster 1998 [abstract]); grænserne 1,5 og 2,0, der går rundt på nettet, kan ikke føres tilbage til kilden.

Evidens: moderat for "spring er farlige", svag for enhver bestemt procent, afvist for forholdet som tal.

I produktet: rampe-vagten på 15 % og mindst en time beholdes, mærket som DCU's tolkning og ikke som en skadegrænse. Intet akut:kronisk forhold vises; hvis forholdet mellem den korte og den lange komponent vises, er det som friskhed, ikke som risiko. Monotoni og strain kan tilføjes som stille tjek relativt til rytterens egne uger.

### 3.7 Rytterens egne ord vejer tungest

Spørgeskemaer slår de almindelige objektive mål, når det gælder at mærke, at belastningen er ændret: subjektive mål var mere følsomme og konsistente i 22 af 54 studier, og objektive mål reagerede generelt ikke på akutte ændringer (Saw m.fl. 2016 [læst]). Korte skalaer med 4–8 spørgsmål, samme tid hver dag, tolket mod rytterens egen baseline, er det, konsensus og praksis peger på (Hooper m.fl. 1995 [abstract]; Kölling m.fl. 2019 [læst]; Kellmann m.fl. 2018 [læst]). Voksnes skemaer passer ikke uden videre til 10–16-årige. Fosters session-RPE er det billigste mål med mest evidens og det eneste, der bærer på tværs af alle pastyper (Haddad m.fl. 2017 [læst]). HRV og hvilepuls giver kun mening som 3–7-dages gennemsnit mod egen baseline (Plews m.fl. 2013 [abstract]; Buchheit 2014 [læst]); sammensatte readiness-scorer fra ure og ringe er uden offentliggjort formel og i det væsentlige uvaliderede (Doherty m.fl. 2025 [abstract]).

Evidens: stærk (systematisk review, 56 studier, og metodisk konsensus).

I produktet: check-in'ets otte felter er inden for det, evidensen støtter, og flere spørgsmål dagligt er ikke bedre. Når check-in og belastning peger hver sin vej, har check-in'et forrang. Lav energi i en uge med lav belastning afvises aldrig med "belastningen er jo lav" (Matos m.fl. 2011 [abstract]: belastning forklarede ikke de 29 % af unge, der havde været overreached). Wearable-tal vises rå og aldrig som input til en automatisk ændring. Rytteren ser altid det samme som træneren.

### 3.8 Søvn, sygdom og smerte ændrer planen før alt andet

Unge 14–17 år anbefales 8–10 timers søvn, voksne 7–9 (Sundhedsstyrelsen 2024 [søgning]; Paruthi m.fl. 2016 [abstract]; Walsh m.fl. 2021 [læst]). Unge atleter, der sover under 8 timer, har omkring 1,6–1,7 gange højere odds for skade (Milewski m.fl. 2014 [abstract]; Gao m.fl. 2019 [abstract]), og det farligste mønster i svensk eliteungdom var mere træning, højere intensitet og mindre søvn på én gang (von Rosen m.fl. 2017 [abstract], HR 2,25). Sammenhængen er associativ. Sygdom: hvil ved feber og symptomer, og præstationen kan være nedsat 2–4 dage efter raskmelding (Schwellnus m.fl. 2016); "halstjekket" er to små studier af stillesiddende og gengives ikke som råd. Smerte: ATK's trappe (−20–30 %, −50 % og ingen løb, pause) og IOC's regel om, at ingen ung træner med smerter (Bergeron m.fl. 2015 [læst]). Hjernerystelse: stop, læge, trinvis tilbagevenden, og ingen løb før tidligst 14 dage efter symptomfrihed for juniorer (UCI 2021 [læst]).

Evidens: moderat for søvn (konsensus og observation), erfaring for sygdomsreglerne, konsensus for smerte og hjernerystelse.

I produktet: "syg" er rød og bliver ved med at være det; efter sygdom foreslås lige så mange lette dage som sygedage, ingen intervaller og ingen formvurdering de første fire dage (Kadences eget forslag). Søvnvagten på 8 t for 14–17-årige og 7 t som gul grænse står i `guardrails.ts`. Smertestigen og de kendte smerter (ADR 0097) stopper forslag om belastning. Tre ord i en fritekst, brystsmerter, hjertebanken og åndenød, udløser altid "det skal en læge se på" og intet pas.

### 3.9 Tung styrke om vinteren, vedligehold i sæsonen, og hop hele året

Tung styrke, 4–10 RM, 2–3 sæt, to pas om ugen i mindst 8–12 uger, gør veltrænede ryttere bedre: en moderat effekt på præstation (g = 0,46) uden effekt på VO2max, med lav sikkerhed (Llanos-Lagos m.fl. 2025 [læst]). Gevinsten viser sig sent i lange ture og i spurten efter dem (Rønnestad m.fl. 2011 [abstract]), hos U23-landsholdsryttere som +8 % på 45 min (Aagaard m.fl. 2011 [abstract]). Ét tungt pas om ugen holder gevinsten i sæsonen; hver 14. dag gør ikke, og 8 uger uden fjerner det meste (Rønnestad m.fl. 2010b, 2016 [abstract]). Interferensen er lille hos ryttere og rammer eksplosiv styrke mest, især i samme pas; styrke først på dagen og mindst 3 timer før cyklingen (Schumann m.fl. 2022 [abstract]). Knoglerne er cykelsportens svage punkt: 27 % af mandlige eliteryttere under 20 år og 45 % af kvinderne har lav knogletæthed i lænden, og tung styrke alene er ikke nok (Hilkens m.fl. 2023 [læst]; Klomsten Andersen m.fl. 2018 [abstract]); fem gange fem minutters hop om ugen bevarede lårbenshalsen i ét åbent forsøg (Hilkens m.fl. 2024 [abstract]). Styrketræning forebygger skader (RR 0,32), udstrækning gør ikke (RR 0,96) (Lauersen m.fl. 2014 [abstract]). Hos masters tabes power hurtigst, og høj hastighed i løftet giver tre gange så stor gevinst som traditionel styrke (Straight m.fl. 2016 [abstract]).

Evidens: moderat for tung styrke (lav sikkerhed i metaanalysen), svag for hop (ét forsøg), stærk for styrke mod skader, folklore for udstrækning.

I produktet: DCU's ramme (2–3 pas november–medio marts, 1 pas i sæsonen, 48 timer imellem, mindst 30 pas pr. vinter) stemmer med evidensen og står i `src/modules/dcu/strength-frequency.ts`. Det, der mangler: hop som fast lille pas for alle klasser, power-sæt for masters, en advarsel ved mere end 10 dage uden styrke i sæsonen, og RIR 1–2 i stedet for "altid til udmattelse" (Olympiatoppen [læst]; Robinson m.fl. 2024 [abstract]). Udstrækning fjernes fra alt, der hedder skadesforebyggelse.

### 3.10 Tilpasning er en bremse, ikke en speeder

Den bedst undersøgte form for daglig algoritmestyring er HRV-styret træning, og to metaanalyser fra 2021 når samme sted hen: små, ikke-signifikante fordele på præstation og VO2max, en moderat fordel på submaksimale mål, og færre non-respondere, mest fordi hårde pas fjernes på dårlige dage (Düking m.fl. 2021 [abstract]; Manresa-Rocamora m.fl. 2021 [læst]). Alt er målt på voksne. Sprogmodeller svarer korrekt på det, de svarer på, men progredierer for hurtigt og bruger ikke kontekst (Düking m.fl. 2024 [læst]; Zaleski m.fl. 2024 [læst, via UConn]), netop de fejl en ungdomstræner ikke må lave. De systemer, der tydeligst holder mennesket i loopet, foreslår ét lille skift, viser hvorfor i én sætning, og lader mennesket sige ja, nej eller rette (TrainerRoad, JOIN [læst]).

Evidens: moderat (to metaanalyser, voksne).

I produktet: Kadences tilpasning kan nedjustere, flytte eller aflyse ét pas ud fra check-in og de seneste ture, og aldrig optrappe af sig selv. Den bytter hvilket pas, ikke passets indhold, så træneren kan genkende, hvad der skete. Grænserne, klassens timetal, rampen, hviledage, ligger i kode uden om sprogmodellen. Ingen plan skrives færdig af modellen uden gennemlæsning.

### 3.11 Kronologisk alder er en svag variabel

Hos de unge er modning den vigtigste enkeltfaktor i alderen 12–16: vækstspurten ligger i snit ved 13,5 år hos drenge og 11,5 hos piger med flere års spredning, skadesrisikoen er målbart højere omkring den (Ayoub m.fl. 2025 [læst, web]), og peak VO2 stiger ca. 70 % hos drenge fra 12 til 17 år drevet af modning (Bergeron m.fl. 2015 [læst]). Biologisk alder kan skønnes uden røntgen, men kun som kategori (Mirwald m.fl. 2002 [abstract]; Cumming m.fl. 2017 [læst]). "Vinduer for trænbarhed" er folklore (Ford m.fl. 2011 [læst]; Van Hooren & De Ste Croix 2020 [læst]). Den relative alderseffekt findes i cykling frem til U23 og forsvinder blandt professionelle (Voet m.fl. 2022 [abstract]). Hos de voksne forklarer alder lidt, når aktivitet holdes fast: hos meget aktive cykelryttere på 55–79 år viste musklen næsten ingen aldersændringer (Pollock m.fl. 2018 [abstract]), og responsen på hård træning var ens fra 20 til 70+ år (Støren m.fl. 2017 [abstract]). Det, der falder uundgåeligt, er maksimal puls (208 − 0,7 × alder, med ± 10 slag; Tanaka m.fl. 2001; Nes m.fl. 2013 [abstract]). Restitutionen efter lange, slidsomme belastninger ser ud til at være langsommere fra midten af 40'erne; efter korte, hårde intervaller er evidensen for en forskel svag.

Evidens: moderat (konsistent observation; ingen cykelspecifikke valideringsstudier).

I produktet: for 13–17-årige bør profilen kunne rumme højde månedligt og vise kategorien før, i eller efter vækstspurten, aldrig et decimaltal. I spurten foreslår AI'en mindre løbsmængde og mindre stigning. Fremgang i watt hos en 15-årig dreng tilskrives ikke træningen alene. For voksne styrer mål, timer og signaler, ikke fødselsår; fødselsår bruges kun til pulszoner uden måling, til stigningstakt efter pause og til helbredsforbehold. Ingen "60+-plan".

### 3.12 Autonomistøtte, procesmål og indsats frem for evne

Unge bliver ved med at træne, trives og præsterer bedre, når træneren støtter deres selvbestemmelse, forklarer hvorfor, giver valg inden for rammer og lægger vægt på mestring frem for placering (Mageau & Vallerand 2003 [læst]; Ntoumanis m.fl. 2021 [læst], g omkring 0,3–0,6 på motivation). Den stærkeste evidens er for det, man undgår: kontrol, skyld, belønning som styring og sammenligning med andre; et ego-klima og kontrollerende trænere hænger sammen med udbrændthed (Isoard-Gautheur m.fl. 2013 [abstract]; Gustafsson m.fl. 2017 [læst]). Procesmål slår resultatmål klart (d = 1,36 mod 0,09; Williamson m.fl. 2024 [søgning], skal efterprøves). Ros af indsats frem for evne har klassisk eksperimentel støtte (Mueller & Dweck 1998 [søgning]); growth mindset-interventioner har effekter omkring d = 0,05–0,08 (Sisk m.fl. 2018 [læst]), så Team Danmarks "6–9 uger" gengives ikke. Hyppig, detaljeret feedback hjælper her og nu og hæmmer læringen på sigt (guidance-hypotesen, Salmoni m.fl. 1984 [ikke verificeret]). Refleksion kendetegner dem, der når langt (Toering m.fl. 2009 [søgning]).

Evidens: moderat for autonomistøtte og klima, moderat for procesmål, svag for mindset-interventioner.

I produktet: Olympiatoppens "utøverens eget prosjekt" [læst] er grundstillingen. AI'en skriver til rytteren, ikke om rytteren; den giver altid et valg og et hvorfor; den bruger ikke "skal", "bør", "talent" eller "optimér"; den sammenligner kun med rytterens egen historik. Se afsnit 5.

## 4. Sådan planlægger AI'en

Planlægningen går fra sæson over blok og uge til pas. Jo længere horisont, jo mere ligger fast; jo kortere, jo mere laves om.

### 4.1 Hvad der ligger fast (skelettet, i kode)

- **Sæsonens faser og timer.** DCU's rækkefølge og 2025-timer for klassen og året i den (`src/modules/dcu/hours.ts`, `phases.ts`), med korridoren på ±20 %. Oktober er pause og frit, planlagt som 0. For voksne Kadences profiler. Alternativer er blokke og trænerens egne mål (ADR 0040), ikke andre "modeller"; omvendt og undulerende periodisering tilbydes ikke, og den norske dobbelttærskelmodel heller ikke (kun observationer af løbere, intet kontrolleret; Casado m.fl. 2023 [læst]).
- **Løbene, etapeløbene og lejrene** er faste punkter, som alt planlægges baglæns fra. Et løb er altid en hård dag: et endagsløb for unge tæller som en dag over anden tærskel, en etape som en dag mellem tærsklerne, og et etapeløb på 2–3 dage som en blok med mindst to lette dage efter og en let uge, når det var tre løbsdage. Løbsdagen holder løbet som sit ene pas, dagen før holder opladningen (ADR 0101, 0103, 0106).
- **Ugens rytme.** Højst 2 hårde dage inkl. løb for U17, 2–3 for U19 og U23, 1–3 for voksne efter profil; aldrig to hårde dage i træk uden for etapeløb; en hård dag er intensitet gange varighed, så en lang tur med stigninger mellem tærsklerne tæller med; mindst én hviledag eller meget let dag hver 7.–9. dag; i vinteren (november–marts) en let uge hver 3.–4. uge med 25–35 % mindre mængde og 1–2 færre pas, i sæsonen ingen fast rytme. Den lette uge er praksis uden kontrolleret evidens og mærkes sådan.
- **Nedtrapning før A-løb.** 7–10 dage for unge, 10–14 for voksne; samme antal pas, kortere ture, 1–2 korte hårde pas, det sidste gerne to døgn før (Tønnessen m.fl. 2014; Sandbakk m.fl. 2025; Bosquet m.fl. 2007 [abstract] som øvre grænse). Aldrig en planlagt overbelastningsblok umiddelbart før.
- **Styrkens plads.** Først på dagen, mindst 3 timer før cyklingen, aldrig i samme pas som intervaller, aldrig dagen før et løb, mindst 48 timer mellem to styrkepas; hop ligger frisk.
- **Sundhedens stop.** Syg, smerte 3, hjernerystelse, myokarditis og de tre lægeord stopper forslag om belastning, uanset hvad resten siger.
- **Ingen blok, ingen højde, ingen overreaching for U17 og U19.** Blokke og lejre er trænerværktøjer til U23 og voksne; en lejr planlægges som en mængdeblok med lav intensitet og en let uge efter, og form kommer efter lejren, ikke under den (Valenzuela m.fl. 2023 [abstract]: kritisk effekt faldt under lejren).

### 4.2 Hvad der er dynamisk (indholdet, AI'ens udkast)

- **Horisonten er den nærmeste uge, højst to.** Sæsonen udkastes kun som faser, timer pr. måned og løb.
- **Hver uge laves næste uge igen** ud fra fire ting: Udført mod Planlagt (ADR 0040), check-in (søvn, humør, sygdom, smerte, energi), monotoni og strain, og trænerens ord. Det er Kielys skelet med kontrolpunkter i praksis.
- **Specificiteten stiger mod målet.** Lange intervaller mellem tærsklerne om vinteren, kortere og løbsspecifikke pas de sidste 3–6 uger før A-løb, og tilbage igen efter. Rækkefølgen kan vendes af træneren uden tab (Sylta m.fl. 2016 [abstract]).
- **Polariseret eller pyramidal er trænerens valg for holdet.** AI'en foreslår den valgte form og nævner den anden som lige gyldig. Den præsenterer aldrig én fordeling som den rigtige.
- **For U19 og U23 kan sæsonen rumme en forberedelsesblok** på 2–3 uger i juni–juli med mere mængde og færre løb, som de norske landevejstrænere gør.

### 4.3 Hvad der udløser en ændring

| Signal                                                                                  | Det, AI'en gør                                                                                                                   |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Check-in falder (gul zone, lavt humør, lav energi, tre af syv dage under egen baseline) | Starter teksten dér, foreslår at flytte eller lette ugens hårde pas, og foreslår en samtale inden for 14 dage ved gul zone       |
| Syg                                                                                     | Ingen træning, heller ikke let; bagefter lige så mange lette dage som sygedage, ingen intervaller eller løb, ingen formvurdering |
| Smerte 2 eller 3, kendt smerte i tre uger                                               | ATK's trappe; ved 3 pause til en behandler har set rytteren; ingen styrke ved knæ-, ryg- eller hoftesmerter                      |
| Hjernerystelse                                                                          | Ingen belastning; DCFH's seks trin med pulsgrænser; løbsdage lukkede til lægen og UCI's frist er overholdt                       |
| Kort søvn (ugegennemsnit under 8 t ung, 7 t voksen) samtidig med stigende belastning    | Holder ugen flad eller flytter den hårde dag; dagen efter en nat under 6 t byttes intervaller til rolig kørsel                   |
| Missede pas (to eller flere røde, halvdelen af de bedømte)                              | Ingen indhentning; næste uge lægges ud fra det, der blev kørt, ikke det, der stod                                                |
| Monotoni eller strain høj mod rytterens egne uger                                       | Rykker den lette uge frem og siger hvorfor                                                                                       |
| Afkobling: højere puls eller RPE ved samme watt på tre ture i træk                      | Nævner det for rytter og træner som et tegn, ikke en dom, og foreslår en samtale; siger ikke hvorfor                             |
| Etapeløb, lejr, rejse over fire tidszoner                                               | Lette dage efter, let uge efter tre løbsdage, og en note om højere sygdomsrisiko i dagene efter                                  |
| Vækstspurt (kategori "i spurten" eller hurtig højdevækst)                               | Mindre løbsmængde og mindre stigning, mere teknik og neuromuskulær opvarmning; råd, ikke forbud                                  |
| Varm dag og nyligt syg                                                                  | Kun let kørsel; nylig infektion er en kendt risikofaktor for hedeslag (Racinais m.fl. 2015 [læst, delvist])                      |
| Frost, is, koldt regnvejr                                                               | Rulle som alternativ, uden at sige noget om helbredet                                                                            |

### 4.4 Størrelsen af en ændring

Én ændring ad gangen, én begrundelse, og en "ændring afventer"-tilstand, træneren accepterer, afviser eller retter. En ændring er et andet pas fra biblioteket eller en lettere variant, aldrig en omskrivning af hele ugen og aldrig af sæsonen på én dårlig uge. "Persistent change drives positive adaptation, but sudden change elevates injury risk" (Kiely 2018 [læst]). Ved sygdom og smerte følges ATK's trappe, ikke en ny plan. AI'en optrapper aldrig af sig selv; mere kræver, at en træner beder om det.

## 5. Sådan giver AI'en feedback og coacher

Alt, AI'en skriver, er et udkast til en samtale mellem rytter og træner, ikke en besked fra en autoritet. Skrivereglerne er distilleret fra coaching-notatet og gælder for prompter og UI-tekster.

### 5.1 Mageau & Vallerands syv adfærd i Kadences ord

1. **Giv så mange valg som muligt inden for rammen.** Et forslag har mindst to veje og siger, hvad planen forventer. Struktur er ikke kontrol, når den er forklaret.
2. **Begrund opgaver, grænser og regler.** Hvert forslag bærer sit hvorfor i én sætning. Ingen begrundelse, intet forslag.
3. **Spørg til og anerkend følelsen.** Når check-in viser træthed eller modvilje, starter teksten dér, ikke med tallet.
4. **Giv plads til initiativ.** Mål starter som procesmål, rytteren selv styrer; resultatmål tilføjer rytter og træner selv.
5. **Giv kompetencefeedback uden kontrol.** Ros det, der blev gjort, aldrig evnen. Ikke "du er stærk", men "du holdt wattene i alle fire drag". Sig ikke "talent".
6. **Undgå åben kontrol, skyld, kontrollerende udsagn og belønninger.** Ikke "skal", "bør", "husk nu", ingen streaks, ingen "du sprang over".
7. **Forebyg ego-involvering.** Fremgang måles mod rytterens egen historik, aldrig mod holdkammerater, heller ikke anonymt. Ingen ranglister for U17 og U19.

### 5.2 Lidt, sent og med ét spørgsmål

- **Ikke efter hver tur.** En ugentlig opsummering er standard; en kommentar på et enkelt pas kun når rytteren beder om det, eller noget afviger markant fra planen. Det er guidance-hypotesen og det er en knap, ikke en strøm.
- **Først det, der gik som planlagt, så én ting at tage med videre.** Tal om effekten ("de sidste drag faldt ikke"), ikke om kroppen ("du spændte op").
- **Slut med et spørgsmål, ikke en dom.** Kadences fire spørgsmål er formatet: hvordan har du det, hvad var målet, hvordan gik det, hvad er næste skridt. Svarene er rytterens, og rytteren vælger, om træneren ser dem.
- **Modeller kaldes modeller.** Formkurven forklares med Coggans egne forbehold: en indikator for friskhed, ikke et mål for præstation, "tallene tyder på" frem for "du er". Rytteren spørges, om det passer med kroppen.
- **De store ting før de små.** Søvn, mad, mængde og at have det godt kommer før intervaltyper og "optimering". Intet marginal gains-sprog til en 16-årig.

### 5.3 Til rytter, træner og forælder

- **Til rytteren**, i du-form, korte sætninger, uden udråbstegn og uden at bebrejde. Modning og relativ alder forklares som noget normalt og midlertidigt. Ingen prognoser.
- **Til træneren** får den samme tekst som rytteren, aldrig en skjult vurdering. Få tilstande med én sætning hver ("ugen er mere ensformig end de sidste fire") frem for tal at sammenligne på. Begrundelser henviser til modenhed, timer mod alder, søvn og smerte, aldrig til "vinduer" eller "talent". Ved udtagelse vises fødselskvartal og modenhed ved siden af tallene.
- **Til forældre** det, der lader dem støtte uden at coache (Knight & Holt 2014 [læst]): trivselstrend, kalender og balance mellem belastning og hvile, aldrig watt, placeringer eller trænerens noter, og kun det, rytteren har valgt at dele. Samtaleforslag er spørgsmål, vist én gang pr. sæson som en aftale ("vil du tale om det, eller vente?"), ikke efter hvert løb (Tamminen 2017 [læst, via UofT]).

### 5.4 Fire eksempler i Kadences tone

Til rytteren efter en let dag, der ikke var let:

> Turen lå 40 % mellem tærsklerne. Planen var under første tærskel. Det er helt almindeligt på en god dag. Du kan holde næste tur roligere eller lade den stå, som den er.

Til rytteren i et ugeudkast:

> Dine nætter har været korte, og ugen er hårdere end de sidste. Jeg har flyttet intervallerne til torsdag og gjort onsdag rolig. Du kan flytte dem tilbage.

Til rytteren efter et hårdt pas:

> Du holdt wattene i alle fire drag, og det sidste faldt kun lidt. Hvad var dit mål i dag, og hvordan gik det?

Til træneren, når data og check-in peger hver sin vej:

> Puls og oplevet anstrengelse har ligget højere end wattene tilsiger på de sidste tre ture, og humøret i check-in er faldet. Det er værd at tale med rytteren om i denne uge. Jeg ved ikke hvorfor.

## 6. Hvad modellen ikke gør

- Intet akut:kronisk forhold med zoner (0,8–1,3; 1,5) som skaderisiko; afvist af Impellizzeri, Lolli og Wang, og lånt fra holdsport.
- Ingen sammensat readiness-, recovery- eller talentscore; ingen formel offentliggjort hos nogen producent, og et tal, hele holdet kan se, bliver en rangliste.
- Ingen Banister-forudsigelse af præstation for den enkelte; fatigue-parametrene er ikke identificerbare, og unge har ikke de 20+ præstationsmarkører, en tilpasning kræver.
- Ingen fast rampegrænse i "point om ugen" fra holdsport eller én træners erfaring; rytterens egen historik og klassens timetal er grænsen.
- Ingen cyklusbaseret periodisering; effekten af cyklusfase på præstation er triviel og evidensen lav (McNulty m.fl. 2020 [abstract]), mens symptomerne er reelle og rytterens egne at handle på.
- Ingen kropsvægt som tal, ingen kalorier, ingen biologisk alder med decimaler.
- Ingen diagnose, intet præparat, ingen dosis, ingen raskmelding, ingen tilladelse til at køre løb, og aldrig "det er nok ufarligt".
- Ingen kliniske skemaer (PHQ-9, GAD-7, SMHAT) i check-in'et; de er til fagfolk.
- Ingen "vinduer for trænbarhed" som begrundelse, ingen juniorrangliste som prognose, ingen automatisk sammenligning mellem ryttere i U17 og U19.
- Ingen zone 2-mytologi: ingen mitokondrie- eller fedtforbrændingsargumenter for let træning.
- Ingen udstrækning som skadesforebyggelse, intet koldt vand efter styrke, ingen løfter om bikefit.
- Ingen norsk dobbelttærskelmodel som paradigme, ingen omvendt eller undulerende periodisering, ingen blokke eller planlagt overreaching for U17 og U19, ingen højde for unge.
- Ingen automatisk tærskeldetektion, der skriver sig selv ind; et forslag med accept og afvis, mærket som estimat.
- Ingen af TrainingPeaks' varemærker. Kadences ord er kondition, træthed og friskhed, og når Coggans model omtales, hedder den Coggans model.
- Ingen plan skrevet færdig af en sprogmodel uden gennemlæsning, og ingen grænser i prompten alene.
- Ingen påstand om, at modellen er valideret, før en vinter med et rigtigt hold er kørt.

## 7. Hvor den står i forhold til skolerne

| Skole                                                                     | Hvad den siger                                                                                                                             | Kadence tager                                                                                                                                | Kadence lader ligge                                                                                              |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Seiler, polariseret** (Agder)                                           | Ca. 80 % af pasene lette, ca. 20 % hårde, tre zoner, tælling i pas, 4 × 8 min                                                              | Tre-zone-sproget, tælling i pas ved siden af tid, 2–3 hårde pas, 4 × 8 som standardpas for voksne, "hard days hard, easy days easy"          | At polariseret er optimalt; metaanalyserne giver uafgjort mod pyramidal                                          |
| **Pyramidal og Olympiatoppen** (Tønnessen, Sandbakk, Haugen)              | Fem-zone-skalaen mappet til tre domæner, traditionel periodisering, 2–3 nøgledage, let uge hver 3.–4., "results-proven practice"           | Ugens rytme, den lette uge i forberedelsen, nedtrapning mindre end forskningen, Olympiatoppens udviklingsfilosofi og mindste effektive dosis | Faste procenter af maksimal puls som zonegrænser; 10–14 pas om ugen                                              |
| **Den norske dobbelttærskel** (Bakken, Ingebrigtsen, Casado)              | 2–4 laktatstyrede tærskelpas om ugen, ofte to samme dag, under ca. 3 mmol/L, i en meget stor mængde                                        | Intensitetsdisciplinen (tærskelpas under anden tærskel) og "to korte moderate pas samme dag" som passtruktur (Talsnes m.fl. 2024 [abstract]) | Modellen selv: kun observationer af løbere, ingen kontrollerede studier, intet om cykling, laktatmåler på børn   |
| **Lydiard, Daniels, Canova** (løb)                                        | Stor aerob base, derefter specifik hård træning i doser, specificitet mod målet, dosering i procent af ugens km                            | Basen, specificitet der stiger mod målet, og Daniels' lofter som dosering for voksne                                                         | De præcise doser (160 km, VDOT, T/I/R-procenter); lore med stærke resultater, ikke evidens; Canovas dopingskygge |
| **Coggan og Allen, effektbaseret**                                        | FTP, zoner i procent af FTP, belastning som intensitet i anden gange tid, kondition og træthed som glidende gennemsnit (42/7)              | Watt som ekstern belastning, formkurven som visning med egne navne og Coggans egne forbehold                                                 | Deres varemærker, FTP som eneste anker (CP er bedre begrundet), modellen som forudsigelse                        |
| **Friel** (Training Bible, TrainingPeaks)                                 | Bompas periodisering (base, build, peak), "limiters", 5+2-ugen for masters, rampe 5–8 point om ugen                                        | 5+2 som erfaring for masters, "too much hard training gets in the way regardless of age"                                                     | Rampetallet og alt andet som evidens; Friel linkes, gengives ikke                                                |
| **Issurin, blokperiodisering** (Verkhoshansky, Rønnestad)                 | Koncentrerede blokke med ét mål ad gangen, 5 hårde pas på en uge, derefter let                                                             | Blokke som trænerværktøj til U23 og voksne med obligatorisk let uge efter                                                                    | Blok som standard; lille evidens af lav kvalitet, intet hos juniorer, og dårligere humør                         |
| **Kiely, agil planlægning** (og Jovanović)                                | Periodiseringen hviler på en forældet stressmodel; samme belastning giver forskellig tilpasning; skelet med kontrolpunkter og monitorering | Skelet plus ugentligt udkast, psykoemotionel tilstand som planvariabel, "sudden change elevates injury risk"                                 | "Komplekse systemer"-sproget som planmetode; det er en begrundelse for monitorering, ikke en plan                |
| **Côté, DMSP, og ATK 2.0** (Team Danmark)                                 | Prøveår, specialiseringsår, investeringsår; sen specialisering er ingen hindring; leg; smertetrappe; 8–9 timers søvn                       | Hele rammen: anden sport om vinteren tæller, ingen ranglister under 15, smertetrappen, Talenthuset                                           | Intet; ATK er i sit fundament en Côté-model med Malina-fysiologi og IOC-konsensus, og citerer selv Ford 2011     |
| **Balyi, LTAD** (Sport for Life, Cycling Canada, KNWU)                    | Faser med "vinduer for trænbarhed", træning og konkurrence efter alderstrin                                                                | Faseordene, hvor de er praktiske; Canadas løbsantal som link                                                                                 | Vinduerne (folklore), faste doser efter kronologisk alder, pyramiden med tidlig udvælgelse                       |
| **SDT-coaching** (Deci og Ryan, Mageau og Vallerand, Duda, Olympiatoppen) | Autonomi, kompetence og tilhør; syv autonomistøttende adfærd; mestringsklima; "utøverens eget prosjekt"                                    | Skrivereglerne i afsnit 5, procesmål, ros af det gjorte, ingen sammenligning                                                                 | Løfter om ændret mindset på 6–9 uger; effekterne er små; "skab tilhørsforhold", som en AI ikke kan               |
| **Rønnestad og Mujika, styrke**                                           | Tung styrke 4–10 RM med maksimal koncentrisk hastighed, 2 pas i 12 uger, 1 i sæsonen; ikke eksplosiv træning                               | Hele skabelonen, som også er DCU's; vedligehold og tabet ved pause                                                                           | "Altid til udmattelse"; RIR 1–2 og hastighedstab 10–20 % peger den anden vej                                     |
| **HRV-styret træning** (Kiviniemi, Plews, Buchheit, Javaloyes)            | Dagens intensitet styres af morgenens HRV mod egen baseline                                                                                | Bremsen: færre hårde pas på dårlige dage, 7-dages gennemsnit mod egen baseline, HRex som robust pulsmål                                      | Daglig styring som speeder; ingen målbar gevinst i gennemsnit, intet på unge                                     |
| **San Millán, zone 2**                                                    | Let træning lige under første tærskel træner mitokondrier og fedtforbrænding; laktatstyring                                                | "Lige under første tærskel" som ordvalg (Sitko m.fl. 2025 [abstract])                                                                        | Mekanismeforklaringen; tværsnit uden træning, afvist for befolkningen (Storoschuk m.fl. 2025)                    |
| **Gabbett, ACWR** (holdsport)                                             | Akut mod kronisk belastning, sweet spot 0,8–1,3, "training–injury prevention paradox"                                                      | Paradokset: jævnt høj belastning beskytter; spring efter pause er farlige; under 10 % om ugen som rettesnor                                  | Forholdet som tal med zoner; matematisk koblet, uden årsagsmodel, og fra rugby og cricket                        |

## 8. Evidensgrader og mærker

Hver regel og hvert princip bærer en grad. Graden siger, hvor hårdt Kadence må tale om det.

| Grad         | Betyder                                                                                                                                                 | AI'en må sige                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Stærk**    | Metaanalyser eller flere RCT'er på en relevant population, eller et fund, der går igen i observation, forsøg og praksis på tværs af idrætter            | "Det, man ved, peger på", med tal                                         |
| **Moderat**  | RCT'er på en anden population (voksne, løbere, holdsport) eller konsistent observation plus trænerpraksis, uden forsøg på den gruppe, det gælder        | "Hos voksne har man set", "verdensklassens trænere gør"                   |
| **Svag**     | Små studier, tværsnit, modstridende fund, én kilde, eller tal fra en population, der ligger langt fra Kadences                                          | Som tendens og med forbehold; aldrig som grund til et forbud              |
| **Erfaring** | Trænerpraksis, forbundsdokumenter uden anført evidens (DCU, ATK, Olympiatoppen), trænerbøger (Friel, Cavell) og Kadences eget skøn, der udfylder et hul | "Trænere som … anbefaler", "Kadences skøn"; aldrig "forskning viser"      |
| **Folklore** | Udbredt påstand uden empirisk støtte eller med modstridende evidens                                                                                     | Siges ikke; i Hjælp kan det stå som "en udbredt påstand, der ikke holder" |

Læsemærkerne følger kilderne fra researchnotaterne og skal med, når et tal flyttes fra notat til regel til kode:

- **[læst]**: fuld tekst hentet og læst.
- **[abstract]**: kun abstractet er læst, og tallene stammer derfra.
- **[web]**: siden er læst gennem et værktøj, der opsummerer; en person bør se den igen, før et tal kommer i kode.
- **[sekundær]**: oplysningen kommer fra en anden kilde end originalen.
- **[søgning]**: kun set i et søgeresultat. Ikke verificeret, og må ikke bruges i kode.
- **[ikke verificeret]**: fra hukommelsen, kunne ikke slås op.

Reglen for mærkerne: kun [læst] og [abstract] kan give et tal i kode, og kun med kilden ved siden af sig (CLAUDE.md). Et tal mærket [søgning], [sekundær] eller [ikke verificeret] kan højst blive en regel med graden svag eller erfaring, og det står i noten, at det skal efterprøves. Når noterne er uenige, står uenigheden i reglen, ikke et gennemsnit.

Et forbehold, der gælder alt: næsten intet af grundlaget er fra cykling, og intet er fra unge danske landevejsryttere. Holdsport (belastning og skade), svømning (Banister, overtræning), løb (HRV, den norske model), langrend (verdensklassens dagbøger) og voksne mænd (det meste) dominerer. Tal derfra er grænser at låne med kildehenvisning, ikke evidens for U17–U23.

## 9. Sådan holder vi modellen levende

Modellen er versioneret og dateret, og den ændres kun ad én vej.

**Version og dato.** Modellen har et versionsnummer og en dato nederst i dette dokument og i regler.md. En regel, der ændres, får sin ændring og dato i noten. Kode, der holder en regel, henviser til reglens id.

**Vejen ind.** En ny kilde eller en ny erfaring går gennem fire trin, og springer aldrig et over:

1. **Et researchnotat** i `docs/research/` læser kilden, mærker den ([læst], [abstract], …), graderer evidensen og skriver, hvad det betyder for Kadence.
2. **Registret** `kilder-og-personer.md` får kilden og personen med tilhørsforhold, hvad de står for, og hvor de er omstridte.
3. **Reglen** i `regler.md` får et id, en grad, kilden, og hvor den skal leve.
4. **Koden eller prompten** får reglen med kilden ved siden af sig, en test, og om nødvendigt en ADR, når det er en beslutning med en afvejning.

**Hvem beslutter.** Martin, med en træners øje. Det, en træner på et rigtigt hold siger imod, vejer tungere end et abstract.

**Hvornår modellen gennemgås.**

- **Hver oktober**, før sæsonen, hele modellen: hvad holdt, hvad blev ændret, hvad blev aldrig brugt.
- **Når en konsensus kommer eller ændres**: nye anbefalinger fra DCU eller Team Danmark, en ny IOC- eller ECSS-konsensus (unge, belastning, REDs, mental sundhed, hjernerystelse), en ny metaanalyse på et område, hvor Kadence har en regel med graden moderat eller svag.
- **Når et notat ændres**: et tal, der går fra [abstract] til [læst] og viser sig anderledes, eller en kilde, der trækkes tilbage.
- **Efter en rigtig vinter med et rigtigt hold** (dogme syv). Det er den vigtigste gennemgang og den eneste, der kan kalde noget valideret.

**Erfaring fra hold som egen kildetype.** Det, trænere og ryttere oplever med Kadence, samles som en kildetype for sig, "erfaring (hold)", med dato, hold (anonymiseret), hvad reglen sagde, hvad der skete, og hvad træneren gjorde i stedet. En regel med graden erfaring kan hæves eller sænkes af den. Det, der ikke må ske, er, at en enkelt god eller dårlig sæson bliver til en regel med graden stærk. Offentlige repositorier får ingen rigtige ryttere, hold, helbredsoplysninger eller korrespondance (public repos: technical only).

**Hvad der skal efterprøves, før det går i kode.** Listerne står i hvert notat og gentages i regler.md: Sandbakk 2025 og Tønnessen 2014 for lette uger og nedtrapning (læst gennem et opsummerende værktøj), ATK 2.0 og DIF's periodiseringshæfte i fuld tekst, Lloyd 2014's doseringsråd, Soligard 2016's konkrete anbefalinger, Williamsons effektstørrelser, og alt mærket [søgning] eller [ikke verificeret].

## 10. Åbne spørgsmål til Martin

Samlet fra de ni notater, dubletter slået sammen.

**Intensitet og pas**

1. Skal holdet kunne vælge polariseret eller pyramidal som skole, eller nøjes Kadence med "Lav intensitet først" og lader træneren lægge de hårde pas, hvor de vil?
2. Skal rytteren have to tærskelankre (første og anden, i watt og puls) i profilen, og skal zonerne udledes af dem i stedet for af procent af FTP? Det er en ændring af zonemodellen (ADR).
3. Skal kritisk effekt fra et 3- og et 12-minutters forsøg foretrækkes over FTP, når begge findes?
4. Skal laktatfelter være valgfrie og trænerindtastede?
5. Skal holdbarhed (frisk og træt effektprofil) vises for U19 og U23, med eget navn, og ikke for U17?
6. Skal fordelingen vises både i tid og i pas?

**Uge og sæson**

7. Er loftet på 2 hårde dage inkl. løb for U17 rigtigt? Det er Kadences syntese, ikke et kildetal.
8. Skal den lette uge være standard i uge 4 i vinteren, udløst af data, og udgå i sæsonen?
9. Skal sæsonplanen kunne rumme en forberedelsesblok på 2–3 uger midt i sæsonen for U19 og U23?
10. Skal nedtrapning før A-løb bygges som regel (7–10 dage unge, 10–14 voksne)?

**Belastning og check-in**

11. Skal der et spørgsmål til efter hvert pas, "hvor hårdt var det, 0–10", så Kadence får sRPE, afkobling, monotoni og strain?
12. Skal check-in'ets grænser blive individuelle (rullende 21-dages baseline pr. felt) oven på de absolutte?
13. Skal monotoni og strain vises, og skal de hedde "ensformighed" og "samlet pres"?
14. Skal TRIMP fra puls og sRPE vises side om side som to belastninger?
15. Skal check-in'et for ryttere under 16 have tillægsord under hvert spørgsmål og en "forstår ikke"-udvej?

**Unge**

16. Skal profilen for 13–17-årige kunne rumme højde månedligt (og siddehøjde og forældrehøjder), og skal Kadence vise kategorien før, i eller efter vækstspurten?
17. Skal "timer om ugen over alder i år" og "over 16 timer om ugen" være flag?
18. Skal anden sport om vinteren tælle som udholdenhedstid med lavere specificitet, selv om DCU ikke tæller den i cykeltimerne?
19. Skal styrkevalget for U17 (DCU-tung fra U17 eller NCF-sen fra 18) tilbydes træneren som et valg, med "før/efter vækstspurt" på øvelserne?

**Voksne og ældre**

20. Skal "konkurrencemasters" være et flag på Supermotionisten (løbsregler, loft på to hårde pas, én hel hviledag) eller en tredje profil?
21. Skal ESC-forbeholdet (over 35, stillesiddende, risikofaktorer: tal med lægen) vises én gang pr. konto, én gang pr. sæson, eller før hver hård blok efter mindst fire ugers pause?
22. Må Kadence citere Friel og Cavell i Hjælp som "trænere anbefaler", når bøgerne ikke er efterprøvet mod primærkilder?

**Styrke og off-bike**

23. Skal "Hop 5 minutter" ind i biblioteket som eget pas for alle klasser, og skal vinterplanen have det som fast element?
24. Skal Supermotionistens og masters' styrke have power-sæt (2 × 5 hurtige ved 40–60 %)?
25. Skal Rønnestads program (NCF tabel 2) ligge i biblioteket som "Lillehammer-programmet" med vedligeholdspasset 2 × 5 ved 80–85 %?
26. Skal der være en vagt ved mere end 10 dage uden styrke i sæsonen, og ved styrke dagen før et løb?
27. Skal "altid til udmattelse" i DCU's kompendium erstattes af RIR 1–2 i Kadences passkabelon?

**Sundhed**

28. Skal OSTRC-O2 ind som ugentlig opfølgning på et registreret smertested, eller er smertestigen og de kendte smerter nok?
29. Hvor stramt skal løbsdage låses efter hjernerystelse: UCI's 7/14 dage, eller 21 dage som British Cycling og AusCycling?
30. Skal cyklussporing (og overgangsaldersymptomer) være et frivilligt felt i check-in'et, kun synligt for rytteren selv, også for ryttere under 18, og også i klubben?
31. Skal "styrt" være et tag på turen eller et felt i check-in'et?
32. Skal "syg" fortsat være rød uden nuancer, og skal genopbygningen efter sygdom (lige så mange lette dage som sygedage) være en regel?

**Feedback og AI**

33. Skal AI-kommentarer på enkeltpas fortsat kun komme på knap, med en ugentlig opsummering som standard?
34. Skal den frivillige årlige øvelse, hvor rytter og forælder hver skriver deres mål og rytteren vælger, om de sammenlignes, bygges?
35. Skal wearable-tal (HRV, hvilepuls) vises rå som 7-dages gennemsnit mod egen baseline, når en enhed leverer dem?

**Modellen selv**

36. Er oktober det rigtige tidspunkt for den årlige gennemgang, og skal den have et fast format (hvad holdt, hvad ændrede sig, hvad blev aldrig brugt)?
37. Skal "erfaring (hold)" samles i et fast skema fra den første vinter?

## 11. Læs videre

- [regler.md](regler.md): de nummererede regler med grad, kilde og hvor de lever.
- [kilder-og-personer.md](kilder-og-personer.md): registret over de personer og kilder, modellen læner sig op ad.
- `docs/research/traeningsmodel/`: de ni researchnotater fra 9. november 2026.
- `docs/research/traeningsparadigmer.md`, `senior-motionister.md`, `foraeldre-og-talentudvikling.md`, `ernaering.md`: de ældre notater, modellen bygger videre på.
- `src/modules/load/guardrails.ts`, `src/modules/dcu`, `src/modules/paradigms`, `src/modules/assist`: der, hvor modellen lever i kode og prompter i dag.

Version 0.1, udkast 9. november 2026, bygget på ni researchnotater i docs/research/traeningsmodel/.
