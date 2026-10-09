/**
 * How Søg compares what was typed with a name (the search approved with
 * docs/mockups/navigation). Pure: no database, no React, so the rules are
 * tested on their own.
 *
 * Both sides are folded the same way first — lower case, accents
 * stripped, and the letters Unicode does not take apart (ø, æ) written
 * as a phone keyboard without them would — so "soren" finds "Søren" and
 * "a" finds "Åse". Then a hit counts by where it lands: at the start of
 * the name first, at the start of one of its words next, anywhere last.
 * Several words must all be found, in any order, so "holm e" finds
 * "Emma Holm" as well as "emma h" does.
 */

/** Where the hit lands: 0 the start of the text, 1 the start of a word, 2 anywhere. */
export type Rank = 0 | 1 | 2;

/** Letters NFD leaves whole, spelled the way they are typed without them. */
const FOLD: Record<string, string> = {
  ø: "o",
  æ: "ae",
  œ: "oe",
  ß: "ss",
  ð: "d",
  þ: "th",
  ł: "l",
  đ: "d",
  ı: "i",
};

const WORD = /[\p{L}\p{N}]/u;

/** Lower case, accents stripped, ø and æ folded, and runs of space as one. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[øæœßðþłđı]/g, (letter) => FOLD[letter] ?? letter)
    .replace(/\s+/g, " ")
    .trim();
}

/** Whether `word` begins one of the words in `text` (both already folded). */
function startsAWord(text: string, word: string): boolean {
  for (let at = text.indexOf(word); at !== -1; at = text.indexOf(word, at + 1)) {
    if (at === 0 || !WORD.test(text[at - 1]!)) return true;
  }
  return false;
}

/**
 * A query folded once and asked of many texts. Nothing typed matches
 * everything at the first rank, so a list asked with an empty query
 * keeps its own order.
 */
export function matcher(query: string): (text: string) => Rank | null {
  const folded = normalize(query);
  const words = folded === "" ? [] : folded.split(" ");
  return (text) => {
    if (words.length === 0) return 0;
    const target = normalize(text);
    if (target.startsWith(folded)) return 0;
    if (words.every((word) => startsAWord(target, word))) return 1;
    if (words.every((word) => target.includes(word))) return 2;
    return null;
  };
}

/** Where `query` lands in `text`, or null when it is not there. */
export function rank(query: string, text: string): Rank | null {
  return matcher(query)(text);
}

/** Whether `query` is found in `text` at all. */
export function matches(query: string, text: string): boolean {
  return rank(query, text) !== null;
}

/**
 * The items `query` finds, best first. An item has a main text and may
 * have more (a quiet word beside a name, like "Indstillinger" beside a
 * settings tab): a hit in the main text always comes before a hit only in
 * the others, and within that the rank decides. Items that tie keep the
 * order they came in, and no more than `limit` are kept.
 */
export function best<T>(
  query: string,
  items: readonly T[],
  texts: (item: T) => ReadonlyArray<string | null | undefined>,
  limit = Number.POSITIVE_INFINITY,
): T[] {
  const find = matcher(query);
  const found: Array<{ item: T; score: number; order: number }> = [];
  items.forEach((item, order) => {
    let score: number | null = null;
    for (const [which, text] of texts(item).entries()) {
      const hit = text ? find(text) : null;
      if (hit === null) continue;
      // Three ranks to a text, so the second text's best is worse than the first's worst.
      const at = which * 3 + hit;
      if (score === null || at < score) score = at;
    }
    if (score !== null) found.push({ item, score, order });
  });
  found.sort((a, b) => a.score - b.score || a.order - b.order);
  return found.slice(0, limit).map((entry) => entry.item);
}
