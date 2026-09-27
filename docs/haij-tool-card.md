# The tool card for haij.dk

The copy for Kadence's card on the family's front page, in both
languages, and the entry for the site's `src/content/tools.ts`. It belongs
in the haij-site repository, not this one; it is kept here so the words
are written by the people who built the tool. It goes live only after
dogma seven — one real winter with one real team (docs/launch.md).

## Dansk

**Kadence — Unge ryttere i den rigtige kadence.**

Træningsplanlægning for U17-, U19- og U23-ryttere, deres trænere og deres
forældre. Træneren lægger pas i kalenderen, på cyklen og i styrkerummet;
turen kommer ind fra en FIT-fil, Wahoo eller Garmin og lander på det pas,
den hørte til. Sæsonplanen starter fra Cykling Danmarks anbefalinger for
rytterens årgang, og træneren kan se, når en uge går ud over dem.
Belastningen virker også uden wattmåler, og en kort check-in viser, hvem
der har brug for en snak. Rytteren bestemmer, hvad forældrene ser, og
det håndhæves i databasen. AI'en kan foreslå ugen; træneren bestemmer.

## English

**Kadence — Young riders at the right cadence.**

Training planning for U17, U19 and U23 cyclists, their coaches and their
parents. The coach lays sessions in the calendar, on the bike and in the
gym; the ride comes in from a FIT file, Wahoo or Garmin and lands on the
session it belonged to. The season plan starts from Cycling Denmark's
recommendations for the rider's age class, and the coach sees when a
week goes past them. Load works without a power meter, and a short
check-in shows who needs a talk. The rider decides what the parents see,
and the database enforces it. The AI can propose the week; the coach
decides.

## The entry

```ts
{
  id: "kadence",
  host: "kadence.haij.dk",
  status: "coming",
  text: {
    da: {
      name: "Kadence",
      tagline: "Unge ryttere i den rigtige kadence.",
      description:
        "Kalender, sæsonplan efter DCU, belastning uden wattmåler, check-in og en side til forældrene — træningsplanlægning for U17, U19 og U23.",
      note: "På vej",
    },
    en: {
      name: "Kadence",
      tagline: "Young riders at the right cadence.",
      description:
        "A calendar, a season plan after DCU, load without a power meter, a check-in and a page for parents — training planning for U17, U19 and U23.",
      note: "Coming",
    },
  },
}
```
