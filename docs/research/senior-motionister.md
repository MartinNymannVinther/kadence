# Voksne motionister i Kadence: Motionist og Supermotionist

Skrevet 12. oktober 2026 til ADR 0091. Kadence er bygget til U17, U19 og
U23, og DCU har ingen timetal for voksne. Martin bad den dag om, at en
voksen, fx en forælder, også kan bruge Kadence til sin egen træning. Her
står, hvad kilderne siger, og hvordan Kadences to profiler følger af dem.
Hvor et tal er Kadences eget skøn, står det udtrykkeligt.

## 1. Kort svar

- **Motionist** er omkring 5 timer om ugen, mest rolige ture og et par
  hårde pas: ca. **280 timer** fra november til september.
- **Supermotionist** er omkring 10 timer om ugen, bygget op mod sommerens
  løb og lange ture: ca. **520 timer**.
- **Gulvet** er WHO's anbefaling for voksne: 150–300 minutter moderat
  eller 75–150 minutter hård aktivitet om ugen. En motionists roligste
  måned ligger over 150 minutter, og året i snit omkring de 300.
- **Loftet** er NCF's tal for de bedste seniorer: 700–1.100 timer om året.
  Supermotionisten holder sig et godt stykke under den nederste ende.
- **Fordelingen** følger profilen "Lav intensitet først" (Seiler; NCF
  2014): det meste roligt og få hårde pas. Kadence tæller pas, ikke tid.
- **Måneder, længste tur og styrkerytme** er Kadences eget skøn, forankret
  i kilderne ovenfor, ikke et forbunds tal.

## 2. Hvad kilderne siger

### 2.1 WHO 2020

WHO's retningslinjer for fysisk aktivitet og stillesiddende adfærd
(2020) siger om voksne på 18–64 år:

> "Adults should do at least 150–300 minutes of moderate-intensity
> aerobic physical activity; or at least 75–150 minutes of
> vigorous-intensity aerobic physical activity; or an equivalent
> combination of moderate- and vigorous-intensity activity throughout
> the week, for substantial health benefits."

> "Adults should also do muscle-strengthening activities at moderate or
> greater intensity that involve all major muscle groups on 2 or more
> days a week, as these provide additional health benefits."

Mere end 300 minutter moderat (eller 150 minutter hård) giver "additional
health benefits", når intet taler imod.

Kilde: WHO guidelines on physical activity and sedentary behaviour,
Genève 2020, ISBN 978-92-4-001512-8; sammenfattet i Bull FC m.fl., "World
Health Organization 2020 guidelines on physical activity and sedentary
behaviour", Br J Sports Med 2020;54:1451–1462 (PMC7719906). Læst i
artiklen [læst].

### 2.2 Sundhedsstyrelsen

Sundhedsstyrelsens anbefalinger for voksne (18–64 år) siger mindst 30
minutter fysisk aktivitet om dagen ved moderat til høj intensitet, altså
omkring 210 minutter om ugen, midt i WHO's spænd. Siden 2023 anbefaler
styrelsen også muskelstyrkende aktivitet mindst to gange om ugen med de
store muskelgrupper.

Kilde: sst.dk, "Anbefalinger om fysisk aktivitet og stillesiddende tid".
Siden svarede ikke, da den blev hentet den 12. oktober 2026 (HTTP 429).
Tallene er læst i søgeresultaternes uddrag og i omtaler af 2023-
anbefalingerne [søgning]. De skal tjekkes på siden selv, før de citeres
ordret.

### 2.3 NCF 2014: loftet

Norges Cykleforbund (Rønnestad m.fl., "Utholdenhetstrening", 2014, s. 29):
"De beste seniorutøverne i sykling trener mellom 700-1100 treningstimer i
året" (docs/research/traeningsparadigmer.md, afsnit 3.5). Det er
professionelle og eliteryttere. En voksen med arbejde og familie skal
ikke derop, og Supermotionisten holder sig derfor et godt stykke under 700.

Til sammenligning giver DCU 429 timer til en U17 i første år og 554 til
en U19 i første år (Landevej_traeningsanbefalinger_2025.pdf s. 1).
Supermotionistens 520 timer ligger mellem de to.

### 2.4 Fordelingen: lav intensitet først

Forskningsnoten (docs/research/traeningsparadigmer.md, afsnit 4.1–4.2)
viser, at en polariseret eller pyramidal fordeling virker omtrent lige
godt, og at meget tid mellem tærsklerne ser dårligst ud. Seiler 2010
tæller omkring 80 % af passene som rolige; NCF 2014 skriver ~75 / 5–10 /
15–20. Rosenblat m.fl. 2025 fandt ingen forskel mellem polariseret og
pyramidal, og at motionister måske får mest ud af pyramidal. Derfor:
"mest rolige ture, et par hårde pas". Kadence tilbyder i forvejen
profilen "Lav intensitet først" (ADR 0053), og den gælder også voksne.

## 3. Sådan følger tabellerne

### 3.1 Sæsonens form

Kadences sæson løber fra oktober til september, som DCU's. Oktober er
fri, som hos DCU ("pause + frit"), og planlægges med 0 timer. Fra
november stiger mængden gennem vinteren, er størst fra maj til august,
hvor vejret og løbene er, og falder lidt i september. Formen er den
samme som DCU's, men den præcise fordeling på måneder er **Kadences eget
skøn**.

### 3.2 Timer pr. måned

| Måned     | Motionist | Supermotionist |
| --------- | --------: | -------------: |
| Oktober   |         0 |              0 |
| November  |        16 |             30 |
| December  |        18 |             34 |
| Januar    |        20 |             38 |
| Februar   |        21 |             40 |
| Marts     |        24 |             46 |
| April     |        27 |             50 |
| Maj       |        30 |             56 |
| Juni      |        32 |             58 |
| Juli      |        34 |             62 |
| August    |        32 |             58 |
| September |        26 |             48 |
| **I alt** |   **280** |        **520** |
| Pr. uge   |   ca. 5,4 |       ca. 10,0 |

Motionistens roligste måned, november, er 16 timer: ca. 3,7 timer om
ugen, eller omkring 220 minutter. Det er over WHO's 150 minutter og over
Sundhedsstyrelsens 210, alene på cyklen. Sommerens uger er omkring 7–8
timer. Supermotionisten går fra ca. 7 timer om ugen i november til ca. 14
i juli.

### 3.3 Ugens ramme

Ugens mål regnes som for DCU's timer (src/modules/dcu/hours.ts): hver dag
bærer sin måneds timer delt med månedens dage, og ugen er summen af sine
syv dage. Rammen er målet ± 20 %, den samme bredde som DCU's. Også det
er Kadences valg, og rammen vises, den håndhæves ikke.

### 3.4 Den længste tur

| Profil         | Længste tur          |
| -------------- | -------------------- |
| Motionist      | 3 timer eller 90 km  |
| Supermotionist | 5 timer eller 150 km |

Begge er **Kadences eget skøn**. Ingen kilde sætter en grænse for voksne.
Motionisten kører omkring 5 timer om ugen, og en tur på mere end 3 timer
er mere end halvdelen af ugen på én dag. Supermotionisten får U19's
grænse fra DCU (5 timer eller 150 km, DCU_U19_kompendium_2016.pdf s.
18), fordi sommerens lange ture og motionsløb ligger der. Det er en
påmindelse til træneren, aldrig et forbud.

### 3.5 Styrke

| Profil         | November–februar | Marts     | April–oktober |
| -------------- | ---------------- | --------- | ------------- |
| Motionist      | 2 om ugen        | 1 om ugen | 1 om ugen     |
| Supermotionist | 2 om ugen        | 2 om ugen | 1 om ugen     |

WHO og Sundhedsstyrelsen anbefaler muskelstyrkende aktivitet mindst to
gange om ugen. Om vinteren følger begge profiler det. I sæsonen er ét
styrkepas om ugen **Kadences skøn**, ligesom DCU's vedligeholdelse: på
cyklen arbejder benene i forvejen meget, og et pas mere er velkomment.
Mindst 48 timer mellem styrkepas gælder for alle, som hos DCU.

Kadence har ingen styrkeprogrammer for voksne. DCU's U23-program ligger i
biblioteket og kan bruges som indhold. Det er skrevet til landsholdsryttere,
og en voksen motionist bør starte let og lægge teknik før belastning.

## 4. Hvad Kadence ikke gør for voksne

- **DCU's løbsregler** (distancer, gearing, etapedage) gælder U17–U23 og
  bruges ikke for seniorer.
- **Søvnminimum for 14–17-årige** gælder ikke voksne. Flaget for kort
  søvn, smerte, trivsel, stigning fra uge til uge og afstand mellem
  styrkepas gælder alle.
- **DCU's vintermål** (30 styrkepas) foreslås kun U17 og U19.
- **Ét valg, ikke et spørgeskema.** Profilen er ét valg mellem to. Den,
  der vil noget andet, retter timerne i sæsonplanen, og afvigelsen står
  ved siden af.

## 5. Kilder

- WHO 2020: https://iris.who.int/handle/10665/336656
- Bull FC m.fl. 2020, BJSM 54:1451–1462: https://pmc.ncbi.nlm.nih.gov/articles/PMC7719906/
- Sundhedsstyrelsen, anbefalinger om fysisk aktivitet: https://www.sst.dk/vidensbase/forebyggelse/anbefalinger-om-fysisk-aktivitet/anbefalinger-om-fysisk-aktivitet-og-stillesiddende-tid
- NCF, Utholdenhetstrening (Rønnestad m.fl. 2014): se docs/research/traeningsparadigmer.md, afsnit 3.5
- Seiler 2010, Rosenblat m.fl. 2025: se docs/research/traeningsparadigmer.md, afsnit 4
- DCU, Træningsanbefalinger landevej 2025 og U19-kompendiet 2016: src/modules/dcu/sources.ts
