// Shared curation helper.
//
// The Wiktionary-derived pipeline is weakest for very short, very frequent
// lemmas, where raw sense links drag in transliteration look-alikes,
// grammatical labels and rare senses. Each deck can ship a hand-curated gloss
// map that is authoritative for those lemmas; this applies it to a generated
// card list.

/**
 * Replaces every short lemma's cards with its curated glosses, preserving the
 * position of the lemma's first occurrence. Lemmas longer than `maxLength` and
 * lemmas with no curated entry are left untouched. A curated entry with an
 * empty gloss list removes the lemma from the deck entirely, which is how the
 * generators drop short items that are not real vocabulary (stray letters,
 * abbreviations, proper nouns).
 */
export function curateCards(
  cards: [string, string][],
  glosses: ReadonlyMap<string, readonly string[]>,
  maxLength: number,
): [string, string][] {
  const curated: [string, string][] = [];
  const done = new Set<string>();
  for (const [front, back] of cards) {
    if ([...front].length > maxLength) {
      curated.push([front, back]);
      continue;
    }
    const replacements = glosses.get(front);
    if (replacements === undefined) {
      curated.push([front, back]);
      continue;
    }
    if (done.has(front)) continue;
    done.add(front);
    for (const gloss of replacements) curated.push([front, gloss]);
  }
  return curated;
}

/** True when every short lemma in the card list has a curated entry. */
export function missingCuratedLemmas(
  cards: [string, string][],
  glosses: ReadonlyMap<string, readonly string[]>,
  maxLength: number,
): string[] {
  const missing = new Set<string>();
  for (const [front] of cards) {
    if ([...front].length <= maxLength && !glosses.has(front)) missing.add(front);
  }
  return [...missing];
}
