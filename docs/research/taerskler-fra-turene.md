# Tærskler foreslået ud fra turene

Skrevet 12. oktober 2026 til ADR 0094. Martin skrev samme dag: "hvis der
er data tilrådighed for f.eks. det seneste år, må der gerne være en
funktion som tilbyder at systemet vurderer og indsætter sit bud på
tærskler". Her står, hvad kilderne siger om at finde FTP, tærskelpuls,
maxpuls og hvilepuls uden en test, og hvilke regler Kadence bruger. Hvor
et tal eller en regel er Kadences eget skøn, står det udtrykkeligt.
Kilder, hvor kun resuméet er læst, er mærket [resumé].

Dogme fem gælder: Kadence foreslår, et menneske beslutter. Forslaget
fylder formularens felter ud, og intet gemmes, før rytteren eller
træneren trykker Gem. Der spørges ingen sprogmodel; det er regler.

## 1. Kort svar

- **FTP**: kritisk effekt (CP) fra de bedste 3, 5, 10, 15 og 20
  minutter, når kurven passer godt til modellen, og FTP = 97 % af CP.
  Ellers 95 % af de bedste 20 minutter. Aldrig under den bedste time,
  rytteren faktisk har kørt, og aldrig over de bedste 20 minutter.
  Intet forslag, hvis de bedste 20 minutter er under 75 % af de bedste 5
  (så var de 20 minutter ikke hårde).
- **Tærskelpuls**: 97 % af den højeste gennemsnitspuls over 20 minutter
  i en tur, hvor de 20 minutter var hårde (mindst 87 % af en
  referencemaxpuls).
- **Maxpuls**: den højeste puls, der er holdt i to 5-sekunders-målinger
  i træk, efter at urimelige målinger er sorteret fra. Over hele året.
  Kun foreslået, hvis den er højere end den gemte, og ikke langt under
  det, der er normalt for alderen.
- **Hvilepuls**: kan ikke ses på en tur. Kadence foreslår kun en
  hvilepuls, hvis der er målt nogen i hånden (`rider_measurements`);
  ellers skriver rytteren den selv.
- **Data**: de seneste 90 dage først, ellers det seneste år. Mindst tre
  ture med watt (eller puls). Et tal fra hele året er et trin mindre
  sikkert, og for en ung rytter (under 19 i året) altid usikkert.

## 2. FTP uden en test

### 2.1 95 % af de bedste 20 minutter

Konventionen fra Allen og Coggans bog (_Training and Racing with a Power
Meter_, flere udgaver fra 2006) er, at FTP er 95 % af gennemsnittet i en
20-minutters test kørt helt ud. Den er blevet prøvet mod
laboratoriemål:

- Borszcz m.fl. (2018), "Functional
  Threshold Power in Cyclists: Validity of the Concept and Physiological
  Responses", _International Journal of Sports Medicine_ 39(10):737–742,
  https://pubmed.ncbi.nlm.nih.gov/29801189/ [resumé]. 23 trænede
  ryttere. FTP20 kunne i snit holdes 50,9 ± 15,7 minutter, ikke en time.
  FTP20, FTP60 og den individuelle anaerobe tærskel lå tæt i gennemsnit
  (bias −1 til −5 W), men med brede grænser for enighed (op til ±60 W),
  så de "should not be used interchangeably on an individual basis".
- Borszcz, Tramontin og Costa (2019), "Is the Functional Threshold Power
  Interchangeable With the Maximal Lactate Steady State in Trained
  Cyclists?", _International Journal of Sports Physiology and
  Performance_ 14(8):1029–1035,
  https://journals.humankinetics.com/view/journals/ijspp/14/8/article-p1029.xml
  [resumé]. 15 trænede ryttere; konklusionen er, at FTP kan bruges som
  et praktisk skøn over MLSS hos trænede ryttere.
- Valenzuela, Morales, Foster, Lucia og de la Villa (2018), "Is the
  Functional Threshold Power a Valid Surrogate of the Lactate
  Threshold?", _IJSPP_ 13(10):1293–1298,
  https://pubmed.ncbi.nlm.nih.gov/29745765/ [resumé]. FTP 240 ± 35 W mod
  laktattærskel 246 ± 24 W, r = 0,95. Hos trænede ingen forskel, hos
  motionister var FTP lavere end tærsklen: den kan undervurdere.
- MacInnis m.fl. (2019), "The Reliability of 4-Minute and
  20-Minute Time Trials and Their Relationships to Functional Threshold
  Power in Trained Cyclists", _IJSPP_ 14(1):38–45,
  https://journals.humankinetics.com/view/journals/ijspp/14/1/article-p38.xml
  [resumé]. Otte trænede mænd. 20-minutters testen var meget
  pålidelig (TEM 4,6 W), og 20 minutter (R² 0,92), 4 minutter (R² 0,95)
  og CP (R² 0,82) hang alle stærkt sammen med en times tempo
  (309 ± 26 W). Opgaven nævnte en artikel "Is 20-min FTP a valid proxy
  for lactate threshold?" af MacInnis m.fl. 2019; den har jeg ikke kunnet
  finde under den titel. Artiklen ovenfor er den, jeg fandt.

Sammenfattet: 95 % af 20 minutter rammer i gennemsnit tæt på tærsklen
hos trænede ryttere, men kan ramme 30–60 W ved siden af for den enkelte,
og den forudsætter, at de 20 minutter blev kørt helt ud.

### 2.2 Kritisk effekt (CP)

Monod og Scherrer (1965), "The work capacity of a synergic muscular
group", _Ergonomics_ 8:329–338 (ikke læst; citeret efter Jones og
Vanhatalo), beskrev sammenhængen mellem arbejde og
tid, som i cykling skrives effekt = CP + W′/t: CP er den effekt, man kan
holde længe, W′ det arbejde, man kan gøre over CP, før man må sætte
farten ned. Jones og Vanhatalo (2017), "The 'Critical Power' Concept:
Applications to Sports Performance with a Focus on Intermittent
High-Intensity Exercise", _Sports Medicine_ 47(Suppl 1):65–78,
https://pmc.ncbi.nlm.nih.gov/articles/PMC5371646/ [resumé], beskriver CP
som grænsen mellem effekter, hvor fosfokreatin, laktat og iltoptag
finder et stabilt niveau, og effekter, hvor de stiger, til man må
stoppe.

- Karsten m.fl. (2021),
  "Relationship Between the Critical Power Test and a 20-min Functional
  Threshold Power Test in Cycling", _Frontiers in Physiology_ 11:613151,
  https://pmc.ncbi.nlm.nih.gov/articles/PMC7862708/ (læst i fuld tekst).
  CP fra tre tempoløb på 12, 7 og 3 minutter, regnet med modellen
  effekt mod 1/t, som gav den mindste fejl. CP 256 ± 50 W mod FTP
  249 ± 44 W, bias 7 ± 13 W (CP højest i 91,7 % af tilfældene), grænser
  for enighed −19 til 33 W, r = 0,969. W′ var 17,0 ± 6,9 kJ.
  Forfatterne skriver, at modellen med to parametre bør holdes til
  varigheder under 20 minutter, og at CP og FTP ikke bør bruges i
  hinandens sted.
- Karsten, Jobson, Hopker, Stevens og Beedie (2015), "Validity and
  reliability of critical power field testing", _European Journal of
  Applied Physiology_ 115(1):197–204,
  https://link.springer.com/article/10.1007/s00421-014-3001-z [resumé].
  CP fra test på landevejen svarede til laboratoriets (fejl 4,5–5,8 %)
  og var pålidelig (ICC 0,96–0,99).
- Leo m.fl. (2020), "Training
  Characteristics and Power Profile of Professional U23 Cyclists
  throughout a Competitive Season", _Sports_ 8(12):167,
  https://pmc.ncbi.nlm.nih.gov/articles/PMC7766290/ (læst i fuld tekst).
  CP og W′ regnet fra de bedste 2, 5 og 12 minutter i U23-rytteres egne
  trænings- og løbsfiler, med samme model. Laboratoriets CP var
  382 ± 33 W og W′ 17,8 ± 3,6 kJ. CP fra løb lå 21–29 W (5–7 %) over CP
  fra træning i alle dele af sæsonen.

Det sidste er vigtigt for Kadence: CP regnet fra hverdagens filer, ikke
fra en test, er en anerkendt metode til U23, men løb giver højere tal
end træning, fordi man i løb kører helt ud.

### 2.3 Gruppeture og korte bakker

Watt er watt, også i et felt; læ giver lavere watt for samme fart, ikke
højere. Problemet med gruppeture og løb er det modsatte af det, man
tror: de korte, hårde stykker (spurt, bakke, angreb) bliver kørt helt
ud, mens de 20 minutter sjældent gør. Så får kurven en høj kort ende og
en lav lang ende, og både CP og 95 % af 20 minutter bliver for lave.
Kadence kan ikke se det på watt alene. Derfor:

- Hvis de bedste 20 minutter er under 75 % af de bedste 5, foreslås
  ingen FTP. En kurve kørt helt ud har 20 minutter på omkring 80–90 % af
  5 minutter: med Karstens tal (CP 256 W, W′ 17 kJ) giver modellen
  270 W over 20 minutter og 313 W over 5, altså 86 %; selv en rytter med
  dobbelt så stor W′ lander omkring 79 %. Grænsen på 75 % er Kadences
  skøn.
- Har turen med de bedste 20 minutter puls, ser Kadence efter, om de 20
  minutter var hårde på pulsen (afsnit 3). Var de ikke, står forslaget
  som usikkert med sætningen "Pulsen tyder på, at de 20 minutter ikke var
  helt hårde. Tallet er nok for lavt." Har turen ingen puls, kan det ikke
  ses, og forslaget er højst nogenlunde sikkert.

### 2.4 Kadences metode for FTP

1. **CP** fra de bedste 3, 5, 10, 15 og 20 minutter i vinduet (Kadence
   gemmer 10 og 15, ikke 12, på hver tur; de ligger inden for modellens
   2–20 minutter). Mindst tre af dem, heraf 3 eller 5 minutter og 20
   minutter. Mindste kvadraters metode på effekt mod 1/t. Brugt, når
   R² ≥ 0,95, W′ ligger mellem 4 og 40 kJ, og CP ligger under de bedste
   20 minutter. FTP = 0,97 × CP, fordi CP i Karsten m.fl. (2021) lå
   7 W (ca. 3 %) over FTP. R²-grænsen og W′-intervallet er Kadences
   skøn; W′ i studierne ovenfor ligger omkring 17 kJ, og unge, lette
   ryttere kan ligge lavere.
2. **95 % af de bedste 20 minutter**, når CP ikke kan bruges.
3. **Den bedste time** som gulv: har rytteren kørt en time over
   forslaget, er det timen, der foreslås, og så var de 20 minutter
   ikke kørt helt ud (højst nogenlunde sikkert). Og aldrig over de
   bedste 20 minutter.

Hvorfor CP først: den bruger flere varigheder end ét tal og er derfor
mindre følsom over for, at netop de 20 minutter blev kørt lidt for
roligt, og den er prøvet på U23-rytteres egne filer (Leo m.fl. 2020).
Hvorfor 95 % som reserve: den er den kendte regel, rytterne og trænerne
allerede bruger, og den kræver kun ét tal.

## 3. Tærskelpuls (LTHR) fra turene

Joe Friels test er 30 minutter alene, kørt som et løb, og
gennemsnitspulsen i de sidste 20 minutter er et skøn over
tærskelpulsen: Friel, "A Quick Guide to Setting Zones" (2009),
http://www.trainingbible.com/joesblog/2009/11/quick-guide-to-setting-zones.html,
og "The 30-Minute Test Is Easy. Really.",
https://joefrieltraining.com/the-30-minute-test-is-easy-really/. De
første 10 minutter tages fra, fordi pulsen er længe om at nå op.

Uden en test er den nærmeste tilnærmelse den højeste gennemsnitspuls
over 20 minutter i en hård tur. Den kan ramme ved siden af på to måder:

- **For højt**: i et løb rummer de 20 minutter spurter over tærsklen,
  og pulsen kryber op med varme og væsketab. Coyle og González-Alonso
  (2001), "Cardiovascular drift during prolonged exercise: new
  perspectives", _Exercise and Sport Sciences Reviews_ 29(2):88–92
  [resumé], beskriver, hvordan pulsen stiger og slagvolumen falder efter
  10–20 minutters arbejde ved samme belastning. Kadence måler allerede
  denne drift på hver tur (`hr_drift`).
- **For lavt**: de 20 minutter var ikke hårde nok, eller pulsen var længe
  om at komme op.

Kadence tager derfor 97 % af den højeste 20-minutters gennemsnitspuls,
midt i spændet 95–100 %, og kun fra ture, hvor de 20 minutter var hårde:
mindst 87 % af en referencemaxpuls, som er den højeste af turenes egen
holdte maxpuls, den gemte maxpuls og alderslinjen minus 10. Både 97 %
og 87 % er Kadences skøn. Hellere intet tal end et for lavt tal, der
står som sikkert.

Det kræver pulsens forløb, ikke kun turens gennemsnit og max: en tur på
tre timer med 20 hårde minutter har et lavt gennemsnit, og en tur med en
fejlmåling har et højt max. Derfor læses pulsen i 5-sekunders-strømmen
(`streams.hr`), men kun for de få ture, der kan rumme svaret (afsnit 7).

## 4. Maxpuls

Den højeste målte puls er det bedste skøn, men pulsbælter og ure lyver:
et tørt bælte i starten, statisk elektricitet, et optisk ur der låser sig
på kadencen. Kadences regler (alle Kadences skøn):

- En måling uden for 30 bpm og et loft tælles ikke. Loftet er
  alderslinjen plus 30, højst 230.
- En måling, der springer mere end 30 slag fra den forrige på fem
  sekunder, tælles ikke; et hjerte gør ikke det. Efter et halvt minut på
  det nye niveau tror Kadence på det (så var det det gamle niveau, der
  var forkert, eller bæltet kom tilbage).
- En max skal være holdt i to målinger i træk (ca. 10 sekunder), aldrig
  én enkelt.
- Kadence gemmer allerede 5-sekunders-gennemsnit, så et enkelt
  sekunds udslag er udjævnet, før reglerne ovenfor tager resten.

Alderslinjen er Tanaka, Monahan og Seals (2001), "Age-predicted maximal
heart rate revisited", _Journal of the American College of Cardiology_
37(1):153–156, https://www.sciencedirect.com/science/article/pii/S0735109700010548
[resumé]: 208 − 0,7 × alder, fra en metaanalyse med 18.712 personer og
514 i laboratoriet, alle voksne. Hos børn og unge er formlerne ikke
præcise: Cicone, Holmes, Fedewa, MacDonald og Esco (2019), "Age-Based
Prediction of Maximal Heart Rate in Children and Adolescents: A
Systematic Review and Meta-Analysis", _Research Quarterly for Exercise
and Sport_ 90(3):417–428, https://pubmed.ncbi.nlm.nih.gov/31157608/
[resumé], fandt at 220 − alder overvurderer med 12,4 slag og Tanaka
undervurderer med 2,7, og at "age-based MHR equations derived from adult
populations are not applicable to children". Kadence bruger derfor
alderslinjen kun som grænse, aldrig som tallet:

- som loft (plus 30) for, hvad der overhovedet kan være en puls;
- som bund: er turenes max mere end 20 slag under linjen, har ingen tur
  været kørt helt i top, og der foreslås ingen maxpuls.

Maxpulsen stiger ikke med formen, og en max kræver et øjeblik, hvor man
giver alt, som er sjældent. Derfor ser Kadence på hele året for
maxpulsen, ikke kun 90 dage. Og en max kan kun findes, ikke falde: er
turenes max ikke højere end den gemte, foreslås intet ("Turene er ikke
nået over den maxpuls, der står nu").

Til unge under 18 giver Kadence ingen råd om at teste til udmattelse;
forklaringen ved feltet siger kun, hvor man typisk ser sin maxpuls.

## 5. Hvilepuls

Hvilepulsen måles i ro om morgenen og kan ikke ses på en tur. Kadence
har ingen enhedsdata om hvilepuls (Wahoo, Garmin og Polar sender kun
turen), og dagens check-in spørger ikke om den. Tabellen
`rider_measurements` kan rumme `resting_hr` målt i hånden, men i dag er
der ingen skærm, der skriver den. Forslaget bruger midten (medianen) af
de målte hvilepulser de seneste 90 dage (ellers året), når der er nogen;
ellers står der, at den måles bedst om morgenen i sengen og skrives ind
her. Målinger er trivselsdata (ADR 0011) og læses kun af dem, rytteren
deler trivsel med.

## 6. Hvor meget data, og hvor nyt

Formen ændrer sig over uger. Leo m.fl. (2020) fandt CP fra løb 5–7 %
over CP fra træning i samme sæson, og en vinter uden hårde ture giver
lavere bedste tal end sommeren. Kadences regler (skøn):

- **Vindue**: de seneste 90 dage først. Er der for lidt (se nedenfor),
  det seneste år (365 dage). Ældre ture bruges aldrig.
- **Mindst tre ture** med watt for FTP, mindst tre med puls for
  tærskelpulsen.
- **Mindst én hård indsats på 20 minutter**, som beskrevet i afsnit 2.3
  og 3.
- **Sikkerhed**: CP fra 90 dage med mindst fem ture med watt og puls,
  der bekræfter indsatsen, er "ret sikkert". 95 % af 20 minutter er højst
  "nogenlunde sikkert". Uden puls til at bekræfte indsatsen højst
  "nogenlunde"; med puls, der siger, at indsatsen ikke var hård,
  "usikkert"; uden bedste 5 minutter at holde 20 minutter op imod
  "usikkert". Et tal fra hele året er et trin mindre sikkert.
  Tærskelpulsen er "ret sikker", når to hårde ture ligger inden for 3 %
  af hinanden; maxpulsen, når to ture ligger inden for 3 slag.
- **Unge ryttere**: en U17- eller U19-rytter vokser og bliver stærkere i
  løbet af en sæson, så et tal fra for et år siden er nok for lavt.
  Kadence bruger stadig hele året, når 90 dage ikke rækker (et for lavt
  tal giver for rolige zoner, som er den sikre side), men forslaget står
  altid som "usikkert" med sætningen "Unge ryttere bliver hurtigt
  stærkere, så det kan være for lavt." Med 90 dages data behandles unge
  som alle andre.

## 7. Hvad et forslag læser

For en rytter med 250 ture det seneste år:

1. én række pr. cykeltur med de små kolonner: effektkurven
   (`best_powers`, ca. 25 tal, ca. 200–300 byte), gennemsnits- og
   maxpuls og tid i bevægelse: ca. 250 rækker og 100 kB;
2. pulskanalen (`streams->'hr'`) for de få ture, der kan rumme et svar:
   i hvert vindue de tre med de bedste 20 minutter i watt, de tre med
   højest maxpuls og de tre med højest gennemsnitspuls over mindst 20
   minutter. Højst 18, i praksis 4–12. Pulskanalen fylder ca. 3,6 kB pr.
   times kørsel (målt på demoens ture), så under 150 kB. Databasen pakker
   hele strømmen ud for netop de rækker (ca. 13 kB komprimeret pr. times
   tur), men sender kun pulsen. Alle strømme for et år ville være ca.
   15 MB;
3. de målte hvilepulser: en håndfuld rækker.

## 8. Hvad jeg ikke har kunnet efterprøve

- MacInnis-artiklen med den titel, opgaven nævnte; jeg fandt den
  nævnte artikel fra 2019 med en anden titel og har kun læst resuméet.
  Tidsskriftets side afviste at blive hentet.
- Borszcz 2018 og 2019, Valenzuela 2018, Karsten 2015, Coyle og
  González-Alonso 2001, Tanaka 2001 og Cicone 2019 er læst som resumé.
  Hvor jeg ikke har set den fulde forfatterliste, står der "m.fl.".
- Monod og Scherrer 1965 er ikke læst; den citeres her, som
  oversigtsartiklerne citerer den.
- Allen og Coggans bog er ikke læst her; 95 %-reglen er gengivet, som
  den citeres i studierne ovenfor.
- Forholdet mellem bedste 20 og bedste 5 minutter hos unge ryttere har
  jeg ikke fundet målt; grænsen på 75 % er udledt af CP-modellen med
  Karstens tal.
- Hvor meget en ung rytters tærskler typisk stiger over en sæson, har
  jeg ikke fundet tal for.
- Ingen af reglerne er prøvet mod rigtige rytteres filer; vinterens
  pilot er første prøve (dogme syv).
