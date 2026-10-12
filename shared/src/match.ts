/** Phrase matching over cleaned, lower-cased text, across Latin and Indic scripts. */

export interface PhraseMatch {
  phrase: string;
  index: number;
  length: number;
}

const cache = new Map<string, RegExp>();

/**
 * Latin phrases need word boundaries ("pan" must not match "company");
 * Indic scripts have no reliable \b, so they match as substrings.
 */
function phraseRegex(phrase: string): RegExp {
  let re = cache.get(phrase);
  if (!re) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const lead = /^[a-z0-9]/i.test(phrase) ? '(?<![a-z0-9])' : '';
    const trail = /[a-z0-9]$/i.test(phrase) ? '(?![a-z0-9])' : '';
    re = new RegExp(`${lead}${escaped}${trail}`, 'i');
    cache.set(phrase, re);
  }
  return re;
}

/** Earliest match of any phrase, or null. */
export function findPhrase(norm: string, phrases: readonly string[]): PhraseMatch | null {
  let best: PhraseMatch | null = null;
  for (const phrase of phrases) {
    const m = phraseRegex(phrase).exec(norm);
    if (m && (best === null || m.index < best.index)) {
      best = { phrase, index: m.index, length: m[0].length };
    }
  }
  return best;
}

export function hasPhrase(norm: string, phrases: readonly string[]): boolean {
  return phrases.some((p) => phraseRegex(p).test(norm));
}

/** True when one of `guards` appears within `window` characters before `index`. */
export function precededBy(
  norm: string,
  index: number,
  guards: readonly string[],
  window = 28,
): boolean {
  const before = norm.slice(Math.max(0, index - window), index);
  return guards.some((g) => before.includes(g));
}

const CLAUSE_BREAK = /[.!?\n;|।]/;

/** The clause around a match, for quoting back to the user. Capped for the meter UI. */
export function quoteAround(text: string, match: PhraseMatch, maxLength = 72): string {
  let start = match.index;
  while (start > 0 && !CLAUSE_BREAK.test(text[start - 1] ?? '')) start--;
  let end = match.index + match.length;
  while (end < text.length && !CLAUSE_BREAK.test(text[end] ?? '')) end++;

  let quote = text.slice(start, end).trim();
  if (quote.length > maxLength) {
    // Keep the matched phrase centred when the clause is long.
    const centre = match.index - start + match.length / 2;
    const from = Math.max(0, Math.min(quote.length - maxLength, Math.round(centre - maxLength / 2)));
    quote = `${from > 0 ? '…' : ''}${quote.slice(from, from + maxLength).trim()}${
      from + maxLength < quote.length ? '…' : ''
    }`;
  }
  return quote;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min((row[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    prev = row;
  }
  return prev[b.length] ?? 0;
}
