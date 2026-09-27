/**
 * The documents behind every DCU number in Kadence. Cycling Denmark
 * (Danmarks Cykle Union, DCU) publishes its training recommendations as
 * PDFs and one web page; Kadence holds a snapshot of them as data
 * (ADR 0014), and each number in this module names the document and page
 * it came from, by file name, so a reader can open the same PDF.
 *
 * `edition` is the year the document itself prints in its title, or null
 * when it prints none. DCU names editions by the racing year they lead
 * into: "Landevej 2025" was made in October 2024, the "2016" compendia in
 * November 2015. `created` is the PDF's own creation date, for documents
 * that print no year.
 *
 * The research note (docs/research/dcu-traeningsanbefalinger.md) covers
 * the first six. The last three were read for this module: the web
 * page's year wheel, the interval sheet the page links to, and the
 * sporting rules that define the age classes.
 *
 * Pure: imports nothing from the database.
 */

export type DcuSourceId =
  | "hours2025"
  | "u17Compendium"
  | "u19Compendium"
  | "u17Strength"
  | "u19Strength"
  | "u23Strength"
  | "yearWheel"
  | "intervals"
  | "rules2025";

export type DcuSource = {
  title: string;
  url: string;
  edition: number | null;
  created: string | null;
  pages: number | null;
};

const BASE = "https://www.cyklingdanmark.dk/fileadmin/user_upload";

export const DCU_SOURCES: Record<DcuSourceId, DcuSource> = {
  hours2025: {
    title: "Træningsanbefalinger – Landevej 2025",
    url: `${BASE}/Landevej_traeningsanbefalinger_2025.pdf`,
    edition: 2025,
    created: "2024-10-07",
    pages: 1,
  },
  u17Compendium: {
    title: "U17-rytter 2016 – Kompendium",
    url: `${BASE}/DCU_U17_kompendium_2016.pdf`,
    edition: 2016,
    created: "2015-11-02",
    pages: 21,
  },
  u19Compendium: {
    title: "U19-rytter 2016 – Kompendium",
    url: `${BASE}/DCU_U19_kompendium_2016.pdf`,
    edition: 2016,
    created: "2015-11-02",
    pages: 31,
  },
  u17Strength: {
    title: "Styrketræningsprogram for U17 landsholdsryttere (Team Danmark)",
    url: `${BASE}/DCU_U17_styrketraening.pdf`,
    edition: null,
    created: "2015-10-23",
    pages: 2,
  },
  u19Strength: {
    title: "Styrketræningsprogram for U19 landsholdsryttere (Team Danmark)",
    url: `${BASE}/DCU_U19_styrketraening.pdf`,
    edition: null,
    created: "2015-10-23",
    pages: 2,
  },
  u23Strength: {
    title: "Styrketræningsprogram for U23 landsholdsryttere (Team Danmark)",
    url: `${BASE}/DCU_U23_styrketraening.pdf`,
    edition: null,
    created: "2015-10-22",
    pages: 1,
  },
  /** The web page, section "Årshjul for træning på landevej"; undated, read 2026-09-27. */
  yearWheel: {
    title: "Træningsanbefalinger – Årshjul for træning på landevej",
    url: "https://www.cyklingdanmark.dk/uddannelse/traeningsanbefalinger",
    edition: null,
    created: null,
    pages: null,
  },
  intervals: {
    title: "Danmarks Cykle Unions træningsanbefalinger – intervaltræning",
    url: `${BASE}/intervaltraening.pdf`,
    edition: null,
    created: "2015-10-30",
    pages: 3,
  },
  /** Approved 10 March 2025. Cited by chapter, paragraph and printed page. */
  rules2025: {
    title: "Danmarks Cykle Unions sportslige regler 2025",
    url: "https://www.cyklingdanmark.dk/fileadmin/files/PDFer/Sporstlige_regler_2025-_Godkendt_version_10.03.2025.pdf",
    edition: 2025,
    created: "2025-03-18",
    pages: 123,
  },
};
