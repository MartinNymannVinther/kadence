# Periodisering og planlægning: sæson, blok og uge i udholdenhedsidræt

Researchnotat, november 2026 (kilderne er hentet og læst 9. november 2026).

**Spørgsmålet.** Hvordan er en sæson, en blok og en uge bygget op i de store periodiseringstraditioner, hvad siger evidensen, og hvordan skal det forme en AI, der laver udkast til uger og sæsoner, som en træner godkender?

**Baseline.** Notatet bygger videre på `docs/research/traeningsparadigmer.md`, særligt afsnit 4.4 (traditionel vs. blok, Sylta 2016, Galán-Rioja 2023, de to juniorstudier McGawley 2017 og Walther 2026) og afsnit 6 (LTAD, IOC-konsensus, ATK). Det gentages ikke her. Henvisninger til `src/modules/dcu/phases.ts`, ADR 0017, 0025, 0040, 0043 og 0101 er til Kadence's egen kode og beslutninger.

**Metode og mærker.**

- **[læst]**: fuld tekst hentet og læst. Fuldtekster er læst gennem et værktøj, der uddrager og opsummerer; citater er korte, og tal bør ses efter i kilden af en person, før de kommer i kode.
- **[abstract]**: kun abstractet (via Europe PMC) er læst, og tallene stammer derfra.
- **[web]**: en webside, læst gennem et opsummerende værktøj.
- **[sekundær]**: oplysningen stammer fra en anden kilde end originalen (fx Wikipedia eller en reviewartikel).
- **[søgning]**: kun set i et søgeresultat. Ikke verificeret, og må ikke bruges i kode.
- **(beregnet)**: vores egen regning.

TSS, CTL, ATL, TSB, NP og IF er TrainingPeaks' varemærker og nævnes kun, hvor en kilde selv bruger dem.

---

## 0. Kort svar

1. **Alle de store modeller er traditioner, ikke efterprøvede teorier.** Matveyevs traditionelle model, Bompas lærebøger, Verkhoshanskys og Issurins blokmodel og den bølgende (undulerende) model bygger på trænerpraksis og en stressteori (Selye) fra 1950'erne. Ingen af dem er testet i den form, de fremsættes i: med forudsagt timing af formtop, over en hel sæson, mod en varieret, ikke-periodiseret plan (Afonso 2017 og 2019, Kiely 2012 og 2018).
2. **Blokperiodisering har den bedste evidens, men den er lille og svag.** Mølmen, Øfsteng & Rønnestad 2019: VO2max SMD 0,40 (95 % CI 0,02–0,79) over 6 poolede studier, gennemsnitlig PEDro 3,7/10. Det største cykelstudie uden Rønnestads gruppe i designet (n = 30, 2022) fandt ingen forskel. Hos juniorer har to studier fundet ingen fordel og dårligere humør.
3. **Omvendt periodisering og undulerende periodisering har ingen påvist fordel i udholdenhed.** González-Ravé m.fl. 2022: 11 studier, 200 atleter, PEDro 4,9, ingen overlegenhed. Undulerende modeller er kun undersøgt i styrke.
4. **Det, der faktisk er fælles for verdensklassen, er ugens rytme, ikke årsmodellen.** Tolv norske verdensklassetrænere (Sandbakk m.fl. 2025, heriblandt landevejscykling) kører traditionel periodisering med 2–3 hårde dage om ugen, aldrig to hårde dage i træk, en let uge hver 3.–4. uge med 25–35 % mindre mængde i forberedelsen (ikke i konkurrenceperioden), og blokke kun til højde, lejre og løbsklynger, "brugt langt mere dynamisk end i teorien".
5. **Nedtrapning er det bedst dokumenterede planelement.** Bosquet m.fl. 2007 (27 studier): ca. to uger, eksponentielt fald i mængde på 41–60 %, intensitet og hyppighed holdes; ca. 3 % bedre præstation. Men de norske guldvindere nedtrappede langt mindre end det (Tønnessen 2014: ca. 32 % under forberedelsens mængde, 3 hårde pas om ugen, 10 af 11 kørte hårdt inden for 48 timer før løbet), og "planlagt overreaching før nedtrapning" gav flere infektioner og dårligere formtop end almindelig træthed (Aubry 2014).
6. **Kiely har ret i det centrale, men han afskaffer ikke planen.** Samme belastning giver forskellig tilpasning i forskellige mennesker og på forskellige dage; stress er psykobiologisk og ikke kun mekanisk. Hans forslag er et "skelet" med start, kontrolpunkter og mål, og justering ud fra løbende information. Det er præcis en AI-udkastsmodel: fast ramme, dynamisk indhold.
7. **For Kadence** betyder det: sæsonen og løbene ligger fast; ugens rytmeregler ligger fast; indholdet af de næste 1–2 uger er et udkast, der laves igen hver uge ud fra, hvad der blev kørt, og hvad check-in siger. Blokke, højde og overreaching før nedtrapning er trænerværktøjer til U23 og voksne, ikke standard for U17 og U19.

---

## 1. Modellerne: hvad de påstår, og hvad evidensen er

### 1.1 Kort svar

Traditionel (Matveyev), blok (Verkhoshansky, Issurin), Bondarchuks adaptationscyklusser og undulerende periodisering er alle logiske konstruktioner fra elitetræning og styrketræning. I udholdenhed findes kun kontrollerede forsøg på blok mod traditionel, og de er små, korte (4–12 uger) og af lav kvalitet.

### 1.2 Fund med kilder

**Traditionel/lineær periodisering (Matveyev, Bompa).**

- Issurin beskriver den traditionelle model som "developed about five decades ago" (dvs. 1960'erne) med årlige makrocyklusser delt i forberedelses-, konkurrence- og overgangsperiode, hvor mange egenskaber trænes samtidig ("mixed" eller "complex" træning), og mængden går forud for intensiteten. Issurin 2010, Sports Med 40:189–206, DOI 10.2165/11319770-000000000-00000, PMID 20199119 [abstract].
- Issurins kritik af den (2008, 2010, 2016): (a) modstridende tilpasninger, når mange egenskaber trænes på én gang; (b) for stor samlet træthed; (c) for lille stimulus fra moderate belastninger for elite; (d) den kan ikke give flere formtoppe på én sæson. Issurin 2008, J Sports Med Phys Fitness 48:65–75, PMID 18212712 [abstract]; Issurin 2016, Sports Med 46:329–338, DOI 10.1007/s40279-015-0425-5, PMID 26573916 [abstract].
- Matveyevs eget værk (russisk 1964/1965, engelsk "Fundamentals of Sports Training", Progress Publishers 1981) har jeg ikke læst; alt om Matveyev her er via Issurin og Kiely [sekundær].
- Tudor O. Bompa (f. 1932, professor emeritus, York University, Toronto) udbredte modellen i Vesten med "Periodization: Theory and Methodology of Training" (1. udg. 1994, seks udgaver), "Periodization Training for Sports" (1999) og "Total Training for Young Champions" (1999). https://en.wikipedia.org/wiki/Tudor_Bompa [web, sekundær]. Medforfatterskabet Buzzichelli på de seneste udgaver kunne jeg ikke efterprøve i den kilde.
- Kiely 2018 nævner, at NSCA's materialer og reviews af Turner, Bompa & Haff og Issurin alle angiver homeostase og Selyes GAS som teoretisk grundlag. Kiely 2018, Sports Med 48:753–764, DOI 10.1007/s40279-017-0823-y, PMID 29189930, PMC5856877 [læst].

**Blokperiodisering (Verkhoshansky, Issurin).**

- Yuri Verkhoshansky (sovjetisk forsker, "the father of the Shock Method", plyometrik sidst i 1960'erne) beskrev koncentrerede belastninger og "Block Training System"; bogtitlen "Supertraining & Block Training System in endurance running" findes på hans efterladte site. https://www.verkhoshansky.com/ [web]; https://en.wikipedia.org/wiki/Yuri_Verkhoshansky [web, sekundær]. Sitet forklarer ikke modellen; det "conjugate sequence system" nævnes kun som en progression for springøvelser.
- Issurin 2016 skelner mellem to blokmodeller: en **koncentreret ensrettet** (ét mål ad gangen, især Verkhoshansky, mest til eksplosiv styrke) og en **flermålsmodel** (sekvenserede blokke, "accumulation → transmutation → realization", med residuale træningseffekter). Den ensrettede gav fremgang i fitnessmål, men ikke klart i sportsspecifik præstation; flermålsmodellen var bedre end traditionel træning i flere idrætter. Issurin 2016 [abstract].
- Kiely svarede Issurin direkte i et brev: "Block periodization: new horizon or a false dawn?", Sports Med 2010; 40(9):803–807, PMID 20806489 [kun titel; ingen abstract i posten].

**Blok i cykling: Rønnestads studier.**

- **Rønnestad, Hansen & Ellefsen 2014** (SJMSS 24:34–42, DOI 10.1111/j.1600-0838.2012.01485.x, PMID 22646668) [abstract]: 4 uger, trænede ryttere (VO2max ca. 62–63), BP n = 10, TRAD n = 9. BP: 5 HIT-pas i uge 1, derefter 1 HIT/uge i tre uger; TRAD: 2 HIT/uge. Samme antal HIT (8) og samme LIT. BP: VO2max +4,6 ± 3,7 %, Wmax +2,1 ± 2,8 %, watt ved 2 mmol/L +10 ± 12 % (alle P < 0,05); TRAD uændret. ES for BP: 1,34 (VO2max), 0,85 (Wmax), 0,71 (2 mmol).
- **Rønnestad, Ellefsen m.fl. 2014** (SJMSS 24:327–335, DOI 10.1111/sms.12016, PMID 23134196) [abstract]: 12 uger, tre blokke à 4 uger (5+1+1+1 HIT) mod 2 HIT/uge; BP n = 8, TRAD n = 7. VO2max +8,8 ± 5,9 % mod +3,7 ± 2,9 % (P < 0,05); watt ved 2 mmol +22 ± 14 % mod +10 ± 7 % (P = 0,054). ES 0,62–1,12 for BP i VO2max, 2 mmol-watt, hæmoglobinmasse og 40-min watt.
- **Rønnestad m.fl. 2016**, langrend, 5 uger, BP n = 10 vs. TRAD n = 9 (SJMSS 26:140–146, DOI 10.1111/sms.12418, PMID 25648345) [abstract]: peak power +4 ± 4 % vs. −3 ± 6 %, watt ved 4 mmol +11 ± 10 % vs. +2 ± 4 % (P < 0,01), VO2max +2 ± 2 % (P < 0,05) kun i BP. Jeg fandt **ikke** et Rønnestad-blokstudie i cykelryttere fra 2016; 2014-2016 i opgaveteksten dækker de to cykelstudier fra 2014 og langrendsstudiet 2016.
- **Modsat fund, 2022:** "No Differences Between 12 Weeks of Block- vs. Traditional-Periodized Training in Performance Adaptations in Trained Cyclists", Front Physiol 2022, DOI 10.3389/fphys.2022.837634, PMID 35299664 [abstract]. BP n = 14, TP n = 16, VO2peak 58 ± 8. Begge grupper +8–9 % i 5- og 40-min watt (P < 0,001), Wmax +6 ± 7 %, 4 mmol-watt +10 ± 12 %; ingen forskel i præstation. BP: røde blodlegemer +10 ± 16 % mere (P = 0,029); TP: flere kapillærer om type I-fibre (+20 ± 12 %, P = 0,002). Det er det største af cykelstudierne.
- **Metaanalyse, Mølmen, Øfsteng & Rønnestad 2019**, Open Access J Sports Med 10:145–160, DOI 10.2147/OAJSM.S180408, PMID 31802956 [abstract]: 2 905 screenet, 20 opfyldte kriterierne, 6 poolet. VO2max SMD 0,40 (95 % CI 0,02–0,79), Wmax SMD 0,28 (0,01–0,54). Andre udholdenhedsmål "moderate-to-large" for BP, men "small studies with generally low methodological quality (mean PEDro score = 3.7/10)". Forfatterne maner til forsigtighed; de er selv ophavsmænd til de fleste af de poolede studier (min bemærkning).
- **Nyeste bølge (2022–2026) fra samme miljø:** én HIT- eller MIT-uge (5–6 pas på 6–7 dage) fulgt af 6 dages let træning giver små, målbare forbedringer i delmål hos veltrænede ryttere og langrendsløbere, men typisk ikke i 15-min watt. Eksempler: MSSE 2025, DOI 10.1249/MSS.0000000000003706, PMID 40101160 (n = 30 crossover, MIT-blok: 4 mmol-watt +4,0 % mod −1,3 %, P < 0,01; 15-min watt P = 0,14); EJSS 2025, DOI 10.1002/ejsc.70067, PMID 41169000 (n = 22, MIT- og HIT-blok begge +15-min watt, MIT bedst på 4 mmol-watt, P = 0,03); EJSS 2025, DOI 10.1002/ejsc.12223, PMID 39639702 (HIT-mikrocyklus: sidste minut i VO2max-test +3,7 % mod +0,7 %, p = 0,009; øvrige mål ns) [alle abstract].
- **Hos juniorer** (se traeningsparadigmer.md 4.4): McGawley 2017 og Walther 2026 fandt ingen fordel, og Walther fandt "significantly lower mood and perceived recovery" i blokugen.
- **Systematisk review i cykling, Galán-Rioja m.fl. 2023** (IJSPP 18:112–122, DOI 10.1123/ijspp.2022-0302, PMID 36640771) [abstract]: syv studier; blokke på 1–8 uger med 8,75–11,68 t/uge mod traditionel med 7,5–10,76 t/uge og pyramidal fordeling. "No evidence … favoring a specific periodization model during 8 to 12 weeks in trained road cyclists."

**Bondarchuk.**

- Anatoliy Pavlovych Bondarchuk (1940–2025), OL-guld i hammerkast 1972, træner for bl.a. Yuri Sedykh, senere i Kamloops, Canada. Hans "Transfer of Training" (to bind, oversat af Michael Yessis) er kilden til hans øvelsesklassifikation og adaptationscyklusser. https://en.wikipedia.org/wiki/Anatoliy_Bondarchuk [web, sekundær]. Jeg fandt **ingen** fagfællebedømt litteratur om hans model (Europe PMC: kun to russiske mindeartikler om en neurokirurg med samme navn). Hans tilgang (periodisering efter den enkeltes målte adaptationsforløb, ikke efter kalenderen) er kun kendt fra bøgerne og fra trænerblogs. Ingen evidens i udholdenhed.

**Undulerende (ikke-lineær) periodisering.**

- Fleck 2011 (J Hum Kinet 29A:41–45, DOI 10.2478/v10078-011-0057-2, PMID 23486658) [abstract]: periodiserede styrkeprogrammer giver større styrkegevinst end ikke-periodiserede; både lineær og daglig undulerende giver fremgang; nogle studier peger på undulerende. Kun styrke.
- Zhang m.fl. 2026, Front Public Health 14, DOI 10.3389/fpubh.2026.1707627, PMID 41869632 [abstract]: 29 studier, lineær og undulerende styrketræning "comparable" på atletiske mål. Kun styrke.
- Afonso m.fl. 2020, Sports 8:110, DOI 10.3390/sports8080110, PMID 32784454 [abstract]: "linear" og "nonlinear" bruges inkonsekvent i litteraturen; et konceptuelt essay.
- Jeg fandt **ingen** studier af undulerende periodisering af udholdenhedstræning som sådan (de "blandede" rækkefølger i Sylta 2016 er det nærmeste; se traeningsparadigmer.md 4.4).

### 1.3 Slutninger

- Når blok virker i voksne, veltrænede ryttere, er mekanismen formentlig, at fem hårde pas på en uge er en større stimulus end to, og at ugen efter er let. Det er en **dosis- og restitutionseffekt**, ikke en "model". Det er også derfor, effekten forsvinder, når sammenligningsgruppen i forvejen træner godt og længe (2022-studiet), og hvorfor den ikke ses hos juniorer, som allerede har mange hårde løbsdage.
- Den samlede evidens for "hvilken periodiseringsmodel" er så svag, at valget bør afgøres af andet: restitution, løbskalender, skole, lejre og trænerens erfaring.

### 1.4 Huller

- Ingen fuldtekst af Issurin 2008/2010/2016 eller Kielys brev fra 2010; alle fire er bag betalingsmur.
- Ingen cykelstudie med blok mod traditionel over mere end 12 uger, og intet i ryttere under 18 år.
- Bondarchuks og Verkhoshanskys egne tekster er ikke læst.

---

## 2. Kritikken: Kiely, Afonso, det komplekse system

### 2.1 Kort svar

Sagen mod _fast forudbestemte_ planer er stærk: ingen studie har testet, om en periodiseret plan rammer den formtop, den forudsiger, og forsøgsgrupperne har aldrig været "varieret, men ikke periodiseret". Sagen mod _planlægning_ er svag: Kiely selv foreslår et skelet med kontrolpunkter, og en international trænerundersøgelse viser, at 71 % kalder deres praksis periodisering, mens kun 10 % holder fast i faste mål for en periode.

### 2.2 Fund med kilder

**Kiely 2012**, "Periodization paradigms in the 21st century: evidence-led or tradition-driven?", IJSPP 7:242–250, DOI 10.1123/ijspp.7.3.242, PMID 22356774 [abstract + Semantic Scholar-resumé]. Et review, der hævder, at periodiseringsmodellerne deler historiske antagelser, som ikke længere kan forsvares videnskabeligt, og anbefaler "increased emphasis … on the design and implementation of sensitive and responsive training systems" med individuelle, kontekstafhængige planer. Han afviser ikke periodisering som sådan. 204 citationer (Semantic Scholar). Fuldtekst er lukket; ResearchGate-kopien afviste hentning (403).

**Kiely 2018**, "Periodization Theory: Confronting an Inconvenient Truth", Sports Med 48:753–764, PMC5856877 [læst]. John Kiely, Institute of Coaching and Performance, University of Central Lancashire (siden University of Limerick).

- Hovedargument: periodiseringen hviler på en forældet stressmodel, hvor "mechanical loading parameters directly dictate biological training adaptations" (Applied Implications), og hvor tilpasningen følger en forudsigelig, generisk bane. Stressvidenskaben er gået fra Selyes GAS (1936) til allostase og emotionsdrevne, individuelle svar; periodiseringen har ikke fulgt med: "the philosophical assumptions underpinning periodization remain largely unchallenged and unchanged" (Abstract).
- Historik: Cannon (homeostase, 1920'erne), Selye (GAS), overført til idræt af trænerne Forbes Carlisle, Fred Wilt og James Counsilman 1955–1968; Lazarus og Mason viste, at stress afhænger af vurdering og kontekst; Sterling og Eyers allostase erstattede faste sætpunkter. Kulturelt kobler Kiely planmodellen til newtonsk mekanik og Taylors "scientific management". Artiklen omtaler **ikke** Matveyev eller sovjetisk planlægningskultur direkte (det gør 2012-artiklen).
- Hvorfor faste planer svigter: (a) samme program giver vidt forskellige individuelle svar, mens gruppegennemsnit ser ens ud på tværs af programmer; (b) "emotion calibrates the chemistry of the stress response to perceived context" (The Brain as a Master Gland): samme mekaniske belastning giver forskelligt udfald afhængigt af forventning, kontekst og baggrundsstress; (c) allostase er foregribende og systemisk, ikke en dosis-respons-kæde. Én "bedste" model forudsætter forudsigelige baner, generelle tidsrammer og stabile dosis-respons-forhold, og "there are no generalized formulaic solutions to these planning puzzles" (Recalibrating Theory and Practice).
- Hans forslag: et bredt **skelet med aftalte startpunkter, kontrolpunkter og slutpunkter**; løbende justering ud fra tidsfølsom, procesgenereret information (subjektiv, objektiv, trænerens observation; alle kilder ufuldkomne); psykoemotionel tilstand som træningsvariabel. "Persistent change drives positive adaptation, but sudden change elevates injury risk." Otte praktiske anbefalinger: atletens forståelse og ejerskab af planen; formelle og uformelle feedbackkanaler; klar kommunikation; trænerens ledelsesstil kan forstærke stress; støttende træningsgruppe; rutiner før træning, der matcher pasets mål; progressiv opbygning af emotionel robusthed; accept af, at afvejningerne (stivhed/fleksibilitet, variation/monotoni, specificitet/overbelastning) løses med skøn og monitorering. "There is only the informed exploration of a dynamically changing landscape." (Conclusions).

**Trænerundersøgelse med Kiely som medforfatter, 2023**, Sports Med Open 9, DOI 10.1186/s40798-023-00657-6, PMID 37989900 [abstract]: 106 trænere verden over; 71 % kalder deres planlægning periodisering, men kun 10 % støtter faste træningsmål for en periode.

**Montull m.fl. 2022** (med Kiely), "Subjective Outperforms Objective Monitoring", Sports Med Open 8, DOI 10.1186/s40798-022-00432-z, PMID 35348932 [abstract]: atleten som komplekst adaptivt system; subjektiv monitorering integrerer information bedre end objektive systemer, uden at objektive mål skal droppes.

**Afonso m.fl. 2017**, "Is Empirical Research on Periodization Trustworthy?", J Sports Sci Med 16:27–34, PMID 28344448 [abstract]: 42 randomiserede eller kontrollerede forsøg til februar 2016. Begreberne periodisering og variation bruges inkonsekvent; **intet** studie testede forudsigelser om retning, timing eller størrelse af tilpasning; over 95 % målte fysiske (mest styrke-) udfald; intet varede over ni måneder; kost og kosttilskud blev sjældent kontrolleret; individuel responsvariation blev ignoreret.

**Afonso m.fl. 2019**, "A Systematic Review of Meta-Analyses Comparing Periodized and Non-periodized Exercise Programs: Why We Should Go Back to Original Research", Front Physiol 10:1023, DOI 10.3389/fphys.2019.01023, PMID 31440169 [læst]. José Afonso (Universitetet i Porto) m.fl. To metaanalyser, 21 originalstudier: "None of the 21 studies … compared periodized programs with varied, non-periodized programs"; ingen testede timingforudsigelser; otte sammenlignede i virkeligheden andet (mængde, sæt, supervision); alle fik maksimal biasscore. Konklusion: metaanalyserne "do not demonstrate that periodized programs are superior to non-periodized, varied programs", og der er "no reliable evidence" for, at periodiserede programmer kan forudsige eller styre timingen af tilpasninger. De hævder **ikke**, at periodisering er virkningsløs.

Den tekst, opgaven kalder "Afonso et al. 2017 ('Is there evidence for periodization?')", svarer til JSSM-artiklen ovenfor; en artikel med præcis den titel fandt jeg ikke.

**"Agile periodization" (Mladen Jovanović)** [søgning]: trænerbog ("Strength Training Manual: The Agile Periodization Approach"), tre tidsrammer (release, phase, sprint) med plan-udvikling-review, "minimer nedsiden" (hellere undertrænet end overtrænet), skepsis over for laboratoriefund som "small world"-modeller. https://simplifaster.com/articles/agile-periodization-jovanovic-book-review/ . Ikke fagfællebedømt; ingen udholdenhedsdata.

### 2.3 Slutninger

- Kritikken rammer _forudsigelsen_ (at man kan planlægge en formtop måneder frem på en skabelon), ikke _rammen_ (at sæsonen har faser, og at de hårde uger skal spredes). For en AI betyder det: planlæg rammen, udkast den nære uge, og lad data og check-in styre revisionen.
- "Komplekse systemer"-sproget tilføjer ikke empiri ud over Kielys pointer. Det er en begrundelse for monitorering, ikke en planmetode.

### 2.4 Huller

- Kiely 2012 i fuld tekst. Jovanović er kun set som anmeldelser.

---

## 3. Nedtrapning og formtop

### 3.1 Kort svar

To ugers progressiv (eksponentiel) nedtrapning med 41–60 % mindre mængde, uændret intensitet og højst let reduceret hyppighed giver ca. 3 % (0,5–6 %) bedre præstation. Praksis i verdensklassen nedtrapper mindre og holder hårde pas til 48 timer før løbet. Planlagt overreaching før nedtrapningen er en gambling: flere syge og dårligere formtop end hos dem, der blot var trætte.

### 3.2 Fund med kilder

- **Bosquet, Montpetit, Arvisais & Mujika 2007**, MSSE 39:1358–1365, DOI 10.1249/mss.0b013e31806010e0, PMID 17762369 [abstract]: 27 af 182 studier. Optimalt: 2 ugers nedtrapning, eksponentielt fald i mængde på 41–60 %, intensitet og hyppighed fastholdt. Effektstørrelser: varighed 0,59 ± 0,33, mængdereduktion 0,72 ± 0,36, intensitet 0,33 ± 0,14, hyppighed 0,35 ± 0,17.
- **Mujika & Padilla 2003**, MSSE 35:1182–1187, DOI 10.1249/01.MSS.0000074448.73931.11, PMID 12840640 [abstract]: nedtrapning som "progressive, nonlinear reduction"; intensitet holdes, mængde ned med op til 60–90 %, hyppighed ned med højst 20 %, varighed 4 til over 28 dage; progressiv bedre end trinvis; typisk ca. 3 % (0,5–6 %).
- **Mujika 2010**, SJMSS 20 Suppl 2:24–31, DOI 10.1111/j.1600-0838.2010.01189.x, PMID 20840559 [abstract]: intensiteten må ikke falde; høj intensitet før og under nedtrapningen er nøglen.
- **Pyne, Mujika & Reilly 2009**, J Sports Sci 27:195–202, DOI 10.1080/02640410802509136, PMID 19153861 [abstract]: få RCT'er, fokus på én top frem for mange løb, ukendt samspil med rejse, varme og højde.
- **Neary m.fl. 2003**, Can J Appl Physiol 28:576–587, DOI 10.1139/h03-044, PMID 12904635 [abstract]: 11 cykelryttere, 7 dages nedtrapning med 30, 50 eller 80 % mindre mængde ved 85 % VO2max. Kun 50 % gav fremgang: 20-km enkeltstart +5,4 % (P < 0,05).
- **Thomas, Mujika & Busso 2008** (model, elitesvømmere), J Sports Sci 26:643–652, DOI 10.1080/02640410701716782, PMID 18344135 [abstract]: 20 % overbelastning i 28 dage før nedtrapning gav 101,4 % mod 101,1 % af bedste tid (P < 0,01), men krævede længere nedtrapning: 22,4 mod 16,4 dage.
- **Hellard m.fl. 2013**, J Sports Sci Med 12:668–678, PMID 24421726 [abstract]: 32 elitesvømmere, 3 ugers overbelastning + 3 ugers nedtrapning; det bedste mønster var top i uge 1 af nedtrapningen fulgt af langsomt fald (57, 45, 38 % af maksimal belastning). I de første tre sæsoner virkede jævn mellembelastning bedst; fra fjerde sæson høj overbelastning og skarpt fald.
- **Aubry m.fl. 2014**, "Functional overreaching: the key to peak performance during the taper?", MSSE 46:1769–1777, DOI 10.1249/MSS.0000000000000301, PMID 25134000 [abstract]: 33 mandlige triatleter, 8 ugers overbelastning (n = 23) eller normal træning (n = 10), 4 ugers nedtrapning. 11 blev funktionelt overreached (F-OR), 12 kun akut trætte (AF). AF havde **større** superkompensation (2,6 ± 1,1 %) end F-OR. Infektioner: 70 % (F-OR), 20 % (AF), 10 % (kontrol). Formtoppen lå inden for de første to uger af nedtrapningen hos 60/83/73 %.
- **Hausswirth m.fl. 2014**, MSSE 46:1036–1045, DOI 10.1249/MSS.0000000000000177, PMID 24091995 [abstract]: F-OR gav kortere søvn (−7,9 ± 6,7 %) og dårligere søvneffektivitet; luftvejsinfektioner 67/22/11 %.
- **Tønnessen m.fl. 2014**, "The road to gold", PLoS ONE 9:e101796, DOI 10.1371/journal.pone.0101796, PMID 25019608 [læst]: 11 norske OL-/VM-guldvindere (langrend og skiskydning). I formtopfasen var mængden 32 ± 15 % under forberedelsesperiodens (P < 0,01), men kun 9 ± 14 % (ns) under de forudgående uger; dag −7 til −1 ca. 15 % lavere (ns). 4 af 11 **øgede** mængden i den sidste uge. Ca. 5 HIT-pas på de sidste 14 dage; 10 af 11 kørte HIT (over LT2) inden for 48 timer før løbet; kun 3 af 11 holdt hviledag i de sidste 5 dage. HIT steg fra ca. 2/uge i grundforberedelsen til ca. 3/uge i formtoppen (P < 0,01); LIT-pas faldt fra ca. 8 til ca. 6/uge. "they did not follow suggested tapering practice derived from short-term experimental studies." Forfatterne foreslår "mini-tapers" før hvert løb i sæsoner med tæt kalender.
- **Sandbakk m.fl. 2025** [læst] (se afsnit 4): en træner beskriver "a good training period of 2-3 weeks with increased training load, followed by 10 days of reduced training load"; hyppigheden holdes, pasene gøres kortere på alle intensiteter; trænerne reducerer mindre end forskningen anbefaler.
- **Haugen m.fl. 2022** (verdensklasse-distanceløbere), Sports Med Open 8:46, DOI 10.1186/s40798-022-00438-7, PMID 35362850 [abstract]: nedtrapning starter 7–10 dage før hovedløbet.

### 3.3 Slutninger

- For en ungdomsrytter med ét vigtigt løb (DM, Nations Cup) er en **mini-nedtrapning på 7–10 dage** med uændret antal pas, kortere ture, 1–2 korte hårde pas og det sidste 2 døgn før løbet det, som både forskning og praksis kan mødes om. 41–60 % mindre mængde gælder efter en lang tung periode, ikke en almindelig løbsuge.
- Overreaching som planlagt greb bør en AI aldrig foreslå for U17/U19: nedsiden (infektion, søvn, humør) er dokumenteret, opsiden er 0,3 procentpoint i en model.

### 3.4 Huller

- Ingen nedtrapningsstudier i ryttere under 18. Ingen data for, hvordan en junior nedtrapper mellem to løbsweekender i træk.

---

## 4. Ugen: hård/let, antal hårde pas, lette uger, lejre og højde

### 4.1 Kort svar

Konsensus i praksis og i de få data: 2–3 hårde dage om ugen, spredt, aldrig to i træk; "hård" er intensitet gange varighed; resten let. Elitelangrendsløbere har et intensivt pas hver 3,6. dag i forberedelsen og hver 3,0. dag i sæsonen, og kun 5 % af dagene har både stor mængde og høj intensitet. Lette uger hver 3.–4. uge med 25–35 % mindre mængde er udbredt praksis i forberedelsen, men der findes **ingen** kontrolleret evidens for 3:1 mod 2:1 eller mod ingen lette uger i udholdenhed. Lejre er mængdeblokke, og højde har svagere evidens end sit ry.

### 4.2 Fund med kilder

**Antal hårde pas.**

- **Seiler 2010**, IJSPP 5:276–291, DOI 10.1123/ijspp.5.3.276, PMID 20861519 [abstract]: atleter med 10–13 pas/uge lægger ca. 80 % af pasene under ca. 2 mmol/L og ca. 20 % hårdt; intensiveringsstudier i allerede veltrænede giver ingen overbevisende langtidsgevinst af mere HIT.
- **Seiler & Tønnessen 2009**, Sportscience 13:32–53, https://www.sportsci.org/2009/ss.htm [læst, første del]: en eliteatlet med 10–12 pas/uge "is likely to dedicate 1-3 sessions weekly" til MLSS eller derover; Billat m.fl. 1999: ét HIT- og ét tærskelpas oven i rolig træning hjalp, tre HIT/uge gav intet ekstra og mere stress; 3–4 HIT/uge i 2–8 uger kan give overreaching. Foster m.fl. 2001: atleter "tend to run harder on easy days and easier on hard days" end planen; Guellich m.fl. 2009: de bedste juniorroere holdt "hard training hard and easy training easy". For motionister er der "almost no published data".
- **Sandbakk, Tønnessen, Bucher Sandbakk, Losnegard, Seiler & Haugen 2025**, Sports Med Open 11:45, DOI 10.1186/s40798-025-00848-3, PMID 40278987, PMC12031707 [læst]: 12 norske trænere, over 380 internationale medaljer, otte idrætter, heriblandt landevej. "most of the present coaches recommend two to three hard days spread out over the week"; "hård" kommer af intensitet og varighed tilsammen; 2–5 intensive pas om ugen (zone 3 hyppigst), nogle med dobbelt tærskel på samme dag (fx tirsdag og torsdag); 80–90 % af udholdenhedstiden i zone 1–2. En træner: "We should not aim to have as high training load as possible" (Table 1, Coach 7).
- **Tønnessen, Sandbakk, Bucher Sandbakk, Seiler & Haugen 2024**, Sports Med 54:2935–2953, DOI 10.1007/s40279-024-02067-4, PMID 39012575, PMC11560996 [læst, det meste]: LIT ca. 75–80 % af pasene, MIT (Z3) 10–15 %, HIT 5–10 %; Z3 typisk 1–3/uge, Z4–5 0–2/uge, Z6–7 0–1/uge. Trænerne styrer **dagen** som stressenhed; to hårde dage i træk er sjældne; "polarize stress, not intensity". All-out-pas kun i de sidste 3–6 uger før hovedkonkurrencen. I nedtrapning og lette uger er pasene ca. 50 % kortere. Intervaller er "controlled rather than exhaustive" med "reps in reserve".
- **Walther, Kocbach & Sandbakk 2025**, "Day-To-Day Endurance Training Periodization of World-Class Cross-Country Skiers", EJSS 25:e12322, DOI 10.1002/ejsc.12322, PMID 40400090, PMC12094961 [læst]: 17 verdensklasseløbere (7 kvinder), bedste seniorsæson. Intensive pas hver 3,6 ± 0,3 dag (maj–okt) og hver 3,0 ± 0,3 dag (nov–apr). I forberedelsen var mængden **højere** dagen før (127 ± 13 % af gennemsnit) og efter (116 ± 8 %) et hårdt pas; i sæsonen lavere (99 og 87 %). Kun ca. 5 % af dagene havde både stor mængde og høj intensitet. Hviledag hver 9,2 ± 4,4 dag (forberedelse) og hver 7,9 ± 2,9 dag (sæson). Ugemængde 996 ± 92 min mod 769 ± 80 min. Akut:kronisk-forhold (ACWR) lå på 0,75–1,25 på 68 % (forberedelse) og 70 % (sæson) af dagene; over 1,5 på kun 3–5 %. Forfatterne beskriver "a system where the applied training sequences are distributed in an alternating manner" og finder ikke ugecyklusser, men regelmæssige lettere dage.
- **Foster 1998**, MSSE 30:1164–1168, DOI 10.1097/00005768-199807000-00023, PMID 9662690 [abstract]: 25 atleter; sygdom fulgte belastning (6 ugers glidende), **monotoni** (dagligt gennemsnit/standardafvigelse) og **strain** (belastning × monotoni); de fleste sygdomstilfælde kom, når individuelle tærskler for strain blev overskredet. Grundlaget for at veksle hårdt og let.

**Lette uger (3:1, 2:1).**

- Sandbakk 2025 [læst]: "a regular incorporation of an easy training load week was applied every 3–4 weeks" i forberedelsen; "These easy weeks involve a reduction in training volume by 25–35%" ved 1–2 færre pas og kortere rolige ture; "Rhythmicity into hard and easy weeks is not applied during the competition period". En træner (Coach 8) kører høj belastning næsten hver uge med små justeringer ved rejser. "Overall, the concept of micro-periodization has gained limited attention in sport science literature."
- Jeg fandt **ingen** kontrollerede studier i udholdenhed af lette uger mod ingen, eller 3:1 mod 2:1 (Europe PMC: "recovery week", "regeneration week", "deload" + endurance). Den nærmeste evidens er fra styrkesport: Bell m.fl. 2023 (Delphi-konsensus, Sports Med Open 9:87, DOI 10.1186/s40798-023-00633-0, PMID 37730925) definerer deload som en periode med nedsat træningsstress; Rogerson m.fl. 2024 (survey, 246 atleter, Sports Med Open 10:26, DOI 10.1186/s40798-024-00691-y, PMID 38499934): deload hver 5,6 ± 2,3 uge, varer 6,4 ± 1,7 dage, udløst af stagnation, ømhed og ledsmerter [begge abstract]. Rønnestads blokdesign (5 HIT-pas, derefter tre uger med 1/uge) er i praksis 1:3, ikke 3:1.
- DCU's egne eksempeluger har 1–2 dage uden cykel om ugen og "opladning" dagen før løb, men ingen lette uger (dcu-traeningsanbefalinger.md afsnit 4).

**Lejre.**

- Tønnessen 2014 [læst]: guldvinderne holdt 4–6 højdelejre à 14–21 dage om året (1 800–2 000 m, træning 1 200–2 800 m), 60–100 dage i højden; lejrene skubbede intensiteten nedad.
- Sandbakk 2025 [læst]: 50–100 højdedage om året; lejre på 2–4 uger; i landevej "2–3 week blocks"; højdeblokke er mængde med lavere intensitet; blokke "were used much more dynamically than prescribed in most theoretical block periodization models". En landevejstræner (Coach 6) lægger "preparation training for 2-3 weeks also within the competition period".
- **Valenzuela m.fl. 2023** (U23-proffer, 6 dages lejr), J Int Soc Sports Nutr 20:2166366, DOI 10.1080/15502783.2023.2166366, PMID 36686220 [abstract]: 24 ryttere, 19 ± 1 år, VO2peak 79,8. Ugebelastning (kilden måler i TrainingPeaks' "training stress score") steg fra 659 ± 122 til 1 207 ± 122 (P < 0,001), dvs. 83 % (beregnet); træthed (Hooper) steg, kritisk effekt **faldt** (P = 0,002). En lejr er træthed, ikke form, mens den står på.
- **Wahl m.fl. 2021** (6 unge ryttere, 7 dages lejr), Medicina 57:673, DOI 10.3390/medicina57070673, PMID 34209610 [abstract]: CK, urinstof og selvvurdering fulgte belastningen; markørerne var normale to dage efter sidste pas; watt ved laktattærskel steg lidt, andet uændret.

**Højde.**

- **Lundby & Robach 2016**, Exp Physiol 101:783–788, DOI 10.1113/EP085579, PMID 27173805 [abstract]: evidensen for højdetræning hos eliteatleter er "weaker than often assumed".
- **Humberstone-Gough m.fl. 2013**, J Sports Sci Med 12:394–401, PMID 24149143 [abstract]: 24 landsholdstriatleter, 17 dages LHTL (240 timer hypoxi) gav Hb-masse +3,2 ± 4,8 % mod placebo; intermitterende hypoxi (10 timer) gav intet.
- **Kuorelahti m.fl. 2025**, Eur J Appl Physiol 125:2503–2514, DOI 10.1007/s00421-025-05762-w, PMID 40210726 [abstract]: 15 kvindelige eliteatleter, 21 dage, 18 t/dag ved simuleret 2 500 m: Hb-masse +3,3 ± 1,8 % (P < 0,001), **ingen** præstationsændring.
- **Torres-Pérez m.fl. 2026**, J Sports Med Phys Fitness 66:492–501, DOI 10.23736/S0022-4707.25.17347-7, PMID 41885723 [abstract]: LHTL i cykling, 6 af 34 studier inkluderet; samlet effekt på hæmoglobin 0,82 % (95 % CI 0,62–1,03); studier med lav PEDro viste små eller ingen gevinster.
- Bonetti & Hopkins' metaanalyse fra 2009 dukkede ikke op i min søgning; den er ikke læst.

### 4.3 Slutninger

- Reglen "højst 2–3 hårde dage, aldrig to i træk, og et løb tæller som en hård dag" er det, evidens og praksis er enige om. Den er vigtigere end nogen årsmodel og kan håndhæves som en vagt i et ugeudkast.
- Den lette uge hver 3.–4. uge er **praksis uden kontrolleret evidens**. Den bør være standard i forberedelsen (nov–mar), fordi den er billig og udbredt, men udløses af data (monotoni, strain, check-in), ikke af kalenderen alene, og udgå i sæsonen, hvor løbene giver rytmen.
- Lejre og højde: planlæg dem som mængdeblokke med lav intensitet og en let uge bagefter; forvent ikke form under lejren. For U17/U19 er højde ikke et spørgsmål, Kadence behøver at svare på.

### 4.4 Huller

- Ingen RCT af lette uger i udholdenhed. Ingen data om, hvor mange hårde pas en 15–16-årig tåler om ugen ud over trænerpraksis og DCU's eksempeluger.
- Tabel 6 (landevejstrænerens detaljer) i Tønnessen 2024 blev ikke fuldt læst.

---

## 5. Løbsugen og løb som træning

### 5.1 Kort svar

I landevej er løb den største kilde til hård tid: 50–80 løbsdage om året hos professionelle, en konkurrenceperiode på ca. otte måneder og "racing blocks" med rolig træning imellem. En etape i en Grand Tour er 217–329 belastningsenheder efter stagetype (kilden måler i TSS), og træthedsforholdene stiger uge for uge. Hos ungdomsryttere er 40 % af løbstiden over den respiratoriske kompensationstærskel i endagsløb; løb skal derfor tælles som hårde dage, og ugen planlægges rundt om dem.

### 5.2 Fund med kilder

- **Sandbakk 2025** [læst]: landevej har "a very long competition period (approximately eight months)" og "approximately 50–70 race days per year"; løb tæller som nøgle-intensive pas, "especially in road cycling"; nogle idrætter bruger løbsblokke med mest LIT imellem (skiskydning, landevej); atleter kan ikke holde top i måneder uden at træne op igen, derfor 2–3 ugers forberedelsestræning inde i sæsonen. Typiske ugetal for landevej (Table 4): forberedelse 7–10 pas, 20–24 t, 2–3 intensive pas på 2–3 dage, 90–150 min i zone 3; sæson 7–9 pas, 18–22 t.
- **Tønnessen 2024** [læst]: landevej 1 000–1 200 t, 300–350 pas, 50–80 løbsdage og 110–130 intensive dage om året (Table 1); de fleste pas 3–6 t; løb er "a considerable part" af Z3–Z5; uden for løb lægges det meste intensive arbejde ind i lange ture (stigninger, vind); løbsintensiteten afhænger af løbstype og rolle (kaptajn/hjælperytter, bjerg/sprint); de bedste undgår at overbruge all-out, også i løb, og lægger dem ikke tidligt på sæsonen.
- **Sanders & Heijboer 2019**, EJSS 19:736–744, DOI 10.1080/17461391.2018.1554706, PMID 30589390 [abstract]: 9 World Tour-ryttere, Giro 2016. Belastning højest på bjergetaper (TSS 329, TRIMP 359), semibjerg 280/311, flade 217/298; enkeltstart højest i intensitet; i fællesstart mest tid i lav intensitet.
- **Sanders m.fl. 2018**, J Sports Sci 36:1385–1391, DOI 10.1080/02640414.2017.1388669, PMID 29016241 [abstract]: 12 proffer over to Grand Tours; RPE:puls, RPE:watt og sRPE:TSS steg moderat til stort (d = 0,79–1,79) i forhold til baseline og uge for uge (d = 0,21–0,63), et tegn på akkumuleret træthed, som enkeltmål ikke fanger.
- **Metcalfe m.fl. 2017**, IJSPP 12(S2):S2142–S2146, DOI 10.1123/ijspp.2016-0396, PMID 27918669 [abstract]: 4 proffer, 12 måneder; okt–jan 240 t, feb–maj 338 t; løb 3,1 W/kg mod træning 2,5 W/kg i gennemsnit (P < 0,05).
- **Voet m.fl. 2024**, IJSPP 19:809–819, DOI 10.1123/ijspp.2023-0543, PMID 38871342 [abstract]: 16 semiprofessionelle; over sæsonen forbedredes "durability" (1-min effekt efter 38 kJ/kg) mere end frisk maksimaleffekt.
- **Ungdom og juniorer:** Rodríguez-Marroyo 2011 (traeningsparadigmer.md 4.3): 40,2 % af løbstiden over RCP i endagsløb, 15,2 % i etapeløb; ca. 47 løbsdage pr. sæson hos de spanske juniorer i samme note. UCI's grænser for juniorer (klasser-og-gearing.md): endagsløb højst 140 km (mænd) og 100 km (kvinder), etapeløb højst 100 km i snit og 120 km pr. etape; enkeltstart højst 30/15 km. Cycling Vlaanderen 50 løb for U17 og 60 for juniorer, Canadas LTAD 20–45 løb/år i Learn to Compete og 20–50 i Train to Compete (traeningsparadigmer.md 3.3 og 8.2). DCU's eksempeluger har ét løb om søndagen, restitutionstur efter og opladning dagen før; DCU sætter intet loft over løbsdage (dcu-traeningsanbefalinger.md).
- Ingen af kilderne angiver en anbefalet **afstand mellem løbsweekender for unge**; den eneste rettesnor er trænerpraksis (højst 2–3 hårde dage/uge, lette dage omkring løbet) og IOC's advarsel mod for hurtig stigning i konkurrencekrav i ungdommen (traeningsparadigmer.md 6).

### 5.3 Slutninger

- Et løb er en hård dag og tæller i ugens 2–3. Et endagsløb for U17/U19 bør tælle som en **HIT-dag** (40 % over RCP), en etape som en **MIT-dag**, og et etapeløb på 2–3 dage som en blok, der kræver 2–3 lette dage efter.
- To løbsweekender i træk er i sig selv inden for rammen (én hård dag pr. weekend), hvis ugen imellem højst har ét hårdt pas. Tre hårde dage i en weekend (etapeløb) bør udløse en let uge efter.
- Sæsonen bør for U19/U23 kunne rumme "forberedelsesblokke" på 2–3 uger midt i sæsonen (juni/juli), som de norske trænere gør, i stedet for at antage én lang formperiode.

### 5.4 Huller

- Ingen studie af løbsbelastning hos danske ungdomsryttere. Ingen anbefaling fra DCU eller Team Danmark om antal løbsdage eller afstand mellem løb.

---

## 6. Omvendt periodisering, polariseret-så-specifik, og hvad elitetrænere gør

### 6.1 Kort svar

Omvendt periodisering har ingen påvist fordel. "Pyramidal først, polariseret nærmere målet" har ét godt løbestudie (Filipas 2022) bag sig, og netværksmetaanalysen (Rosenblat 2025) finder ingen forskel mellem polariseret og pyramidal overordnet. Verdensklassetrænerne kører traditionel periodisering med stigende specificitet og bruger blokke pragmatisk. Hvad San Millán og Lorang gør, er kun kendt fra interviews og sekundære sider.

### 6.2 Fund med kilder

- **González-Ravé, González-Mohino, Rodrigo-Carranza & Pyne 2022**, "Reverse Periodization for Improving Sports Performance: A Systematic Review", Sports Med Open 8:56, DOI 10.1186/s40798-022-00445-8, PMID 35445953 [abstract]: 925 fundet, 11 inkluderet, 200 atleter, 2 RCT'er, PEDro 4,9 (0–7). Omvendt periodisering gav ingen større fremgang i svømning, løb, muskulær udholdenhed, maksimal styrke eller VO2max end traditionel eller blok.
- **Filipas, Bonato, Gallo & Codella 2022**, SJMSS 32:498–511, DOI 10.1111/sms.14101, PMID 34792817 [abstract]: 60 veltrænede løbere, 16 uger, fire grupper (PYR, POL, PYR→POL, POL→PYR), samme belastning. PYR→POL bedst: VO2peak ca. +3,0 %, v2mmol +1,7 %, v4mmol +1,5 %, 5 km +1,5 % (gruppe × tid p ≤ 0,0001).
- **Rosenblat m.fl. 2025** (med Seiler, Esteve-Lanao, Filipas, Stöggl, Sandbakk), Sports Med 55:655–673, DOI 10.1007/s40279-024-02149-3, PMID 39888556 [abstract]: 13 studier, 348 trænede atleter (296 mænd), individuelle data. POL mod PYR: VO2max SMD −0,06 (p = 0,68), tidskørsel SMD −0,05 (p = 0,34). Forskel efter niveau for VO2max (SMD −0,63, p < 0,05): POL kan passe konkurrenceatleter, PYR motionister.
- **Stöggl & Sperlich 2014**, Front Physiol 5:33, DOI 10.3389/fphys.2014.00033, PMID 24550842 [abstract]: 48 veltrænede, 9 uger; POL gav størst fremgang (VO2peak +11,7 %, tid til udmattelse +17,4 %); tærskel- og mængdetræning gav intet ekstra.
- **Esteve-Lanao, Foster, Seiler & Lucia 2007**, JSCR 21:943–949, DOI 10.1519/R-19725.1, PMID 17685689 [abstract]: 12 subelite løbere, ca. 5 måneder; 80/12/8 % slog 67/25/8 % i et 10,4-km løb (157 mod 121 s fremgang, p = 0,03).
- **Muñoz, Seiler, Alcocer, Carr & Esteve-Lanao 2015**, "Specific Intensity for Peaking: Is Race Pace the Best Option?", Asian J Sports Med 6:e24900, DOI 10.5812/asjsm.24900, PMID 26448854 [abstract]: 13 veltrænede løbere, 6 ugers formtopfase med samme belastning: korte HIT (ca. 105 % MAV) og løbsfart (ca. 90 % MAV) gav samme 10-km fremgang (35:29 → 34:53 og 35:27 → 34:53); HIT øgede VO2max men forværrede løbeøkonomi.
- **Seiler & Tønnessen 2009** [læst, del]: Guellich 2009: lavintensiv mængde blev ved med at dominere, men zone 2–3-arbejdet "shifted towards higher intensities from the basic preparation phase to the competition phase"; Zapico 2007: zone 3 firedobledes fra vinter til forår hos U23-ryttere uden yderligere fremgang i watt og VO2max; Schumacher & Mueller 2002: i de ca. 110 dage før en OL-finale (banefirer) kun 6 dage med HIT på banen.
- **Sandbakk 2025** [læst]: "Coaches in all analyzed sports reported that they use a traditional periodization model", og "neither of these periodization models have been scientifically verified"; blok og traditionel "kan kombineres".
- **Tønnessen 2014** [læst]: sportsspecifik andel steg fra 48 % (grundforberedelse) til 87 % (specifik) og 92 % (sæson); HIT blev mere polariseret i sæsonen.
- **Dan Lorang** (Head of Performance, Red Bull–Bora–hansgrohe fra 2017; fra 1. august 2026 Lidl-Trek ifølge siden; triatlontræner for bl.a. Frodeno og Haug) [web, sekundær]: planlægger "backwards from priority races", tilpasser perioder og nedtrapning til den enkelte, daglig afstemning frem for fast plan; om omvendt periodisering "is this athlete adapting, or just accumulating fatigue?". https://roadmancycling.com/experts/dan-lorang/periodisation (kilde: Roadman Cycling Podcast 21.4.2025). Opgavens "Jumbo-Visma" passer ikke; Lorang har ikke været hos Jumbo-Visma/Visma. Siden er en aggregeret trænerside, ikke en primær kilde.
- **Iñigo San Millán** (University of Colorado School of Medicine; Director of Performance, UAE Team Emirates; Pogačars træner til 2024) [søgning]: Fast Talk Labs-episoden om unge talenter er bag betalingsmur; GCN-interviewet gav 404; ITV-artiklen timede ud. Et forumreferat af et interview siger, at zone 2 "is not prescribed as much as what the media is making out" (ca. 6–7 t/uge) [søgning, må ikke bruges]. Jeg kan **ikke** dokumentere hans sæsonstruktur.
- **Mathieu Heijboer** (Visma–Lease a Bike) og British Cycling: ikke undersøgt; søgebudgettet var opbrugt.

### 6.3 Slutninger

- "Specificitet nærmere målet" er det eneste rækkefølgeprincip, der både har støtte i et kontrolleret studie (Filipas 2022), i observationsdata (Tønnessen 2014, Guellich 2009) og i trænerpraksis. DCU's rækkefølge (mængde → lange intervaller → korte formtopintervaller → sæson) følger det allerede (`src/modules/dcu/phases.ts`), og Sylta 2016 viste, at den omvendte rækkefølge ikke er dårligere.
- Omvendt periodisering bør ikke tilbydes som paradigme. En træner, der vil køre intervaller om vinteren og mængde om foråret, kan gøre det i en blok uden en "model".

### 6.4 Huller

- Ingen primære kilder for San Millán, Lorang eller Heijboer. Ingen offentlig britisk periodiseringsmodel fundet.

---

## 7. Rammer for udviklingsryttere (15–22 år)

### 7.1 Kort svar

Team Danmarks ATK 2.0 og de internationale LTAD-modeller giver principper (langsigtet udvikling frem for resultater, træning og konkurrence efter alderstrin, enkelt periodisering til Train to Compete), men ingen af dem angiver periodiseringsmodel, antal hårde pas eller lette uger med evidens. Dansk Atletiks program for 15–17-årige siger, at periodiseringen "primært" skal være læringsorienteret.

### 7.2 Fund med kilder

- **Team Danmark, ATK 2.0** (https://www.teamdanmark.dk/media/1667/atk-20_low.pdf): PDF'en er over 10 MB og kunne ikke hentes med mit værktøj i dag. Fra `docs/research/foraeldre-og-talentudvikling.md` og `traeningsparadigmer.md` afsnit 6: "Træning og konkurrence følger ATK", målet er seniorer i verdensklasse, ikke ungdomsmestre; ATK sætter ikke tal på timer; smertetrappe (−20–30 %, −50 % og ingen konkurrencer, pause); 8–9 timers søvn. Team Danmarks værdidokument: fokus på "talents' long-term sporting development rather than short-term results" [søgning].
- **Dansk Atletik, High Performance Program 2021–2028** (https://dansk-atletik.dk/media/gxvbkixr/high-performance-program-2021-2028.pdf) [søgning]: fase 1 er 15–17 år, fase 2 18–20 år; for 15–17 skal periodiseringen være "primært læringsorienteret, sekundært præstationsopbyggende", med kvalifikation og resultater fra generel teknisk og fysisk træning og mindre specifik højintens træning; generel lavintensiv grundtræning skal fylde for at undgå overbelastning. Ikke verificeret i fuld tekst.
- **DIF, "Træningsplanlægning – præstationsoptimering med periodisering"** (Karsten Jensen, 2013, https://www.dif.dk/media/51ljkpog/traeningsplanlaegning-praestationsoptimering-med-periodisering.pdf) [søgning]: dækker lineær, omvendt lineær, non-lineær og konjugeret periodisering. PDF'en blev hentet, men kunne ikke læses som tekst (ingen PDF-værktøj på maskinen). Den er den nærmeste danske lærebogskilde og bør læses af en person.
- **Cycling Canada LTAD** (traeningsparadigmer.md 3.3): "Enkeltperiodisering frem til Train to Compete"; 20–45 løb/år i Learn to Compete (15–18 år), 20–50 i Train to Compete (17–23 år). Fra 2008, uden evidens ud over Balyi.
- **Olympiatoppen** (traeningsparadigmer.md 3.6): efter puberteten 25–40 konkurrencer om året og "minst 80 %" udholdenhed; ingen periodiseringsmodel.
- **Sport for Life 3.0** (traeningsparadigmer.md 6): træning:konkurrence 60:40 i Train to Train, 40:60 i Train to Compete; kritiseret af Ford 2011 for "a lack of empirical evidence".
- **IOC-konsensus om unge, Bergeron 2015** (traeningsparadigmer.md 6): overbelastning opstår især ved "transitioning too rapidly to higher levels of training and competition demands during adolescence"; regelmæssig hvile; 8,5–9,5 timers søvn.
- **Juniorers træning i verdensklasse-langrend**, Front Physiol 2023, DOI 10.3389/fphys.2023.1288606, PMID 38054044 [abstract]: 17 senere verdensklasseløbere trænede som juniorer med fordelingen 91/3/6 % (LIT/MIT/HIT) og øgede 203 ± 130 t (35 %) fra junior til senior, mest i lav og moderat intensitet.

### 7.3 Slutninger

- For U17 og U19 er rammen: enkelt periodisering (én hovedformtop, i praksis sæsonen april–september), traditionel rækkefølge, højst 2 hårde dage om ugen inkl. løb for U17 og 2–3 for U19, ingen planlagte blokke med 5 hårde pas, ingen overreaching. Det er en syntese af trænerpraksis, de to nulfund hos juniorer og IOC's advarsel; det er **ikke** et tal fra en kilde.

### 7.4 Huller

- ATK 2.0 i fuld tekst. British Cycling. Et dansk tal for løbsdage.

---

## 8. Personer og kilder

| Person                                               | Tilhør                                                      | Står for                                                                                                              | Nøgleudgivelse                                                                                                                                                                                                 |
| ---------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lev P. Matveyev** (1924–2006)                      | Statsinstituttet for fysisk kultur, Moskva [sekundær]       | Den traditionelle/lineære periodisering: makrocyklus med forberedelse, konkurrence og overgang; mængde før intensitet | "Fundamentals of Sports Training", Progress Publishers 1981 (russisk 1977; periodiseringsbog 1964/65) [sekundær, ikke læst]                                                                                    |
| **Tudor O. Bompa** (f. 1932)                         | York University, Toronto                                    | Udbredte periodiseringen i Vesten; lærebøger for trænere og unge                                                      | "Periodization: Theory and Methodology of Training", 1. udg. 1994, 6 udgaver (den nyeste med Carlo Buzzichelli, ikke efterprøvet); https://en.wikipedia.org/wiki/Tudor_Bompa                                   |
| **Yuri Verkhoshansky**                               | Sovjetisk forsker                                           | Chokmetoden (plyometrik), koncentrerede belastninger, "Block Training System"                                         | https://www.verkhoshansky.com/ ; "Special Strength Training: Manual for Coaches" (med Natalia Verkhoshansky, 2011)                                                                                             |
| **Vladimir B. Issurin**                              | Wingate Institute, Israel [sekundær]                        | Blokperiodisering i to varianter; kritik af traditionel model                                                         | Issurin 2008, J Sports Med Phys Fitness 48:65–75, PMID 18212712; Issurin 2010, Sports Med 40:189–206, DOI 10.2165/11319770-000000000-00000; Issurin 2016, Sports Med 46:329–338, DOI 10.1007/s40279-015-0425-5 |
| **Anatoliy P. Bondarchuk** (1940–2025)               | Hammerkaster og træner, Kiev og Kamloops                    | Øvelsesklassifikation og periodisering efter den enkeltes adaptationscyklus                                           | "Transfer of Training in Sports", 2 bind (overs. Michael Yessis); https://en.wikipedia.org/wiki/Anatoliy_Bondarchuk                                                                                            |
| **Bent R. Rønnestad**                                | Høgskolen i Innlandet, Lillehammer                          | Blokperiodisering i cykling og langrend; de fleste blokstudier                                                        | Rønnestad m.fl. 2014, SJMSS 24:34–42, DOI 10.1111/j.1600-0838.2012.01485.x; 2014, SJMSS 24:327–335, DOI 10.1111/sms.12016; 2016, SJMSS 26:140–146, DOI 10.1111/sms.12418                                       |
| **Knut Sindre Mølmen**                               | Høgskolen i Innlandet                                       | Metaanalysen af blok                                                                                                  | Mølmen, Øfsteng & Rønnestad 2019, Open Access J Sports Med 10:145–160, DOI 10.2147/OAJSM.S180408                                                                                                               |
| **John Kiely**                                       | University of Central Lancashire, nu University of Limerick | Kritik af periodiseringens stressteoretiske grundlag; skelet + kontrolpunkter + monitorering                          | Kiely 2012, IJSPP 7:242–250, DOI 10.1123/ijspp.7.3.242; Kiely 2018, Sports Med 48:753–764, DOI 10.1007/s40279-017-0823-y (PMC5856877)                                                                          |
| **José Afonso**                                      | Universitetet i Porto                                       | Metodekritik: periodisering er aldrig testet mod varieret ikke-periodiseret træning                                   | Afonso m.fl. 2017, J Sports Sci Med 16:27–34, PMID 28344448; Afonso m.fl. 2019, Front Physiol 10:1023, DOI 10.3389/fphys.2019.01023                                                                            |
| **Laurent Bosquet**                                  | Université de Poitiers                                      | Metaanalysen af nedtrapning                                                                                           | Bosquet m.fl. 2007, MSSE 39:1358–1365, DOI 10.1249/mss.0b013e31806010e0                                                                                                                                        |
| **Iñigo Mujika**                                     | Universidad del País Vasco                                  | Nedtrapningens videnskab; intensitet holdes                                                                           | Mujika & Padilla 2003, MSSE 35:1182–1187, DOI 10.1249/01.MSS.0000074448.73931.11; Mujika 2010, SJMSS 20(S2):24–31                                                                                              |
| **David B. Pyne**                                    | University of Canberra                                      | Formtop: forskningens begrænsninger; omvendt periodisering                                                            | Pyne, Mujika & Reilly 2009, J Sports Sci 27:195–202; González-Ravé m.fl. 2022, Sports Med Open 8:56, DOI 10.1186/s40798-022-00445-8                                                                            |
| **Anaël Aubry, Yann Le Meur, Christophe Hausswirth** | INSEP, Paris                                                | Funktionel overreaching før nedtrapning skader mere end den gavner                                                    | Aubry m.fl. 2014, MSSE 46:1769–1777, DOI 10.1249/MSS.0000000000000301; Hausswirth 2014, MSSE 46:1036–1045                                                                                                      |
| **Stephen Seiler**                                   | Universitetet i Agder                                       | Polariseret/80-20, 1–3 hårde pas om ugen, "hard days hard, easy days easy"                                            | Seiler 2010, IJSPP 5:276–291, DOI 10.1123/ijspp.5.3.276; Seiler & Tønnessen 2009, Sportscience 13:32–53, https://www.sportsci.org/2009/ss.htm                                                                  |
| **Espen Tønnessen, Øyvind Sandbakk, Thomas Haugen**  | Olympiatoppen / Kristiania / NTNU og UiT                    | Norsk "best practice": traditionel periodisering, 2–3 nøgledage, lette uger 3–4, nedtrapning mindre end forskningen   | Tønnessen 2014, PLoS ONE 9:e101796; Tønnessen 2024, Sports Med 54:2935–2953, DOI 10.1007/s40279-024-02067-4; Sandbakk 2025, Sports Med Open 11:45, DOI 10.1186/s40798-025-00848-3                              |
| **Jacob Walther**                                    | TU Chemnitz / NTNU                                          | Dag-til-dag-periodisering; blok hos juniorer giver dårligere humør                                                    | Walther, Kocbach & Sandbakk 2025, EJSS 25:e12322, DOI 10.1002/ejsc.12322; Walther 2026 (se traeningsparadigmer.md)                                                                                             |
| **Jonathan Esteve-Lanao**                            | Universidad Europea de Madrid [sekundær]                    | Intensitetsfordeling og specificitet mod formtop                                                                      | Esteve-Lanao 2007, JSCR 21:943–949; Muñoz 2015, Asian J Sports Med 6:e24900, DOI 10.5812/asjsm.24900                                                                                                           |
| **Luca Filipas**                                     | Università degli Studi di Milano                            | Pyramidal → polariseret                                                                                               | Filipas 2022, SJMSS 32:498–511, DOI 10.1111/sms.14101                                                                                                                                                          |
| **Carl Foster**                                      | University of Wisconsin–La Crosse                           | Session-RPE, monotoni og strain                                                                                       | Foster 1998, MSSE 30:1164–1168, DOI 10.1097/00005768-199807000-00023                                                                                                                                           |
| **Dajo Sanders, Teun van Erp, Mathieu Heijboer**     | Maastricht / Visma–Lease a Bike                             | Løbsbelastning i Grand Tours og over sæsonen                                                                          | Sanders & Heijboer 2019, EJSS 19:736–744, DOI 10.1080/17461391.2018.1554706; Sanders 2018, J Sports Sci 36:1385–1391; van Erp 2020, IJSPP 15:534–540                                                           |
| **Carsten Lundby**                                   | Københavns Universitet / Høgskolen i Innlandet              | Højdetræningens evidens er svagere end antaget                                                                        | Lundby & Robach 2016, Exp Physiol 101:783–788, DOI 10.1113/EP085579                                                                                                                                            |
| **Dan Lorang**                                       | Red Bull–Bora–hansgrohe (2017–2026), Lidl-Trek              | Baglæns planlægning fra A-løb, daglig tilpasning                                                                      | Kun sekundært: https://roadmancycling.com/experts/dan-lorang/periodisation                                                                                                                                     |
| **Iñigo San Millán**                                 | University of Colorado; UAE Team Emirates                   | Zone 2 / laktatstyret træning                                                                                         | Ingen læst primærkilde                                                                                                                                                                                         |
| **Mladen Jovanović**                                 | Træner og ph.d., Beograd [sekundær]                         | "Agile periodization"                                                                                                 | "Strength Training Manual: The Agile Periodization Approach"; https://simplifaster.com/articles/agile-periodization-jovanovic-book-review/                                                                     |

Tilhørsforhold er taget fra forfatterlisterne, hvor artiklen er læst i fuld tekst (Kiely, Afonso, Tønnessen 2014, Walther 2025); de øvrige er efter hukommelse eller fra abstracts og bør ses efter, før de citeres.

Øvrige anvendte kilder: Galán-Rioja 2023 (IJSPP 18:112–122); Neary 2003 (Can J Appl Physiol 28:576–587); Thomas, Mujika & Busso 2008 (J Sports Sci 26:643–652); Hellard 2013 (J Sports Sci Med 12:668–678); Rosenblat 2025 (Sports Med 55:655–673, DOI 10.1007/s40279-024-02149-3); Stöggl & Sperlich 2014 (Front Physiol 5:33); Haugen 2022 (Sports Med Open 8:46); Humberstone-Gough 2013 (J Sports Sci Med 12:394–401); Kuorelahti 2025 (Eur J Appl Physiol 125:2503–2514); Torres-Pérez 2026 (J Sports Med Phys Fitness 66:492–501); Valenzuela 2023 (J Int Soc Sports Nutr 20:2166366); Wahl 2021 (Medicina 57:673); Metcalfe 2017 (IJSPP 12(S2)); Voet 2024 (IJSPP 19:809–819); Bell 2023 og Rogerson 2024 (Sports Med Open 9:87 og 10:26); Fleck 2011 (J Hum Kinet 29A:41–45); Zhang 2026 (Front Public Health 14); Afonso 2020 (Sports 8:110); trænerundersøgelsen 2023 (Sports Med Open 9, DOI 10.1186/s40798-023-00657-6); Montull 2022 (Sports Med Open 8, DOI 10.1186/s40798-022-00432-z); Front Physiol 2023 (DOI 10.3389/fphys.2023.1288606).

---

## 9. Hvad det betyder for Kadence

Kadence har allerede en sæsonramme (DCU's faser og timer, `src/modules/dcu/phases.ts`, ADR 0014/0015), fire tal mod sæsonplanen (ADR 0040), blokke med forhåndsvisning (ADR 0025), AI-ugeudkast for én rytter og for holdet (ADR 0017, 0043) og løbsugeregler i udkastet (ADR 0101). Forskningen ovenfor peger på, hvordan de skal hænge sammen i en egen træningsmodel.

### 9.1 Hvad der skal ligge fast (skelettet)

1. **Sæsonens faser og timekorridor.** DCU's rækkefølge (pause → mængde → lange intervaller → korte intervaller → sæson) er i tråd med "specificitet nærmere målet" og med de norske trænere. Den bliver ved med at være standardrammen; alternativer er blokke og trænerens egne mål (ADR 0040), ikke andre "modeller". Omvendt periodisering og undulerende periodisering tilbydes ikke.
2. **Løbene.** A-løb, etapeløb og lejre er faste punkter, som alt andet planlægges baglæns fra (Lorang, Kiely's "checkpoints"). Et løb tæller altid som en hård dag.
3. **Ugens rytmeregler**, håndhævet som guardrails i ethvert udkast (menneske eller AI):
   - højst **2 hårde dage/uge inkl. løb for U17**, **2–3 for U19 og U23**, 1–3 for voksne efter niveau (Seiler 1–3; Sandbakk 2–3; vores skøn for U17);
   - **aldrig to hårde dage i træk** uden for etapeløb (Tønnessen 2024, Walther 2025); et etapeløb efterfølges af mindst to lette dage;
   - en hård dag er intensitet × varighed; en lang tur med stigninger i zone 3 tæller med;
   - mindst én hviledag eller meget let dag hver 7.–9. dag (Walther 2025: hviledag hver 7,9–9,2 dag);
   - i forberedelsen (nov–mar) en **let uge hver 3.–4. uge** med 25–35 % mindre mængde og 1–2 færre pas, som standard uge 4 (3:1); i sæsonen ingen fast rytme, løbene styrer (Sandbakk 2025). Reglen mærkes i trænerguiden som praksis, ikke evidens.
4. **Nedtrapning før A-løb**: 7–10 dage for unge, 10–14 dage for voksne; samme antal pas, kortere ture, 1–2 korte hårde pas, det sidste gerne 2 døgn før (Tønnessen 2014, Sandbakk 2025, Bosquet 2007 som øvre grænse). Aldrig en planlagt overbelastningsblok umiddelbart før (Aubry 2014).
5. **Ingen blokperiodisering som standard for U17/U19.** Blokke med 5 hårde pas på en uge findes som trænerværktøj (ADR 0025) til U23 og voksne, med en obligatorisk let uge efter og en tekst om, at evidensen er lille og fra voksne. Walther 2026's humørfund nævnes i forhåndsvisningen for unge.

### 9.2 Hvad der skal være dynamisk (indholdet)

6. **AI'en laver udkast til den nærmeste uge, højst to,** i detaljer; sæsonen udkastes kun som faser, timer pr. måned og løb. Efter hver uge laves næste uge igen ud fra, hvad der faktisk blev kørt (Udført mod Planlagt, ADR 0040), check-in (søvn, humør, sygdom), monotoni og strain (Foster 1998) og trænerens ord. Det er Kielys skelet med kontrolpunkter i praksis.
7. **Den lette uge udløses af data, ikke kun af kalenderen.** Standarden er uge 4, men udkastet rykker den frem, når strain eller monotoni er høj, check-in falder, eller et etapeløb lige er kørt, og skubber den, når rytteren har haft en let uge af andre grunde (sygdom, eksamen, ferie). Udkastet siger hvorfor.
8. **Små, vedvarende ændringer frem for store.** Rampe-vagten (ADR 0025) beholdes; udkastet ændrer aldrig hele sæsonen på én dårlig uge. "Persistent change drives positive adaptation, but sudden change elevates injury risk" (Kiely 2018). Ved sygdom eller smerte følges ATK's trappe (−20–30 %, −50 % og ingen løb, pause), ikke en ny plan.
9. **Løbsugen planlægges omkring løbet:** opladning dagen før (DCU), let dag efter, resten af ugens hårde kvote efter løbsdagens type (endagsløb = HIT-dag, etape = MIT-dag). To løbsweekender i træk er fint med højst ét hårdt pas imellem; tre løbsdage på en weekend udløser en let uge.
10. **Lejre** planlægges som mængdeblokke med lav intensitet, en let uge efter og en forhåndsvisning, der siger, at form kommer efter lejren, ikke under den (Valenzuela 2023, Wahl 2021). Højde omtales for voksne som "svag evidens, 2–4 uger, ikke en standard"; for unge nævnes det ikke.
11. **Midtsæson-forberedelse for U19/U23.** Sæsonplanen skal kunne rumme 2–3 ugers "forberedelsesblok" i juni/juli med mere mængde og færre løb, som de norske landevejstrænere gør; det kræver, at sæsonen ikke antages at være én formperiode.
12. **Specificitet stiger mod målet.** Udkastet går fra lange intervaller i zone 3 om vinteren til kortere, løbsspecifikke pas de sidste 3–6 uger før A-løb (Tønnessen 2024: all-out kun der), og tilbage igen efter. Rækkefølgen kan vendes af træneren uden tab (Sylta 2016).

### 9.3 Hvordan AI'en skal tale om det

13. **Som forslag med begrundelse og usikkerhed.** "Jeg har lagt en let uge her, fordi de sidste tre uger steg, og check-in er faldet. Du kan flytte den." Aldrig "modellen kræver".
14. **Kadence's egne ord.** Skelet, nøgledag, let uge, nedtrapning, løbsblok, forberedelsesblok. TSS/CTL/ATL/TSB bruges ikke; Kadence's form-, friskheds- og trætheds-navne (ADR 0109) bruges, og monotoni og strain kan hedde "ensformighed" og "samlet pres", hvis de vises.
15. **Monitorering vægter check-in højt.** Subjektive mål integrerer bedre end objektive (Montull 2022, Kiely 2018); Kadence's daglige check-in er derfor en planvariabel, ikke pynt.

### 9.4 Hvad der skal efterprøves, før det kommer i kode

- Tallene for lette uger (25–35 %, hver 3.–4. uge) og nedtrapning (7–14 dage) stammer fra fuldtekster læst gennem et opsummerende værktøj; en person bør se dem efter i Sandbakk 2025 og Tønnessen 2014.
- Loftet på 2 hårde dage/uge for U17 er vores syntese, ikke et kildetal; DCU's eksempeluger (ét løb + ét intervalpas) stemmer med det.
- ATK 2.0 og DIF's periodiseringshæfte skal læses i fuld tekst, før Kadence citerer dem om periodisering for 15–22-årige.

---

## 10. Ikke verificeret eller ikke fundet

- Kiely 2012 og Kielys brev 2010 i fuld tekst (betalingsmur; ResearchGate afviste).
- Issurin 2008/2010/2016 i fuld tekst.
- Team Danmark ATK 2.0 (PDF over 10 MB) og DIF's hæfte (PDF, ingen tekstudtræk på maskinen).
- British Cycling, Mathieu Heijboer/Visma, San Milláns og Lorangs primære udsagn (søgebudget opbrugt / paywall / 404).
- Bonetti & Hopkins 2009 (højde-metaanalyse) og Bompa & Buzzichelli 2018 som bog.
- Et Rønnestad-blokstudie i cykelryttere fra 2016 findes efter min søgning ikke; 2016-studiet er i langrend.
- Ingen kontrollerede studier af lette uger (3:1/2:1) i udholdenhed, af nedtrapning hos ryttere under 18, eller af løbsafstand for unge.
