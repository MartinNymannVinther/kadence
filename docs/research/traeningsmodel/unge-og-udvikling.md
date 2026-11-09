# Unge og udvikling: hvordan unge udholdenhedsatleter udvikler sig, og hvad det betyder for Kadence

Researchnotat til Kadences egen træningsmodel. Læst 9. november 2026.

**Formål.** Samle den videnskab og de internationale rammer, som Team Danmarks ATK 2.0 og forbundenes udviklingstrapper hviler på: hvordan 12-23-årige (især 15-22-årige) udholdenhedsatleter modnes og reagerer på træning, hvad konsensuserklæringerne siger, hvor evidensen er solid, og hvor den er folklore. Sidst i notatet står, hvad det betyder for en AI, der foreslår træning til teenagere og giver feedback til dem, deres trænere og forældre.

**Hvad notatet bygger videre på.** `foraeldre-og-talentudvikling.md` beskriver ATK 2.0, Talenthuset og forældreguiden. `traeningsparadigmer.md` afsnit 3 og 6 har forbundsmodellerne med timetal (BDR, SCF, Cycling Canada, KNWU, NCF, Olympiatoppen) og Balyis LTD 3.0, afsnit 4.3 evidensen i juniorer (Guellich & Seiler 2010, Gallo 2022, Leo 2020, Svendsen 2018, Karlsson 2021, Staff 2023, Kong 2025), afsnit 5 styrke. Det gentages ikke her; der henvises.

**Metode og mærkning.** Som i de andre Kadence-notater: **[læst]** = fuld tekst læst (PDF hentet og læst, eller fuld webtekst), **[abstract]** = kun abstract eller bibliografisk post læst (via Europe PMC eller forlagets side), **[søgning]** = kun kendt fra søgeresultater og sekundære omtaler. Søgebudgettet for websøgning blev brugt op midtvejs, så den sidste tredjedel af kilderne er hentet direkte fra Europe PMC's REST-api og fra kendte URL'er. Flere fuldtekster (BJSM, SAGE, HAL) afviste automatisk hentning; de er mærket [abstract].

---

## 0. Kort svar

1. **De store udviklingsrammer er praksismodeller, ikke evidens.** Balyis LTAD med "vinduer for trænbarhed" er kritiseret for at mangle empirisk grundlag af dem, der har efterprøvet den (Ford m.fl. 2011; Van Hooren & De Ste Croix 2020). Côtés DMSP er den bedst underbyggede af rammerne, og den handler om specialiseringstidspunkt og leg, ikke om træningsdoser. FTEM afviser bevidst faste aldre og træningsforskrifter. IOC's konsensus 2015 giver principper og rækværk, ikke timer.
2. **Modning er den vigtigste enkeltfaktor i alderen 12-16, og den kan måles billigt.** Vækstspurten (PHV) ligger i snit ved 13,5 år hos drenge og 11,5 år hos piger, med flere års spredning. Omkring PHV er skadesrisikoen målbart højere, og præstationen i løb og spring udvikler sig hurtigst. Biologisk alder kan skønnes fra højde, siddehøjde og vægt (maturity offset) eller fra procent af forventet voksenhøjde, begge med kendte fejl.
3. **Den relative alderseffekt findes i cykling på ungdoms- og U23-niveau og forsvinder blandt dem, der når professionelt niveau.** Dvs. udvælgelse ved 15-20 år favoriserer dem, der er født tidligt på året, uden at det siger noget om, hvem der bliver god.
4. **Aerob kapacitet kan trænes hele vejen gennem barndom og ungdom.** Gevinsten i peak VO2 er mindre end hos voksne (5-6 % i snit, 8-10 % i studier med effekt), kræver intensitet over ca. 80 % af maxpuls, og der er ikke belæg for et særligt "vindue" ved PHV. HIIT virker hos unge atleter, men ikke bedre end anden træning per effektstørrelse.
5. **Det, der kendetegner senere verdensklasse, er det modsatte af det, der kendetegner gode juniorer.** Meta-analyser (Barth, Güllich, Macnamara & Hambrick 2022; Güllich & Barth 2024) viser, at voksne verdensklasseatleter startede senere i hovedsporten, trænede mindre i den som børn, dyrkede mere anden sport og kom senere ind i talentprogrammer end nationalklasseatleter. De bedste juniorer viser det omvendte mønster. Juniorresultater forudsiger seniorresultater dårligt.
6. **Mængden hos senere verdensklasseudholdenhedsatleter vokser med 35-50 % fra junior til senior**, næsten udelukkende ved lav og moderat intensitet; den høje intensitet stiger ikke (Walther m.fl. 2023; Karlsson 2021). Det passer med Svendsen 2018 og Leo 2022 i cykling.
7. **Tidlig specialisering er forbundet med flere overbelastningsskader, udbrændthed og frafald** uden påviselig gevinst for senere succes, undtagen i få sportsgrene med tidlig toppræstation (gymnastik, kunstskøjteløb, udspring). Rækværk fra konsensus: timer om ugen i organiseret sport højst lig alder i år, og over 16 timer om ugen kræver tæt opsyn.
8. **Styrketræning for unge er sikkert under kvalificeret vejledning**, og den hæmmer ikke væksten. I unge cykelryttere forbedrer tung styrke 45-minutters præstation (Aagaard 2011), men styrke adskiller ikke niveauer (Alejo 2022; Valenzuela 2023). Tung styrke er et valg, ikke et must, før 18 år.
9. **Sundhed:** 8-10 timers søvn for 13-18-årige (AASM), 8,5-9,5 i IOC's formulering; under 8 timer fordobler næsten skadesrisikoen i ét studie. Sekundær amenoré er rapporteret hos op til 56 % af kvindelige cykelryttere på tværs af studier, den højeste andel af alle sportsgrene i et rapid review. Menstruationen er et "vitalt tegn": ingen menstruation ved 15 år eller tre udeblevne cyklusser kræver lægelig vurdering.
10. **For Kadence:** AI'en skal kende biologisk alder (ikke kun klasse), tælle timer mod alder, skrue ned omkring vækstspurten, aldrig bygge planer på "vinduer", aldrig rangordne juniorer som fremtidsprognoser, og sige højt, at mere anden sport og senere specialisering er forenelig med at blive rigtig god.

---

## 1. Udviklingsrammerne

### 1.1 Balyis LTAD og kritikken af den

**Modellen.** Istvan Balyi (Canada) og Ann Hamilton beskrev i 2004 "Long-Term Athlete Development" med faser (FUNdamentals, Learning to Train, Training to Train, Training to Compete, Training to Win) og "windows of opportunity", hvor bestemte egenskaber skulle være særligt trænbare: udholdenhed omkring PHV, styrke lige efter PHV (drenge) eller ved menarche (piger), hurtighed i to vinduer (7-9 år og 11-13 år piger / 13-15 år drenge) [læst, via Ford 2011]. Sport for Lifes nyeste udgave, LTD 3.0 (2019), er beskrevet i paradigmenotatet afsnit 6.

**Kritikken.** Ford, De Ste Croix, Lloyd, Meyers, Moosavi, Oliver, Till & Williams 2011, J Sports Sci 29:389-402 [læst]:

- Abstract: "the model is only one-dimensional, there is a lack of empirical evidence upon which the model is based, and interpretations of the model are restricted because the data on which it is based rely on questionable assumptions and erroneous methodologies."
- Om udholdenhed: forfatterne finder modstridende fund om, hvornår aerob fitness er mest trænbar (Weber 1976: nedsat følsomhed midt i PHV; Rowland 1985: størst gevinst før PHV, 10,1 % hos drenge og 8,8 % hos piger). "Thus it would appear that there are discrepancies in the literature in terms of when these actual 'windows' occur." De peger på, at evidensen er tværsnitsstudier, at træningsstimulus sjældent er målt, og at genetik og træningsmængde sjældent er rapporteret. Konklusion: "until more comprehensive consistent evidence is available, it is inappropriate to state that young participants should only train aerobic fitness during prescribed 'windows of opportunity'. Aerobic fitness should be actively developed throughout childhood and adolescence."
- Om hurtighed: "research examining the trainability of speed during childhood is sparse." Gevinster omkring PHV kan skyldes længere ben ("an entity that is clearly not trainable") eller en korrektion af den midlertidige forringelse før PHV. "Adolescent awkwardness" (teknik, der svinger i vækstspurten) kaldes et fænomen, hvis "timing and magnitude ... is still unknown".
- Om styrke og power: uden longitudinelle data for modning og power "the existence of any 'windows of opportunity' remains unclear".

Van Hooren & De Ste Croix 2020, Strength Cond J 42(6):7-14 [læst, accepteret manuskript]:

- Formålet er en "critical appraisal" af de generiske følsomme perioder i LTAD-modeller. De skelner mellem _følsomme_ perioder (træning udenfor giver mindre effekt) og _kritiske_ perioder (træning udenfor giver ingen effekt) og bemærker, at "LTAD models often refer to sensitive periods, while some practitioners have interpreted these as critical periods."
- "Scientific evidence for the sensitive periods is however not provided in the first model from 2005", og evidensen i 2013-udgaven hviler på tværsnit og svage interventionsstudier. Tidligere reviews' råd om ikke at bygge på vinduer "were ignored in the recent update" af modellen, og mange forbund bruger dem stadig (canadisk roning 2012, hollandsk tennis 2016).
- Hovedargumentet er teoretisk: "general motor abilities" (smidighed, hurtighed, koordination, udholdenhed, styrke) findes ikke som adskilte latente størrelser; korrelationerne mellem forskellige styrke- eller hurtighedsmål er lave, så "if sensitive periods exist, they are therefore likely largely task-specific".
- Konklusion: "Athlete development models and practitioners should therefore not rely on generic sensitive periods to train youth athletes."

Oliver & Lloyd (UKSCA, 2012) "Long-term athlete development and trainability during childhood" [læst]: Rumpf m.fl.'s review af 15 studier fandt, at børn før PHV fik mest ud af plyometrisk og sprinttræning, børn omkring PHV af plyometri og styrke, børn efter PHV af kombineret træning. Det "partly support and partly refute the theory of windows of opportunity": hurtighed er trænbar hele barndommen, men _typen_ af træning, der virker bedst, følger modningen. De tilføjer, at modningsbundne gevinster hurtigt tabes ved træningspause, hvilket "questions the need to maximise gains within a specific window. Instead, it is more likely that training history needs to be continually accumulated".

Bailey & Collins 2013, Kinesiology Review 2(4):248-259 [abstract]: artikulerer en "Standard Model of Talent Development" (pyramiden med tidlig identifikation og frasortering), som "has been influential in policy and practice", men hvis appel er "illusory", som "conflicts with emerging research evidence", og hvor det mest udbredte talentidentifikationssystem er "unsubstantiated from both a process and an outcome perspective".

**Vurdering.** Vinduerne er den mest udbredte påstand i ungdomstræning og den dårligst underbyggede. Cycling Canadas LTAD og KNWU's faser bygger på dem (paradigmenotatet 3.3-3.4). ATK 2.0 citerer selv Ford 2011 (se 1.6) og bruger ikke vinduer. En AI for Kadence skal ikke bruge "vindue" som begrundelse for noget.

### 1.2 Côtés Developmental Model of Sport Participation (DMSP)

Jean Côté (Queen's University, Canada) med Baker & Abernethy 2007 og Côté, Lidor & Hackfort 2009. Oversigtsartikel: Côté & Vierimaa 2014, Science & Sports 29:S63-S69 [abstract]: modellen "has been comprehensively researched and refined over the last 15 years", og Côté m.fl. 2009 formulerede syv postulater, "five focused on the influence of sampling and deliberate play on youth's participation, performance, and personal development in sport, and two focused on important transitions". Artiklen graderer evidensen for hvert postulat.

Faserne, som ATK 2.0 gengiver dem efter Côté 2007 [læst, ATK 2.0 s. 26-28]:

- **Prøveår** ("sampling", ca. 8-12 år): flere sportsgrene, overvægt af selvorganiseret, legende træning (deliberate play).
- **Specialiseringsår** (ca. 13-16 år): 1-2 sportsgrene, mere bevidst målrettet træning.
- **Investeringsår** (fra ca. 16 år): én sport, hovedparten målrettet sportsspecifik træning.
- Tre udviklingsveje: "sportsdeltagelse som motionist", "elite via tidlig specialisering" og "elite via afprøvning". ATK konkluderer: "Tidlig afprøvning af flere sportsgrene / sen specialisering er ingen hindring for at nå eliteniveau" og "betyder ofte en længere karriere".
- Deliberate play vs. deliberate practice (ATK's tabel 1 efter Côté): leg er "træning for aktivitetens egen skyld", med fleksible regler, uden voksne, med mere tid "med bolden"; målrettet træning har eksplicitte regler, voksne, instruktion og fokus på resultatet.

Søgeresultater placerer grænserne lidt forskelligt (6-12/13, 13-15, 15/16+) og bemærker, at aldersgrænserne "were normatively set rather than empirically determined" [søgning].

**Vurdering.** DMSP er den ramme, der har mest empiri bag sig (Côté & Vierimaa graderer den selv), og den er bekræftet af Güllich/Barth-meta-analyserne (afsnit 3.4). Den siger intet om timer eller intensitet. For Kadences aldersgruppe (U17+) er vi i investeringsårene; modellens råd her er, at valget om én sport bør være rytterens eget, og at anden sport i vinteren ikke er spildtid.

### 1.3 Gulbins FTEM

Jason Gulbin, Morag Croser, Elissa Morley & Juanita Weissensteiner (Australian Institute of Sport) 2013, J Sports Sci 31(12):1319-1331 [abstract]: Foundations, Talent, Elite, Mastery med ti faser, som "avoids fixed chronological age or training prescriptions" og forbinder motion og eliteidræt i én ramme; "a viable and more flexible alternative". MacNamara & Collins 2013 kritiserede generaliserbarheden og manglen på psyko-adfærdsmæssige faktorer; Gulbin m.fl. svarede i 2014 ("A closer look at the FTEM framework") [søgning]. Swiss Cycling og AusCycling bygger på FTEM uden mængder (paradigmenotatet 3.7).

**Vurdering.** FTEM er en klassifikation af, hvor en atlet er i systemet, ikke en træningsmodel. Dens eneste konsekvens for Kadence er den sunde: ingen træningsdoser ud fra kronologisk alder alene.

### 1.4 IOC's konsensus om unge atleter 2015 og 2024

Bergeron, Mountjoy, Armstrong, Chia, Côté, Emery, Faigenbaum, Hall, Kriemler, Léglise, Malina, Pensgaard, Sanchez, Soligard, Sundgot-Borgen, van Mechelen, Weissensteiner & Engebretsen 2015, BJSM 49:843-851 [læst]. Ud over det, paradigmenotatet citerer (undgå tidlig specialisering, overbelastning ved for hurtig overgang, regelmæssig hvile, søvn, ingen træning med smerter):

- **Modning:** maturity offset "is most useful close to the time of actual age at PHV in average (on time) maturing boys" og overvurderer alder ved PHV mere hos piger. Fra 12 til 17 år stiger peak VO2 "by ∼70% and ∼25%" hos drenge hhv. piger, drevet af modning (vores læsning af afsnittet om fysiologi). Kønsforskellen i styrke når ca. 50 % i sen pubertet.
- **Søvn:** "a recommended optimal level of sleep of 8.5–9.5 h", med "preliminary evidence indicating an increased likelihood of injury with insufficient sleep", og anbefaling om at tilpasse trænings- og evt. skoleskemaer.
- **Specialisering:** "youth should avoid early sport specialisation, as diverse athletic exposure and sport sampling enhance motor development and athletic capacity, reduce injury risk and increase the opportunity for a child to discover the sport(s) that he/she will enjoy".
- **Skader:** overbelastning er "notably pervasive with youth athletes transitioning too rapidly to higher levels of training and competition demands during adolescence". Vækst "may predispose some youth athletes to specific injuries involving the immature spine (eg, spondylolysis), joint surfaces (osteochondritis dissecans) and traction apophysitis (eg, Osgood-Schlatter disease, Sever's disease)".
- **Anbefalinger (uddrag):** "Encourage regular participation in varied strength and conditioning programmes that are suitably age based"; programmer med "diversity and variability of athletic exposure, to mitigate the risk of overuse injuries ... that exceed safe load thresholds, while providing sufficient and regular rest and recovery"; "Strictly adhere to a 'No youth athlete should compete—or train or practice in a way that loads the affected injured area ... when in pain'"; kost med vægt på calcium, D-vitamin og jern; advarsel mod kosttilskud og energidrikke; uddannelse i varmesygdom og skriftlig beredskabsplan; "Diversification and variability of athletic exposure between and within sports should be encouraged and promoted."

Bergeron m.fl. 2024, "IOC consensus statement on elite youth athletes competing at the Olympic Games: essentials to a healthy, safe and sustainable paradigm", BJSM 58(17):946-965 [abstract]: gennemgår udfordringer for eliteungdomsatleter, herunder "non-linear physical, psychological, and social development", og foreslår en "child-centred" model med retningslinjer. Den er rettet mod OL-deltagere under 18 og er ikke en opdatering af 2015-erklæringens generelle råd. Ingen 2025-opdatering fundet.

### 1.5 Norge: Idrettens barnerettigheter og Bestemmelser om barneidrett

Norges idrettsforbund, vedtaget af Idrettstinget 2007, revideret 2015 og 2019 [læst]. De første retningslinjer kom i 1976, bestemmelserne i 1987. Rettighederne bygger på FN's børnekonvention og gælder børn "til og med det året de fyller 12 år". De otte rettigheder: trygghet, vennskap og trivsel, mestring, påvirkning, frihet til å velge ("Barn har rett til å velge hvilken idrett, eller hvor mange idretter de vil delta i. De bestemmer selv hvor mye de vil trene."), konkurranser for alle ("Barn har rett til å velge om de vil delta i konkurranser eller ikke"), på barnas premisser ("tilpasset deres alder, fysiske utvikling og modningsnivå") og alle skal få være med på leken. Bestemmelserne: lokale konkurrencer fra det år barnet fylder 6, regionale fra 9, åbne fra 11; "Det kan benyttes resultatlister, tabeller og rangeringer i konkurranser for barn fra det året de fyller 11 år"; ingen NM, EM eller VM til og med det år barnet fylder 12; "Alle barn skal få premie i et idrettsarrangement dersom premiering skjer." NIF kalder dem "unike i verdenssammenheng".

**Vurdering.** Reglerne gælder til 12 år og rammer derfor ikke Kadences brugere direkte. De er alligevel relevante som Nordens tydeligste udtryk for princippet om, at rangering og mesterskaber udskydes, og at barnet selv bestemmer træningsmængden; det samme princip ligger bag ATK's advarsel mod ranglister under 15 år. Olympiatoppens udviklingsfilosofi (200-400 timer før puberteten, +50 timer om året, mindst 80 % udholdenhed efter puberteten, 25-40 konkurrencer) er beskrevet i paradigmenotatet 3.6.

### 1.6 Hvad Team Danmarks ATK 2.0 bygger på

ATK 2.0 digital (366 sider) blev gennemsøgt for referencer [læst]:

- **Côté** citeres ni gange (Côté 2007, Côté 2009, Lidor, Côté & Hackfort 2009) og er grundlaget for ATK's afsnit om "sen specialisering og selvorganiseret legende træning" med DMSP gengivet som figur 4 og tabel 1.
- **Ericsson** citeres 16 gange, og ATK tager eksplicit afstand fra de to teser, hans forskning "endnu ikke har kunnet påvise": at fremtidige eksperter skiller sig ud i træningsmængde allerede som helt unge, og at bevidst målrettet træning er alle andre aktiviteter overlegen i ung alder. ATK: "det er ikke påvist i sporten, at det behøver være fra en tidlig alder".
- **Malina** citeres 23 gange (vækst og modning), **Lloyd** 12 gange (Lloyd m.fl. 2015, Lloyd & Faigenbaum) og **Bergeron m.fl. 2015** syv gange. **Ford m.fl. 2011** citeres i afsnittet om kropssammensætning. **Barnsley & Thompson 1988** og **Musch & Grondin 2001** bærer afsnittet om relativ alderseffekt.
- **Balyi, LTAD, Gulbin, FTEM og Olympiatoppen** nævnes ikke én gang. Ordene "trænbarhed" og "vinduer" forekommer ikke.
- Team Danmarks ATK-side (teamdanmark.dk/talent/atk) oplyser, at ATK blev udgivet digitalt i 2024, og at en "revitalisering af ATK" begyndte i 2024; siden nævner ingen forfattere eller internationale modeller [læst, web].

**Vurdering.** ATK 2.0 er i sit fundament en Côté-model med Malina-fysiologi og IOC-konsensus, ikke en Balyi-model. Det er godt nyt for Kadence: der er ingen konflikt mellem at følge ATK og at afvise vinduerne.

### 1.7 Youth Physical Development og NSCA's LTAD-holdning

Rhodri Lloyd & Jon Oliver 2012, "The Youth Physical Development model", Strength Cond J 34(3):61-72: alle fysiske egenskaber er trænbare hele vejen gennem barndom og ungdom; modellen erstatter vinduer med vægtning efter modning [kun citat verificeret i paradigmenotatet; fuldtekst ikke hentet]. Lloyd m.fl. 2015, JSCR 29:1439-1450 og 1451-1464 (LTAD part 1 og 2) [abstract]: kritisk gennemgang af udviklingsmodellerne og en samlet model, der integrerer talent, psykosocial og fysisk udvikling på tværs af modning, samt barrierer (konkurrencestrukturer i ungdomsidræt, inaktivitet). Lloyd m.fl. 2016, NSCA position statement on LTAD, JSCR 30:1491-1509 [abstract]: ti søjler, "all youth be treated as athletes", holistisk og børnecentreret. Till m.fl. 2022, PLoS One [abstract]: 236 praktikere kendte modellerne og fulgte sundhedsprincipperne, men "adherence was lower for growth and maturity, monitoring, and progression".

### 1.8 Huller i afsnit 1

- Fuldteksten af Côté & Vierimaa 2014 (postulaterne med evidensgrad) og Bailey & Collins 2013 kunne ikke hentes.
- Balyi & Hamilton 2004 er kun læst gennem Ford 2011 og paradigmenotatets LTD 3.0.

---

## 2. Modning: biologisk alder, vækstspurt og relativ alder

### 2.1 Kort svar

Kronologisk alder er et dårligt mål for, hvor en 12-16-årig er. Biologisk alder kan skønnes uden røntgen med en fejl på omkring et halvt år tæt på PHV og større fejl hos tidligt og sent modne. Omkring PHV stiger overbelastningsskader markant. Den relative alderseffekt er påvist i cykling frem til U23 og forsvinder blandt dem, der bliver professionelle.

### 2.2 Fund

**Vækstspurt og puberteten.**

- PHV ligger "at about 11.5 years in girls and 13.5 years in boys" (Ayoub m.fl. 2025, review af 27 studier i ungdomsfodbold) [læst, web]. ATK 2.0: menarche i snit 13,4 år (11-16), vækst 10-15 cm om året i spurten, voksenhøjde omkring 16 år (piger) og 18 år (drenge), muskelmasse +0,6 % om året før puberteten og ca. +29 % om året i puberteten hos drenge (Malina 1986, Ford 2011) [læst].
- Tønnessen, Svendsen, Olsen, Guttormsen & Haugen 2015, PLoS ONE, norsk atletikdatabase, 1.373 drenge og 1.149 piger, 6.400 resultater fra 11 til 18 år [læst, web]: den årlige fremgang topper ved 12-13 år (løb) og 13-14 år (spring) hos drenge og falder derefter mod 18 år; hos piger falder den relative fremgang støt. Samlet fremgang 11-18 år: 60 m 18 % (drenge) mod 11 % (piger), 800 m 23 % mod 15 %. "The sex difference evolves from < 5% to 10-18% in all the analyzed disciplines from age 11 to 18 yr." Forfatterne advarer om, at tidligt modne er overrepræsenteret i de yngre årgange, så tallene "might overestimate individual annual performance development". Studiet undersøger ikke, om junior forudsiger senior.

**At måle biologisk alder.**

- _Maturity offset_ (Mirwald, Baxter-Jones, Bailey & Beunen 2002, MSSE) [abstract]: forudsiger år fra PHV ud fra alder, højde, siddehøjde, benlængde og vægt; udviklet på 152 canadiske børn (8-16 år), R² 0,92 (drenge) og 0,91 (piger), standardfejl 0,49 og 0,50 år. Forfatterne anbefaler at bruge det "as a category rather than a continuous measure".
- Cumming, Lloyd, Oliver, Eisenmann & Malina 2017, "Bio-banding in sport", Strength Cond J [læst]: "The accuracy and reliability of the method has been questioned". Hos tidligt modne forudsiges PHV for sent, hos sent modne for tidligt; "practitioners using the maturity offset method should interpret their findings with caution". Det alternative mål er _procent af forventet voksenhøjde_ (Khamis-Roche): under 85 % præpubertal, 85-90 % tidlig pubertet, 90-95 % midt i puberteten, over 95 % sen pubertet. "PHV occurs at approximately 91–92% of adult stature, with the linear growth spurt lasting approximately 24–26 months (i.e., ±1 year from PHV)"; spurten begynder ved ca. 88-89 % og er ovre ved 95-96 %.
- Malina, Cumming, Rogol, Coelho-e-Silva, Figueiredo, Konarski & Kozieł 2019, "Bio-banding in youth sports", Sports Med 49:1671-1685 [abstract]: "Bio-banding reduces, but does not eliminate, maturity-associated variation"; fodboldforsøg gav "positive responses from players and coaches"; "The potential utility of bio-banding for appropriate training loads, injury prevention, and fitness assessment merits closer attention, specifically during the interval of pubertal growth"; "The currently used height prediction equation requires further evaluation."
- IOC 2015 [læst]: maturity offset er mest brugbart nær PHV hos drenge med gennemsnitlig modning, og protokollen "overestimates age at PHV more than in boys" hos piger.

**Skader omkring vækstspurten.**

- Ayoub m.fl. 2025, Int J Environ Res Public Health 22:1388 [læst, web]: PHV var "the most consistent risk factor"; syv studier fandt signifikant højere forekomst af overbelastningsskader omkring PHV. Johnson m.fl. 2020: 24,5 skader pr. 1.000 timer omkring PHV mod 11,5 før PHV. Van der Sluis 2014: 15,7 tabte dage om året i PHV-året mod 7,3 året før. Spillere med over dobbelt så meget organiseret sport som fri leg havde ca. 35 % højere skadesrisiko (Frome 2019). Sever (hælapofysit) ca. 0,36 tilfælde pr. 100 atleter om året med ca. 61 dages fravær. Anbefalinger: identificér spillere i PHV-vinduet og begræns de mest belastende aktiviteter "until they pass PHV"; målebånd er "an inexpensive and accessible way to screen for fast growth"; neuromuskulær opvarmning og belastningsstyring "showed promise". Evidensen er observationel, 16 af 27 studier med moderat bias-risiko; fodbold, ikke cykling.
- IOC 2015 om apofysitter og vækstzoner: se 1.4.
- Et systematisk review af Osgood-Schlatter (Gymnasium 2024, 12 studier, 4.814 deltagere) blev kun set i søgning [søgning]. Ingen cykelspecifik forekomst fundet.

**Den relative alderseffekt (RAE) i cykling.**

- Voet, Lamberts, de Koning & van Erp 2022, J Sports Sci 40(19):2159-2165 [abstract]: 2.854 ryttere på Continental-hold 2005-2016 fra de 25 bedste PCS-lande. Blandt dem, der _ikke_ blev professionelle, var der en RAE, drevet af U23 år 1 og 2: "for cyclists at 19 and 20 years old, there is a selection bias towards relatively older (Q1) cyclists". Blandt dem, der nåede professionelt niveau, "no RAE was found"; "the RAE diminishes at professional level".
- Gallo, Mostaert, Faelli, Ruggeri, Delbarba, Codella, Vansteenkiste & Filipas 2022, IJSPP 17(4):621-626 [abstract]: 1.345 italienske ryttere (43 professionelle, 1.302 ikke-professionelle) i U17, U19 og U23. "PRO outperformed NON-PRO in all the youth categories considered"; ældre ryttere i årgangen var hverken bedre eller overrepræsenteret blandt professionelle; pointenes forudsigelsesværdi vokser fra U17 til U23, og "Handling the transition to a new age group well (especially the U19-U23 transition)" fremhæves.
- Et studie af 307 italienske ryttere fandt RAE kun i U15, forsvindende i ældre klasser [søgning]. Fillipas m.fl. 2024 om italienske professionelles udviklingsbaner kunne ikke hentes (403).
- ATK 2.0 [læst]: "En udviklingsmodel baseret på en konkurrencedrevet selektion i en tidlig alder (<15 år) vil altid favorisere udøvere, der er tidligt udviklet." Forspring "på op til 12 måneder". "Ranglister har f.eks. vist sig at føre til overdrevet konkurrencedeltagelse i en tidlig alder." Kilderne er Barnsley & Thompson 1988 (NHL: ca. fire gange så mange født i 1. som i 4. kvartal) og Musch & Grondin 2001.

### 2.3 Vurdering

- Evidensen for _at_ modning styrer både præstation og skadesrisiko i 12-16-årsalderen er solid og konsistent på tværs af sportsgrene. Evidensen for, _hvordan_ man bedst justerer træning omkring PHV, er svag (observationel, fodbold, ingen RCT'er) og består af fornuftige råd: identificér, dæmp, forebyg.
- Bio-banding er afprøvet i fodbold og positivt modtaget, men der findes ingen cykelstudier. I cykling, hvor der ikke er kropskontakt, er den vigtigste anvendelse ikke konkurrence, men belastningsstyring og retfærdig udvælgelse.
- RAE i cykling: de to kilder er enige om, at effekten er en _udvælgelsesbias_ i ungdoms- og U23-årene, der ikke afspejler senere niveau. Gallo 2022 fandt ingen RAE i italienske ranglister fra U17, Voet fandt den i udvælgelsen til Continental-hold ved 19-20 år. Begge er retrospektive.

### 2.4 Huller

- Ingen cykelspecifikke tal for apofysitter eller skader omkring PHV.
- Ingen valideringsstudier af maturity offset eller Khamis-Roche i cykelryttere.
- Fillipas 2024 (403) og det italienske 307-rytter-studie (kun søgning) mangler.

---

## 3. Træning af unge udholdenhedsatleter

### 3.1 Kort svar

Aerob kapacitet er trænbar hos unge, men med mindre gevinst end hos voksne, og den kræver intensitet. Høj intensitet (HIIT) virker hos unge atleter, men er ikke overlegen i effektstørrelse. Det, der udvikler sig fra junior til verdensklasse, er mængden ved lav og moderat intensitet, ikke mængden af høj intensitet. Tidlig succes og tidlig specialisering forudsiger juniorsucces og det modsatte af seniorsucces.

### 3.2 Trænbarhed af aerob kapacitet og økonomi

- Baquet, Van Praagh & Berthoin 2003, Sports Med 33(15):1127-1143 [abstract]: 51 studier gennemgået, 22 opfyldte kriterierne. "aerobic training leads to a mean improvement of 5-6% in the peak VO2 of children or adolescents", 8-10 % i studier med signifikant effekt. Intensitet over 80 % af maxpuls "appeared necessary for a significant gain". Data for unge omkring puberteten, især piger, er sparsomme, og metodiske forskelle kan skævvride estimatet. Kilden kalder sig et review med pooled effekter, ikke en formel meta-analyse.
- Armstrong & McNarry 2016, "Aerobic fitness and trainability in healthy youth: gaps in our knowledge", Pediatr Exerc Sci 28:171-177 [abstract]: peak VO2's "interpretation and trainability remain disputed"; unges aktivitet er intermitterende, så VO2-kinetikken kan beskrive fitness bedre end peak VO2; "most trainability findings come from comparisons of trained and untrained youth". Armstrong & Barker 2011 ("Endurance training and elite young athletes", Med Sport Sci 56:59-83) er et bogkapitel, kun set i søgning [søgning].
- IOC 2015 [læst]: peak VO2 stiger ca. 70 % (drenge) og 25 % (piger) fra 12 til 17 år med modning som den dominerende faktor; det betyder, at træningseffekter hos 13-16-årige er svære at skille fra vækst, og at absolutte watt-fremskridt hos en 15-årig dreng mest er modning.
- Ford 2011 [læst]: ingen entydig periode med særlig aerob trænbarhed (se 1.1).

### 3.3 HIIT hos unge

- Engel, Ackermann, Chtourou & Sperlich 2018, Front Physiol 9:1012 [læst, web]: 24 studier, 577 unge atleter, 9-18 år (snit 15,5 ± 2,2), mest fodbold; interventioner i snit 7,5 uger, 2,5 HIIT-pas om ugen, pas på 28 ± 15 min mod 38 ± 24 min i kontrol. Effekt på VO2peak Hedges' g = 0,10 (HIIT 7,2 % mod kontrol 4,3 %); på tærskelpræstation g = 0,97 med meget stor spredning. "HIIT did not show clear superiority to the alternative training protocols"; HIIT "requires less time per training session". Ingen af studierne havde en inaktiv kontrolgruppe, så vækst kan ikke skilles fra træning; piger næsten fraværende.
- Costigan m.fl. 2015, BJSM 49:1253-1261 [abstract]: 13-18-årige (ikke atleter), interventioner på mindst 4 uger; HIIT gav "a large improvement in cardiorespiratory fitness" og mellemstor på kropssammensætning.
- Et nyere review (35 studier, 988 trænede unge, SMD 0,65 for VO2max mod ikke-HIIT-kontrol) blev kun set i søgning uden forfatter [søgning]; skal verificeres, før det bruges.
- Kong m.fl. 2025 (roere 14-16 år, tærskel mod polariseret, ingen forskel) står i paradigmenotatet 4.3.

### 3.4 Hvordan mængde og intensitet udvikler sig hos dem, der bliver rigtig gode

- Walther, Haugen, Solli, Tønnessen & Sandbakk 2023, "From juniors to seniors: changes in training characteristics and aerobic power in 17 world-class cross-country skiers", Front Physiol 14:1288606 [læst, web]: 10 mænd og 7 kvinder med 38 OL-medaljer tilsammen; bedste juniorsæson (19,9 ± 0,3 år) mod bedste seniorsæson (28,4 ± 2,7 år). Årlig mængde 658 ± 107 t → 861 ± 74 t (+35 %); pas 441 → 519. Lav intensitet 530 → 716 t, moderat 20 → 34 t, høj intensitet 34 → 32,5 t (uændret). Fordeling 91/3/6 % → 92/4/4 %. VO2max hos mænd 77,3 → 81,6 ml/kg/min (+6 %), kvinder 66,9 → 71,3 (+6,7 %). Juniormængden korrelerede ikke med seniormængden (r = 0,01), men negativt med _stigningen_ (r = −0,82): de, der trænede mest som juniorer, øgede mindst. Retrospektiv, selvrapporteret, lille stikprøve.
- Karlsson 2021 (langrend, 470 → 730 t fra 16 til 22 år, næsten alt lav intensitet), Svendsen 2018 (WorldTour-ryttere havde flere løbstimer og højere aerob effekt som 18-årige, ikke mere træning), Leo 2022 og Staff 2023 ("built upon limited scientific evidence") står i paradigmenotatet 4.3.
- Alejo m.fl. 2022, Front Physiol 13:945552 [abstract]: 13 juniorer (16,4 år), 24 U23 (19,2 år) og 14 professionelle (26,1 år). U23 og professionelle lå signifikant over juniorer i tidskørsel, VO2max, peak power og tærskler; U23 og professionelle adskilte sig i tidskørsel, peak power og VT1, men ikke i VO2max; professionelle havde lavere fedtprocent og mere muskelmasse; "No consistent differences in strength or power were found between age categories."
- Mateo-March m.fl. 2025, IJSPP 20(12):1739-1744 [abstract]: 46 mandlige juniorer over en sæson; internationalt niveau (n = 20) havde højere kritisk effekt (383 mod 341 W), højere maksimal aerob effekt (434 mod 391 W) og mindre fald i effekt efter arbejde over kritisk effekt ved 5-30 min, mens nationalt niveau faldt mindre ved 1 min. Interindividuel variation 36 %. Forfatterne foreslår "durability" som talentmarkør.
- "The talent trap" (Sandbakk 2023): ingen kilde med den titel eller formulering fundet. Det nærmeste er Staff, Solli, Osborne & Sandbakk 2023 (scoping review, paradigmenotatet) og Walther 2023 ovenfor. Begrebet kan være fra et foredrag eller en norsk tekst ("talentfellen") og skal ikke citeres som artikel.

### 3.5 Tidlig succes, tidlig specialisering og senere niveau (Güllich og kolleger)

- Barth, Güllich, Macnamara & Hambrick 2022, "Predictors of junior versus senior elite performance are opposite: a systematic review and meta-analysis of participation patterns", Sports Med 52:1399-1416 [abstract]: 71 studierapporter, 262 stikprøver, 685 effektstørrelser, 9.241 atleter. Voksne verdensklasseatleter mod nationalklasse: mere trænerledet praksis i _andre_ sportsgrene i barndom og ungdom, senere start i hovedsporten, mindre hovedsportstræning og langsommere tidlig fremgang, d = 0,23-0,50, alle p < 0,001. Højt præsterende juniorer: tidligere start, mere hovedsportstræning, mindre anden sport, hurtigere fremgang, d = 0,23-0,61. "Main-sport or other-sports peer-led play had negligible effects." GRADE: lav kvalitet for leg, moderat til høj for resten. Robust på tværs af sportstyper.
- Güllich, Macnamara & Hambrick 2022, "What makes a champion? Early multidisciplinary practice, not early specialization, predicts world-class performance", Perspect Psychol Sci 17(1):6-29 [abstract/søgning]: 51 studierapporter, 477 effektstørrelser, 6.096 atleter, 772 af verdens bedste. Samme mønster; parallel til nobelpristagere mod nationale prismodtagere. "variable, multidisciplinary practice experiences are associated with gradual initial discipline-specific progress but greater sustainability of long-term development of excellence."
- Güllich & Barth 2024, "Effects of early talent promotion on junior and senior performance", Sports Med 54(3):697-710 [læst, web]: 51 effektstørrelser fra 29 rapporter, 6.233 atleter (82 % mænd), ni lande. Alder ved optagelse i talentprogram (forbundstrup, akademi): juniorer d = −0,53 (de bedste kom tidligere ind), seniorer d = +0,56 (de bedste kom _senere_ ind). Gælder både forbundstrupper (−0,64/+0,57) og akademier (−0,42/+0,53), individuelle idrætter og holdidrætter. Høj studiekvalitet, lav bias, ingen publikationsbias. Korrelationelt; mest mænd, olympiske idrætter, vestlige lande.
- En 2023-opfølgning fra samme gruppe om olympiske idrætter fandt, at juniorpræstation har "very little, if any, predictive value for senior performance" [søgning].
- Jayanthi m.fl. 2013 (afsnit 4) og Côté (afsnit 1.2) peger samme vej. Cyklingens eget bidrag er Gallo 2022 (professionelle lå højere end andre _også_ i U17, men RAE forsvandt, og U19-U23-overgangen er det afgørende) og Svendsen 2018.

### 3.6 Vurdering

- Solidt: aerob trænbarhed hele vejen, intensitetskrav over ca. 80 % maxpuls for målbar gevinst, mængdevækst via lav intensitet fra junior til senior, de "modsatte" prædiktorer for junior- og seniorniveau.
- Svagt: alt, der handler om _optimal_ dosering for 15-18-årige. Der findes ingen RCT'er af intensitetsfordeling i juniorlandevejsryttere (paradigmenotatet 4.3) og ingen longitudinelle studier, der følger cykelryttere fra 15 til 25 med træningsdata.
- Spændingen: Gallo 2022 viser, at fremtidige professionelle _var_ bedre som U17; Güllich/Barth viser, at de bedste juniorer typisk _ikke_ bliver de bedste seniorer. Begge kan være sande: man kan være god som ung uden at være den bedste, og de, der topper som juniorer, har ofte købt det med tidlig specialisering. For Kadence betyder det: ranglister i U17/U19 er svage prognoser, ikke nul information.

### 3.7 Huller

- Ingen cykelspecifik longitudinel kohorte 15-25 år.
- Baquets fuldtekst (HAL afviste hentning) og Armstrong & Barker 2011 ikke læst.
- "Talent trap" ikke identificeret som publikation.

---

## 4. Tidlig specialisering, udbrændthed og frafald

### 4.1 Kort svar

Konsensus fra pædiatri og idrætsmedicin siden 2013: udskyd ensidig specialisering til sen pubertet (15-16 år), hold timer i organiseret sport under alderen i år, vær på vagt over 16 timer om ugen, og lad unge dyrke anden sport. Udbrændthed er et syndrom, ikke træthed, og drives af entrapment, perfektionisme og miljø. Frafaldstal for cykling blev ikke fundet.

### 4.2 Fund

- Jayanthi, Pinkham, Dugas, Patrick & LaBella 2013, Sports Health 5(3):251-257 [abstract]: litteratur 1990-2011; "no evidence that intense training and specialization before puberty are necessary to achieve elite status" i de fleste sportsgrene; risici: flere skader, mere psykisk stress, frafald; en vis specialisering er nødvendig, men intens ensidig træning bør vente til sen ungdom. Jayanthi m.fl. 2015 (timer > alder giver OR 2,07 for alvorlig overbelastningsskade) står i paradigmenotatet 4.3.
- Brenner & AAP Council on Sports Medicine and Fitness 2016, "Sports specialization and intensive training in young athletes", Pediatrics 138(3):e20162148 [abstract]: tidlig specialisering "can cause physical and psychological harm"; intens træning har risici uanset specialisering. Sekundær omtale: udskyd specialisering til 15-16 år og vær opmærksom over 16 timer om ugen [søgning].
- LaPrade m.fl. 2016, AOSSM Early Sport Specialization Consensus Statement, OJSM 4(4) [læst]: tidlig specialisering defineres ved tre kriterier: "1. Participation in intensive training and/or competition in organized sports greater than 8 months per year (essentially year round) 2. Participation in 1 sport to the exclusion of participation in other sports (limited free play overall) 3. Involving prepubertal (seventh grade or roughly age 12 years) children." Hovedfund: "there is no evidence that young children will benefit from early sport specialization in the majority of sports", de "are subject to overuse injury and burnout", og "Early multisport participation will not deter young athletes from long-term competitive athletic success." Undtagelser: sportsgrene med tidlig toppræstation (gymnastik, kunstskøjteløb, udspring). Anbefalinger: "Children who participate in more hours per week than their age, for more than 16 hours per week in intense training, and who are specialized in sport activities should be closely monitored for indicators of burnout, overuse injury, or potential decrements in performance due to overtraining"; alle unge gavnes af periodiseret styrke- og neuromuskulær træning (INT); et amerikansk tenniseksempel: under 12 timer organiseret tennis om ugen, under 12 turneringer om året, 2+ timers skadesforebyggelse om ugen, og gerne en anden sport med off-season for tennis.
- IOC 2015 [læst]: se 1.4; udbrændthed og frafald nævnes som konsekvens af "intensified and expanded physical training and increased competition volume and frequency with insufficient allocation of time for rest and recovery".
- Gustafsson, DeFreese & Madigan 2017, "Athlete burnout: review and recommendations", Curr Opin Psychol 16:109-113 [abstract]: over 100 publikationer; reviewet gennemgår modeller, måling, symptomer, forløbere og konsekvenser "with a focus on social perceptions and perfectionism" og forebyggelse. De tre dimensioner (følelsesmæssig og fysisk udmattelse, reduceret oplevelse af at lykkes, devaluering af sporten) og modellerne (Smiths stressmodel, Coakleys identitetsmodel, Raedekes commitment/entrapment, selvbestemmelsesteori) kendes fra feltet, men fuldteksten blev ikke læst; brug dem med forbehold.
- Zhang m.fl. 2024, "Why do students drop out of regular sport in late adolescent?", Front Public Health 12:1416558 [abstract]: 11 studier under 25 år; beskyttende faktorer var oplevet kompetence, glæde, tilfredshed, familie- og kammeratstøtte; "Heavy training demands, limited skill learning, and competitiveness were linked to higher dropout"; alle inkluderede studier var tværsnit.
- Crane & Temple 2015 (systematisk review af frafald fra organiseret ungdomsidræt) kunne ikke hentes (403) og findes ikke i Europe PMC.
- ATK 2.0 og forældreguiden: frafaldet er størst i 13-16-årsalderen og igen i ungdomsuddannelsen på grund af krydspres; mistrivsel er den vigtigste grund til, at talenter stopper (forældrenotatet).

### 4.3 Vurdering

- Det er bemærkelsesværdigt, hvor enige pædiatri (AAP), ortopædi (AOSSM), idrætsmedicin (AMSSM, IOC) og udviklingsforskningen (Côté, Güllich) er, og hvor spinkel RCT-evidensen alligevel er. Konsensus hviler på tværsnit og retrospektive sammenligninger. Det ændrer ikke anbefalingen, men det ændrer tonen: Kadence skal formulere det som "det, man ved, peger på", ikke som en lov.
- For U17-ryttere (15-16 år) er specialiseringsspørgsmålet mest relevant om vinteren: anden sport (langrend, løb, svømning, holdsport, styrke) er fuldt forenelig med DCU's mængder og tæller som træning.

### 4.4 Huller

- **Ingen frafaldstal for cykling fundet.** En titelsøgning i Europe PMC på cykling og dropout/attrition gav nul relevante studier. DCU's licenstal pr. årgang ville være den eneste danske kilde (ikke undersøgt her).
- Gustafsson 2017 og Crane & Temple 2015 kun [abstract]/ikke hentet.

---

## 5. Styrketræning for unge

### 5.1 Kort svar

Styrketræning er sikkert og gavnligt for børn og unge under kvalificeret vejledning og hæmmer ikke væksten. Hvilken type der virker bedst, skifter med modning (neuralt før PHV, muskulært efter). I unge cykelryttere forbedrer tung styrke lang præstation uden at ændre VO2max, men styrke adskiller ikke niveauer i cykling. Hvornår tung styrke skal begynde, er et paradigmevalg (paradigmenotatet afsnit 5).

### 5.2 Fund

- Lloyd, Faigenbaum, Stone, Oliver, Jeffreys, Moody, Brewer, Pierce, McCambridge, Howard, Herrington, Hainline, Micheli, Jaques, Kraemer, McBride, Best, Chu, Alvar & Myer 2014, "Position statement on youth resistance training: the 2014 International Consensus", BJSM 48(7):498-505 [abstract]: tilpasset fra UKSCA's holdning og "reviewed and endorsed by leading sports medicine, exercise science and paediatric organisations" (herunder American Academy of Pediatrics ifølge søgning). Abstractet rummer ingen tal. De konkrete anbefalinger om sæt, gentagelser og progression kendes fra feltet, men fuldteksten afviste hentning (403), så de er **ikke verificeret her** og bør læses, før de bruges i produktet.
- Lloyd m.fl. 2016, NSCA LTAD position statement [abstract]: se 1.7.
- ATK 2.0 [læst, s. 57-58]: "Styrketræning for børn er ikke farligt, styrketræning for børn nedsætter ikke deres vækst, styrketræning for børn skader ikke knoglerne, styrketræning giver ikke for høje belastninger, og styrketræning for børn er ikke usundt!" (Faigenbaum 2009; Lloyd 2015). Piger udvikler styrke lineært til udvokset, drenge accelererer efter puberteten; kønsforskel ca. 50 % i sen pubertet (Bergeron 2015).
- Oliver & Lloyd 2012 (UKSCA) [læst]: Rumpf-reviewets fund om, at træningstypen bør følge modningen (plyometri/sprint før PHV, plyometri/styrke omkring PHV, kombineret efter PHV); gevinster tabes hurtigt ved pause.
- IOC 2015 [læst]: "trainability of muscle strength increases with age", og det er "unclear which maturational changes account for the enhanced strength trainability of boys".
- Aagaard m.fl. 2011, Scand J Med Sci Sports [abstract]: 14 unge eliteryttere (ATK og paradigmenotatet omtaler dem som danske landsholdsjuniorer; alder står ikke i abstractet), 16 uger kombineret styrke og udholdenhed mod udholdenhed alene. Maksimal styrke og RFD +12-20 % i kombinationsgruppen; VO2max uændret; 5-minutters præstation +3-4 % i begge grupper; 45-minutters præstation +8 % kun i kombinationsgruppen; flere type IIA- og færre IIX-fibre.
- Vicari m.fl. 2026, Br Med Bull 157(1) [abstract]: 19 unge off-road-ryttere, 12 uger, to ugentlige styrkepas i gym (A) eller på cyklen (B); kun gym-gruppen forbedrede 30-sekunders Wingate-effekt (p = 0,002) og maksimal effekt (p < 0,001); ingen ændring i hop. Lille og skæv stikprøve.
- Alejo 2022 [abstract] og Valenzuela 2023 (paradigmenotatet): styrke og power adskiller ikke juniorer, U23 og professionelle, og de forudsagde ikke, hvem der blev professionel.

### 5.3 Vurdering

- Sikkerheden er ikke kontroversiel. Nytten for cykelpræstation hos unge er påvist i ét lille RCT (Aagaard) på lang varighed. At styrke ikke adskiller niveauer, betyder ikke, at den er ligegyldig (alle kan have nok), men at den ikke er den knap, der afgør udviklingen.
- Paradigmerne er uenige om, hvornår _tung_ styrke skal ind (DCU: 6-8 RM fra U17; NCF: fokus fra 18 år for at prioritere det aerobe). Evidensen afgør det ikke. Kadence bør lade det være et valg og altid kræve kvalificeret vejledning i teksten.

### 5.4 Huller

- Lloyd 2014's konkrete doseringsråd ikke verificeret i fuldtekst.
- Ingen studier af styrketræning i 15-16-årige cykelryttere specifikt (Aagaards alder ukendt fra abstract).

---

## 6. Unge atleters sundhed: det, en planlægger skal vide

### 6.1 Kort svar

Søvn 8-10 timer, energi nok til vækst, menstruation som vitalt tegn, ingen træning med smerter eller hjernerystelse, varme kan håndteres med forberedelse. Ernæringsnotatet dækker RED-S i dybden; her kun det aldersspecifikke.

### 6.2 Fund

**Energi og RED-S (kort).**

- Desbrow 2021, "Youth athlete development and nutrition", Sports Med 51(Suppl 1):S3-S12 [abstract + søgning]: 13-18 år er vækst og dannelse af livslange spisevaner; kammerater bliver "increasingly powerful moderators of all behaviours, including eating"; lav energitilgængelighed "may lead to a number of serious health consequences" (forsinket pubertet, menstruationsforstyrrelser, knogler, højde, forstyrret spisning, skader); anbefaler vægtstabilitet frem for vægttab, og at kropssammensætning "is rarely needed, and should only be performed by a trained professional" med samtykke fra atlet og værge.
- IOC 2015 [læst]: kost med vægt på calcium, D-vitamin og jern; advarsel mod kosttilskud og energidrikke; "Emphasise and mitigate the risks of sport-related EDs, DE and RED-S". IOC REDs 2023 (Mountjoy) står i paradigmenotatet 6.

**Søvn.**

- Paruthi m.fl. 2016, AASM consensus statement, J Clin Sleep Med 12(11) [abstract]: 864 artikler, RAND-metode; 6-12 år 9-12 timer, **13-18 år 8-10 timer** pr. døgn. For lidt søvn er forbundet med opmærksomheds-, adfærds- og indlæringsproblemer, ulykker, skader, hypertension, fedme, diabetes og depression, og hos teenagere med selvskade og selvmordstanker.
- IOC 2015 [læst]: 8,5-9,5 timer; sene sengetider i puberteten; skolestart, skærm og koffein som årsager; træning og konkurrence "further exacerbates the deficiency".
- Milewski m.fl. 2014, J Pediatr Orthop 34(2):129-133 [abstract]: 112 elever (12-18 år, snit 15); under 8 timers søvn gav 1,7 gange så høj skadessandsynlighed (95 % CI 1,0-3,0; p = 0,04); hvert klassetrin op 1,4 gange. Level III.
- Team Danmark (8-9 timer, forældreguiden 8-10 for 14-17-årige) står i forældrenotatet.

**Skole og dual career.** ATK og Talenthuset (forældrenotatet): prioriteten skal kunne flyttes mellem skole og sport, træneren skruer ned i eksamensperioder. Ingen ny evidens søgt her.

**Varme og kulde.**

- AAP Council on Sports Medicine and Fitness & Council on School Health 2011, "Climatic heat stress and exercising children and adolescents", Pediatrics 128:e741 [abstract]: nyere forskning afviser, at unge har dårligere temperaturregulering end voksne, når de er hydrerede; risikofaktorerne er væskemangel, overdreven anstrengelse, for lidt restitution mellem pas og tøj/udstyr, der holder på varmen; "exertional heat illness is usually preventable".
- IOC 2015 [læst]: med "progressive heat acclimatisation, ample hydration, appropriate work-to-rest ratios" er varmesygdom "usually preventable"; krav om skriftlig beredskabsplan.
- Kulde: ingen ungdomsspecifik kilde fundet i denne omgang. Det, Kadence har brug for (påklædning, forfrysninger, astma i kulde), er voksenviden.

**Hjernerystelse.**

- Patricios m.fl. 2023, "Consensus statement on concussion in sport: the 6th International Conference on Concussion in Sport, Amsterdam, October 2022", BJSM 57(11):695-711 [abstract]: 10 systematiske reviews; reviderede værktøjer CRT6, SCAT6 og **Child SCAT6** (til 8-12 år; SCAT6 fra 13 år), nye kontorværktøjer SCOAT6/Child SCOAT6; principper for forebyggelse, vurdering og håndtering. For en planlægger: en styrtet rytter med mistanke om hjernerystelse skal ud af træning samme dag og tilbage trinvist efter en lægeligt styret protokol; Kadence skal kunne markere "hjernerystelse" og afvise at foreslå belastning i perioden.

**Menstruation og den kvindelige unge atlet.**

- ACOG Committee Opinion 651, 2015, "Menstruation in girls and adolescents: using the menstrual cycle as a vital sign", Obstet Gynecol 126(6):e143-e146 [abstract]: median menarche 12-13 år i velnærede befolkninger; klinikere bør forklare, hvad der er normalt, og "assess the menstrual cycle as an additional vital sign". Standardreglerne i opinionen (vurdér, hvis ingen menarche ved 15 år, eller hvis cyklus er under 21 eller over 45 dage, eller 90 dage uden blødning) er kendt praksis, men fuldteksten blev ikke læst; ATK's tre røde flag (ingen menstruation ved 16, tre udeblevne cyklusser, under 9 om året) står i forældrenotatet.
- Gimunová m.fl. 2022, IJERPH 19:14243 [abstract]: rapid review af 48 studier; sekundær amenoré var hyppigst i **cykling (56 %)**, triatlon (40 %) og rytmisk gymnastik (31 %); oligomenoré i boksning (55 %) og gymnastik; primær amenoré i rytmisk gymnastik (25 %), fodbold (20 %) og svømning (19 %). Spænd 0-61 % på tværs af studier. Tallet for cykling er et pooled estimat fra få studier og skal læses som "højt", ikke som præcist.
- Ravi m.fl. 2021, Scand J Med Sci Sports 31(2) [abstract]: finske atleter fulgt fra 14-16 til 18-20 år; primær amenoré hos 4,7 % af atleterne mod 0 % af ikke-atleter; menstruationsforstyrrelse i ung voksenalder hos 38,7 % af atleter mod 5,6 %; forstyrrelse i ungdommen var den eneste prædiktor for forstyrrelse senere.
- von Rosen m.fl. 2017, Int J Adolesc Med Health [abstract]: 298 piger på svenske idrætsgymnasier; 32,6 % brugte p-piller; blandt de øvrige havde 31,8 % uregelmæssig menstruation, oftere udholdenhedsatleter og med lavere BMI.
- Calcaterra m.fl. 2024, "Menstrual dysfunction in adolescent female athletes", Sports 12(9):245 [abstract]: narrativt review; faktorer er høj træningsbelastning, tidlig konkurrencestart, lav energiindtagelse, lavt BMI, forstyrret spisning og psykisk stress; anbefaler tidlig opsporing og samarbejde mellem sport og sundhedsvæsen.
- Elliott-Sale m.fl. 2021, Sports Med 51:843-861 [abstract]: metodologisk guide; de fleste data i idrætsvidenskab kommer fra mænd, der mangler enighed om terminologi og metoder; dækker menstruationscyklus, hormonel prævention, graviditet og overgangsalder. McNulty 2020 (trivial effekt af cyklusfase på præstation, lav evidenskvalitet, "personalised approach") står i paradigmenotatet 6.
- Taim m.fl. 2024 (Singapore, elite-teenagere: oplevet påvirkning af præstation og barrierer for at tale om det) og Meyers 2025 (dårligere søvn og mere stress hos unge atleter med menstruationsforstyrrelse) blev set som titler [søgning].

### 6.3 Vurdering

- Søvnanbefalingen (8-10 t) er den bedst underbyggede enkeltanbefaling i hele notatet og den letteste at bygge ind.
- Menstruationsdata i cykling er alarmerende høje, men hviler på få, gamle og små studier. Det rigtige produktsvar er ikke at skræmme, men at gøre registrering frivillig og privat og lade mønstre udløse rådet "tal med en læge" (forældrenotatet 3.5).
- Cyklusbaseret periodisering har ingen evidens hos unge og skal ikke tilbydes.

### 6.4 Huller

- Ingen ungdomsspecifik kilde om kulde.
- ACOG's præcise grænser og Child SCAT6's aldersgrænser er [abstract]/kendt praksis, ikke læst i fuldtekst her.

---

## 7. Forbund uden for paradigmenotatet

Ikke undersøgt yderligere i denne omgang (søgebudgettet var brugt). Paradigmenotatet 3.7 dækker British Cycling (to hviledage om ugen, ingen timetal), USA Cycling/USOPC ADM (ingen tal), AusCycling (60-70 % → 80 % i hoveddisciplinen), Swiss Cycling (FTEM, ingen mængder) og Cycling Vlaanderen (højst 45 løb U13-U15, 50 løb U17, 60 løb junior). De generelle rækværk fra konsensus kan supplere: timer om ugen ≤ alder i år (Jayanthi 2015; LaPrade 2016), tæt opsyn over 16 timer om ugen (AAP/AOSSM), to hviledage om ugen for 12-14-årige (British Cycling).

---

## 8. Hvad er solidt, hvad er folklore

| Påstand                                                                                    | Status                                                                               | Kilder                                                                              |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| "Vinduer for trænbarhed" ved PHV, hvor man skal træne udholdenhed, ellers tabes potentiale | **Folklore.** Ingen empirisk støtte; modstridende fund; teoretisk uholdbar           | Ford 2011 [læst]; Van Hooren & De Ste Croix 2020 [læst]; Oliver & Lloyd 2012 [læst] |
| Aerob kapacitet kan trænes hos unge                                                        | Solidt, men gevinsten er mindre end hos voksne og kræver >80 % maxpuls               | Baquet 2003 [abstract]; Armstrong & McNarry 2016 [abstract]                         |
| HIIT er særligt effektivt for unge                                                         | Delvist. Virker, men ikke bedre end alternativer per effektstørrelse; tidsbesparende | Engel 2018 [læst, web]; Costigan 2015 [abstract]                                    |
| Omkring PHV stiger skadesrisikoen                                                          | Solidt (observationelt, fodbold)                                                     | Ayoub 2025 [læst, web]; IOC 2015 [læst]                                             |
| Biologisk alder kan skønnes uden røntgen                                                   | Ja, med kendte fejl; brug kategorier, ikke decimaler                                 | Mirwald 2002 [abstract]; Cumming 2017 [læst]; Malina 2019 [abstract]                |
| Relativ alderseffekt findes i cykling                                                      | Ja, i ungdom og U23-udvælgelse; væk blandt professionelle                            | Voet 2022 [abstract]; Gallo 2022 [abstract]                                         |
| Gode juniorer bliver gode seniorer                                                         | **Svagt.** Prædiktorerne er modsatte; juniorresultater forudsiger dårligt            | Barth 2022 [abstract]; Güllich & Barth 2024 [læst, web]; Gallo 2022 (nuancerer)     |
| Tidlig specialisering er nødvendig for eliten                                              | **Folklore** i cykling og de fleste sportsgrene                                      | Jayanthi 2013 [abstract]; LaPrade 2016 [læst]; Güllich 2022 [abstract]              |
| Mængden skal vokse jævnt mod senior, mest ved lav intensitet                               | Solidt beskrivende for dem, der nåede toppen; ikke testet som intervention           | Walther 2023 [læst, web]; Karlsson 2021; Svendsen 2018; Staff 2023                  |
| Styrketræning er farligt for unge / hæmmer vækst                                           | **Folklore**                                                                         | Lloyd 2014 [abstract]; ATK 2.0 [læst]                                               |
| Tung styrke skal vente til 18 år                                                           | Paradigmevalg, ikke evidens                                                          | NCF 2014 vs. DCU 2015 (paradigmenotatet 5)                                          |
| Unge tåler varme dårligere end voksne                                                      | **Folklore** ved god hydrering                                                       | AAP 2011 [abstract]; IOC 2015 [læst]                                                |
| Unge bør sove 8-10 timer                                                                   | Solidt                                                                               | Paruthi 2016 [abstract]; IOC 2015 [læst]                                            |
| Periodisering efter menstruationscyklus                                                    | Ingen evidens, slet ikke hos unge                                                    | McNulty 2020 (paradigmenotatet)                                                     |
| Multisport om vinteren skader cykeludviklingen                                             | Ingen støtte; det modsatte er sandsynligt                                            | Barth 2022; Côté (via ATK)                                                          |

---

## 9. Personer og kilder

**Istvan Balyi** (canadisk træningsplanlægger, Sport for Life Society). Ophavsmand til LTAD (Balyi & Hamilton 2004, "Long-Term Athlete Development: Trainability in childhood and adolescence"; Balyi, Way & Higgs 2013, Human Kinetics). Står for faser og "windows of opportunity". Sport for Life, LTD 3.0 (2019): https://sportforlife.ca/wp-content/uploads/2019/06/Long-Term-Development-in-Sport-and-Physical-Activity-3.0.pdf

**Paul Ford, Mark De Ste Croix, Rhodri Lloyd, Rob Meyers, Marjan Moosavi, Jon Oliver, Kevin Till, Craig Williams** (britiske pædiatriske træningsfysiologer; Lloyd og Oliver ved Youth Physical Development Centre, Cardiff Metropolitan University; De Ste Croix ved University of Gloucestershire). Den fysiologiske kritik af LTAD. Ford m.fl. 2011, J Sports Sci 29:389-402, https://doi.org/10.1080/02640414.2010.536849

**Rhodri Lloyd & Jon Oliver** (Cardiff Met). Youth Physical Development-modellen (Strength Cond J 2012, https://doi.org/10.1519/SSC.0b013e31825760ea), den internationale konsensus om styrketræning for unge (Lloyd m.fl. 2014, BJSM 48:498-505, https://doi.org/10.1136/bjsports-2013-092952), LTAD part 1-2 (JSCR 2015, https://doi.org/10.1519/JSC.0000000000000756) og NSCA's LTAD-holdning (JSCR 2016, https://doi.org/10.1519/JSC.0000000000001387). Står for "alt er trænbart hele tiden, vægt efter modning".

**Avery Faigenbaum** (The College of New Jersey). Styrketræning for børn og unge, "integrative neuromuscular training". Medforfatter på Lloyd 2014, Lloyd 2016 og IOC 2015.

**Bas Van Hooren** (Maastricht University) **& Mark De Ste Croix** (Gloucestershire). Den teoretiske kritik af følsomme perioder. Van Hooren & De Ste Croix 2020, Strength Cond J 42(6):7-14, https://doi.org/10.1519/SSC.0000000000000545

**Richard Bailey** (Liverpool John Moores) **& David Collins** (University of Central Lancashire, senere Edinburgh). "Standard Model of Talent Development" og kritikken af pyramiden. Bailey & Collins 2013, Kinesiology Review 2(4):248-259, https://doi.org/10.1123/krj.2.4.248

**Jean Côté** (Queen's University, Kingston, Canada). Developmental Model of Sport Participation, deliberate play, sampling. Côté, Baker & Abernethy 2007 (Handbook of Sport Psychology); Côté, Lidor & Hackfort 2009 (Int J Sport Exerc Psychol 7:7-17); Côté & Vierimaa 2014, Science & Sports 29:S63-S69, https://doi.org/10.1016/j.scispo.2014.08.133

**Jason Gulbin** (Australian Institute of Sport, senere Swiss Olympic/Schweiz). FTEM. Gulbin, Croser, Morley & Weissensteiner 2013, J Sports Sci 31(12):1319-1331, https://doi.org/10.1080/02640414.2013.781661

**Michael F. Bergeron** (hovedforfatter, USA) med **Margo Mountjoy, Neil Armstrong, Jean Côté, Robert Malina, Avery Faigenbaum, Lars Engebretsen** m.fl. IOC's konsensus om unge atleter. Bergeron m.fl. 2015, BJSM 49:843-851, https://doi.org/10.1136/bjsports-2015-094962. Bergeron m.fl. 2024, BJSM 58:946-965, https://doi.org/10.1136/bjsports-2024-108186. AAP 2011 om varme, https://doi.org/10.1542/peds.2011-1664

**Robert M. Malina** (University of Texas, emeritus) **& Sean Cumming** (University of Bath). Vækst, modning og bio-banding. Cumming m.fl. 2017, Strength Cond J 39(2):34-47, https://doi.org/10.1519/SSC.0000000000000281. Malina m.fl. 2019, Sports Med 49:1671-1685, https://doi.org/10.1007/s40279-019-01166-x

**Robert Mirwald, Adam Baxter-Jones, Donald Bailey, Gaston Beunen** (Saskatchewan/Leuven). Maturity offset. Mirwald m.fl. 2002, MSSE 34:689-694, https://doi.org/10.1097/00005768-200204000-00020

**Neil Armstrong** (University of Exeter, Children's Health and Exercise Research Centre). Aerob fitness og trænbarhed hos unge. Armstrong & McNarry 2016, Pediatr Exerc Sci 28:171-177, https://doi.org/10.1123/pes.2015-0251. Armstrong & Barker 2011, Med Sport Sci 56:59-83.

**Georges Baquet, Emmanuel Van Praagh, Serge Berthoin** (Lille/Clermont-Ferrand). Udholdenhedstræning hos unge. Baquet m.fl. 2003, Sports Med 33:1127-1143, https://doi.org/10.2165/00007256-200333150-00004

**Florian Engel & Billy Sperlich** (Würzburg). HIIT hos unge atleter. Engel m.fl. 2018, Front Physiol 9:1012, https://doi.org/10.3389/fphys.2018.01012

**Arne Güllich** (TU Kaiserslautern), **Michael Barth** (Innsbruck), **Brooke Macnamara** (Case Western), **David Hambrick** (Michigan State). Deltagelsesmønstre og junior-mod-senior-prædiktorer. Barth m.fl. 2022, Sports Med 52:1399-1416, https://doi.org/10.1007/s40279-021-01625-4. Güllich, Macnamara & Hambrick 2022, Perspect Psychol Sci 17:6-29, https://doi.org/10.1177/1745691620974772. Güllich & Barth 2024, Sports Med 54:697-710, https://doi.org/10.1007/s40279-023-01957-3

**Espen Tønnessen & Thomas Haugen** (Olympiatoppen, senere Kristiania), **Øyvind Sandbakk** (NTNU/UiT), **Guro Strøm Solli**, **Jan Walther**. Udviklingsbaner i norsk udholdenhedsidræt. Tønnessen m.fl. 2015, PLoS ONE 10:e0129014, https://doi.org/10.1371/journal.pone.0129014. Walther m.fl. 2023, Front Physiol 14:1288606, https://doi.org/10.3389/fphys.2023.1288606. Staff m.fl. 2023, Sports Med 53:1595-1607 (paradigmenotatet).

**Neeru Jayanthi** (Emory, tidligere Loyola Chicago). Specialisering og overbelastning; "timer ≤ alder". Jayanthi m.fl. 2013, Sports Health 5:251-257, https://doi.org/10.1177/1941738112464626. Jayanthi m.fl. 2015, Am J Sports Med 43:794-801 (paradigmenotatet).

**Joel Brenner** (AAP Council on Sports Medicine and Fitness). Brenner m.fl. 2016, Pediatrics 138:e20162148, https://doi.org/10.1542/peds.2016-2148

**Robert LaPrade** m.fl. (AOSSM). LaPrade m.fl. 2016, Orthop J Sports Med 4(4), https://doi.org/10.1177/2325967116644241

**Henrik Gustafsson** (Karlstad), **J.D. DeFreese** (UNC), **Daniel Madigan** (York St John). Udbrændthed. Gustafsson m.fl. 2017, Curr Opin Psychol 16:109-113, https://doi.org/10.1016/j.copsyc.2017.05.002

**Jens Voet, Robert Lamberts, Jos de Koning, Teun van Erp** (VU Amsterdam/Stellenbosch). RAE i professionel cykling. Voet m.fl. 2022, J Sports Sci 40:2159-2165, https://doi.org/10.1080/02640414.2022.2144877

**Gabriele Gallo & Luca Filipas** (Genova/Milano) m.fl. Ungdomsresultater og professionel karriere i italiensk cykling. Gallo m.fl. 2022, IJSPP 17:621-626, https://doi.org/10.1123/ijspp.2021-0297

**Lidia Alejo, Pedro Valenzuela** m.fl. (Madrid). Junior/U23/pro-sammenligninger. Alejo m.fl. 2022, Front Physiol 13:945552, https://doi.org/10.3389/fphys.2022.945552. Mateo-March m.fl. 2025, IJSPP 20:1739-1744, https://doi.org/10.1123/ijspp.2025-0162

**Per Aagaard** (Syddansk Universitet). Styrke i unge eliteryttere. Aagaard m.fl. 2011, Scand J Med Sci Sports 21:e298-e307, https://doi.org/10.1111/j.1600-0838.2010.01283.x. Vicari m.fl. 2026, Br Med Bull 157, https://doi.org/10.1093/bmb/ldaf024

**Ben Desbrow** (Griffith University). Ernæring og den unge atlet. Desbrow 2021, Sports Med 51(S1):S3-S12, https://doi.org/10.1007/s40279-021-01534-6

**Shalini Paruthi** m.fl. (American Academy of Sleep Medicine). Paruthi m.fl. 2016, J Clin Sleep Med 12:1549-1561, https://doi.org/10.5664/jcsm.6288. **Matthew Milewski** m.fl. 2014, J Pediatr Orthop 34:129-133, https://doi.org/10.1097/BPO.0000000000000151

**Jon Patricios** m.fl. (Concussion in Sport Group). Patricios m.fl. 2023, BJSM 57:695-711, https://doi.org/10.1136/bjsports-2023-106898

**Kirsty Elliott-Sale** (Manchester Metropolitan, tidligere Nottingham Trent). Kvinder i idrætsforskning. Elliott-Sale m.fl. 2021, Sports Med 51:843-861, https://doi.org/10.1007/s40279-021-01435-8. **Kelly McNulty** m.fl. 2020 (paradigmenotatet). ACOG Committee Opinion 651, 2015, https://doi.org/10.1097/AOG.0000000000001215. Gimunová m.fl. 2022, IJERPH 19:14243, https://doi.org/10.3390/ijerph192114243. Ravi m.fl. 2021, https://doi.org/10.1111/sms.13838. von Rosen m.fl. 2017, https://doi.org/10.1515/ijamh-2017-0113. Calcaterra m.fl. 2024, https://doi.org/10.3390/sports12090245

**Andre studier nævnt:** Ayoub m.fl. 2025, IJERPH 22:1388, https://doi.org/10.3390/ijerph22091388. Costigan m.fl. 2015, BJSM 49:1253-1261, https://doi.org/10.1136/bjsports-2014-094490. Zhang m.fl. 2024, Front Public Health 12:1416558, https://doi.org/10.3389/fpubh.2024.1416558. Till m.fl. 2022, PLoS One 17:e0262995, https://doi.org/10.1371/journal.pone.0262995. Oliver & Lloyd, UKSCA Professional Strength & Conditioning 26 (2012): https://cdn.uksca.org.uk/assets/pdfs/UkscaIqPdfs/long-term-athlete-development-and-trainability-during-childhood-636806598236598970.pdf

**Organisationer:**

- Norges idrettsforbund, Idrettens barnerettigheter og Bestemmelser om barneidrett (2019): https://idrettsforbundet.no/contentassets/b034b278300846a49afa033e42d8e829/82_19_barneidrettsbestemmelsene_no_lr-3.pdf
- Team Danmark, ATK: https://www.teamdanmark.dk/talent/atk; ATK 2.0 digital (PDF): https://tdatk2.in5.dk/assets/downloads/Team%20Danmark%20-%20ATK%202.0%20digital.pdf
- IOC 2015 (PDF via Sport Australia): https://www.sportaus.gov.au/__data/assets/pdf_file/0004/689647/IOC_consensus_statement_on_youth_athletic_development.pdf
- Olympiatoppen, Utvikling av unge utøvere (paradigmenotatet).

---

## 10. Hvad det betyder for Kadence

Konkrete følger for en AI, der foreslår træning til 15-22-årige og giver feedback til rytter, træner og forældre. Nummereret efter vægt. "P1" er det, modellen ikke kan undvære.

### 10.1 Modellen skal kende biologisk alder, ikke kun klasse

- **P1 Modenhedsskøn.** Ud over fødselsdato og klasse bør rytterens profil kunne rumme højde (månedligt, frivilligt), og for 13-17-årige gerne siddehøjde og forældrehøjder, så Kadence kan skønne _pre/circa/post vækstspurt_ som kategori (maturity offset ±1 år, eller procent af forventet voksenhøjde 88-96 % = i spurten). Vis kategorien, aldrig "biologisk alder 14,3 år"; fejlen er for stor til decimaler (Mirwald 2002; Cumming 2017). Forældrenotatets P2 "højdemåling og vækst" bliver dermed P1 for U17.
- **P1 Dæmp omkring spurten.** Når væksten er hurtig (>ca. 0,7 cm om måneden, dvs. på vej mod 8-10 cm om året) eller kategorien er "i spurten", foreslår AI'en mindre løbsmængde og mindre samlet stigning, mere teknik og neuromuskulær opvarmning, og forklarer rytteren, at teknikken kan svinge og at ømhed i knæ og hæl skal tages alvorligt (Ayoub 2025; IOC 2015; ATK). Det er råd, ikke forbud: evidensen er observationel.
- **P1 Ingen "vinduer".** AI'en må aldrig begrunde et forslag med, at "nu er det tid til at træne udholdenhed, fordi du er i vækstspurten". Udholdenhed trænes hele tiden; det, der skifter med modning, er, hvilken _type_ styrke- og hurtighedstræning der giver mest (Ford 2011; Van Hooren 2020; Oliver & Lloyd 2012).

### 10.2 Mængde og intensitet for unge

- **P1 Rækværk, ikke mål.** DCU's timetal vises som reference (forældrenotatet 3.3). Oveni lægger Kadence konsensusrækværkene: timer organiseret sport om ugen over alder i år udløser et "overvej" (Jayanthi 2015; LaPrade 2016), over 16 timer om ugen udløser tættere opfølgning på søvn, humør og smerte (AAP/AOSSM), og løbsdage tælles som hård tid (paradigmenotatet 4.3).
- **P1 Jævn mængdevækst, mest lav intensitet.** Når AI'en foreslår en sæsonplan fra år til år, holder den stigningen jævn (Olympiatoppen: ca. +50 timer om året; Walther 2023: lav og moderat intensitet vokser, høj intensitet ikke) og siger det højt: "Det, der adskiller dem, der blev rigtig gode, er flere rolige timer over mange år, ikke flere hårde pas som 16-årig."
- **P1 Mere anden sport om vinteren er ikke spild.** AI'en kan foreslå langrend, løb, svømning, holdsport og styrke i november-januar og tælle det som udholdenhed. Den må aldrig formulere det som et kompromis (Barth 2022; Côté via ATK; IOC 2015).
- **P2 HIIT med måde.** For U17 bør AI'ens standard være 1-2 hårde pas om ugen i opbygningen og ikke flere ved "stagnation". Hvis en rytter ikke rykker sig, er den første hypotese søvn, energi og vækst, ikke manglende intensitet (Engel 2018; Baquet 2003: intensitet skal være høj nok, men ikke mere).
- **P2 Forvent modning i tallene.** For 13-16-årige drenge forklares en stor fremgang i watt delvist af modning (IOC 2015: +70 % peak VO2 fra 12 til 17 år). AI'ens feedback bør bruge relative mål (W/kg, tærskel i % af max, tid i zoner) og sige, at fremgang i puberteten ikke kan tilskrives træningen alene, og at stilstand hos en sent moden rytter ikke er mangel på talent.

### 10.3 Udvælgelse, ranglister og prognoser

- **P1 Ingen fremtidsprognoser.** Kadence må aldrig præsentere en juniorrangliste, en watt-tabel eller en AI-vurdering som et mål for, hvem der "bliver god". Juniorprædiktorerne er modsatte af seniorprædiktorerne (Barth 2022; Güllich & Barth 2024), og den relative alderseffekt skævvrider ungdoms- og U23-udvælgelse (Voet 2022; Gallo 2022). Forældrenotatets "ingen offentlige ranglister for U17 og U19 som standard" fastholdes.
- **P2 Fødselskvartal og modenhed ved siden af præstationen** i trænerens udtagelsesvisninger (forældrenotatet 3.3) får nu en evidensbegrundelse fra cykling selv. Teksten kan sige: "Ryttere født sent på året er underrepræsenterede på U23-udviklingshold, men ikke blandt dem, der bliver professionelle."
- **P2 Overgangen U19 → U23 er den kritiske** (Gallo 2022; Svendsen 2018: løbstimer og aerob effekt ved 18 år). Kadences overgangs-tjekliste (forældrenotatet 3.4) bør for U19 andet år lægge vægt på gradvis vækst i løbsmængde, ikke i intensitet.

### 10.4 Styrke

- **P1 Tekst om sikkerhed.** Alle styrkeforslag til unge bærer sætningen om kvalificeret vejledning og teknik før vægt. Kadence gentager ikke myten om vækstzoner (Lloyd 2014; ATK).
- **P2 Tung styrke som valg.** Paradigmevalget (DCU 6-8 RM fra U17 eller NCF's aerobe fokus til 18 år) står i paradigmenotatet 8.1 og ændres ikke af evidensen her. Kadences AI bør, når en junior spørger "skal jeg løfte tungt?", svare, at det kan forbedre lang præstation (Aagaard 2011), at det ikke er det, der adskiller niveauer (Alejo 2022; Valenzuela 2023), og at det kræver vejledning.
- **P2 Træningstype efter modning.** Før og i spurten: plyometri, sprint, teknik, kropsvægt; efter spurten: progressiv belastning (Oliver & Lloyd 2012). Øvelsesbiblioteket (ADR 0067, 0105) kan mærke øvelser med "før/efter vækstspurt".

### 10.5 Sundhed i check-in og feedback

- **P1 Søvnmål 8-10 timer for 13-17-årige** og 8-9 derefter (Paruthi 2016; Team Danmark), med advarsel ved vedvarende under 8 timer, formuleret med Milewskis tal: "Unge, der sover under 8 timer, har i ét studie næsten dobbelt så høj skadesrisiko." Søvn er AI'ens første hypotese ved træthed og stilstand.
- **P1 Smerte og hjernerystelse stopper forslag.** Ved registreret smerte følger Kadence ATK's smertetrappe (forældrenotatet). Ved hjernerystelse (nyt felt på en tur eller i check-in) foreslår AI'en ingen belastning og henviser til lægelig trinvis tilbagevenden (Patricios 2023; IOC 2015: "No youth athlete should compete ... when in pain or not completely rehabilitated").
- **P1 Menstruation som vitalt tegn, frivilligt og privat.** Registreringen fra forældrenotatet 3.5 beholdes; mønstre som ingen menstruation ved 15-16 år, tre udeblevne cyklusser eller under ni om året udløser rådet om læge (ACOG 2015; ATK). AI'en siger aldrig noget om vægt. Cykling er den sportsgren med den højeste rapporterede andel sekundær amenoré (Gimunová 2022), så det er ikke en nichefunktion.
- **P2 Energi uden tal.** Ingen kalorier, ingen vægt (ADR "no weight as a number"); i stedet ATK's og Desbrows råd om nok mad omkring træning og vægtstabilitet, og advarsel mod kosttilskud og energidrikke (IOC 2015).
- **P2 Varme og kulde.** Ved varmeprognose foreslår AI'en kortere pas, væske og gradvis tilvænning; den fortæller ikke unge, at de tåler varme dårligere end voksne (AAP 2011). Kulde: almindelige råd.
- **P2 Skole og eksamen.** Uændret fra forældrenotatet 3.4; ingen ny evidens.

### 10.6 Tonen over for rytter, træner og forældre

- Til **rytteren:** forklar modning og relativ alder som noget, der er normalt og midlertidigt ("mange af dem, der bliver rigtig gode, var ikke de bedste som 16-årige"). Ingen prognoser, ingen sammenligninger med holdkammerater uden rytterens valg.
- Til **træneren:** AI'en foreslår, træneren beslutter (dogme fem). Begrundelser henviser til modenhedskategori, timer mod alder, søvn og smerte, aldrig til "vinduer" eller "talent". Ved udtagelse vises fødselskvartal og modenhed ved siden af tallene.
- Til **forældre:** det, konsensus er enige om, i korte sætninger: søvn, flere sportsgrene er godt, senere specialisering skader ikke, styrke er sikkert med vejledning, menstruation er et sundhedstegn, og at det sjældent koster noget at vente med de store skift (DCU's talentstrategi). Ingen rangering, ingen deleknap (forældrenotatet 3.6).

### 10.7 Hvad der ikke skal bygges

- Ingen "biologisk alder" som tal, ingen talentscore, ingen cyklusbaseret periodisering, ingen vægtfelter, ingen automatisk sammenligning på tværs af ryttere i U17/U19, ingen begrundelser med vinduer.

### 10.8 Det, der stadig mangler, før modellen er færdig

- Frafaldstal i dansk cykling pr. årgang (DCU-licenser), som kunne kalibrere, hvor hårdt Kadence skal advare i 15-17-årsalderen.
- Fuldtekst af Lloyd 2014 (doseringsråd for styrke) og Côté & Vierimaa 2014 (postulaternes evidensgrad).
- En cykelspecifik kilde om skader omkring PHV og om validering af modenhedsskøn hos cykelryttere. Indtil da låner Kadence fra fodbold og siger det.
