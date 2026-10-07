# Øvelser og programmer

Status: bygget, spor Ø-01 til Ø-05 flettet ind; se
[ADR 0067](adr/0067-exercises-and-programmes.md).

Planen bag grenen `feat/ovelser-og-programmer`, godkendt af Martin den 6.
oktober 2026 ("Ja tak"). Hans valg: både en åben side og en indgang i appen,
download som HTML-fil og PDF, holdets egne øvelser og programmer i
databasen fra start, og Kadences farver i lys og mørk tilstand.

## Hvad det er

Man vælger et færdigt program eller sammensætter sit eget ud fra
øvelsesbiblioteket og henter det med instrukser og tegninger: nummer og
navn, dosis ("30 sek pr. side"), "Sådan gør du", "Hvorfor", en Færdig-knap
og delene af dagen som faner. En træner kan oprette holdets egne øvelser
med et tegneværktøj og egne programmer, og lægge et program i rytternes
kalender som pas.

## Bygget dynamisk

- **Kontrakten** er `src/modules/exercises/types.ts`: stilling (punkter for
  hoved, nakke, hofte, albuer, hænder, knæ og fødder i en boks på 240 × 140,
  rekvisitter og pile), dosis, reference (`builtin:<id>` eller
  `team:<uuid>`) og program (dele med øvelser og egen dosis).
- **Kadences egne** ligger i `src/modules/exercises/builtin` med tekster i
  `messages` (`exercises.items`, `exercises.programs`). En ny øvelse er én
  post, dens tekster og en stilling; testene beviser, at alt er komplet.
- **Holdets egne** ligger i `team_exercises` og `team_programs` med samme
  skemaer, tvungen RLS (medlemmer læser, trænere skriver), audit,
  isolationstest og eksport.
- **Én tegnefunktion** tegner alle figurer i samme stil: rundt hoved, tykke
  afrundede linjer, en pil i accentfarven, gulv og rekvisitter. Den samme
  funktion bruges på siden, i appen og i den hentede fil. Ingen fotos.

## Spor

| Spor | Indhold                                                           | Tokens   | Model  |
| ---- | ----------------------------------------------------------------- | -------- | ------ |
| Ø-01 | Tegnefunktion, indbyggede øvelser og programmer med kilder        | 400–700k | Opus   |
| Ø-02 | Åben side `/guides/programs`, sammensæt, download som HTML og PDF | 300–500k | Sonnet |
| Ø-03 | Tabeller, RLS, services, eksport                                  | 300–450k | Opus   |
| Ø-04 | Appen: biblioteket, tegneværktøj, programbygger, læg i kalenderen | 600k–1M  | Opus   |
| Ø-05 | Demo, hjælp og ADR                                                | 100–200k | Sonnet |

Ø-01 og Ø-03 kører parallelt; Ø-02 efter Ø-01; Ø-04 efter Ø-01 og Ø-03;
Ø-05 til sidst.
