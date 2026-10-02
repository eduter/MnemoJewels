import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DeckData } from '../src/types';

const decks: Array<[string, string, string]> = [
  ['top-es-en', 'es', 'problema'],
  ['top-fr-en', 'fr', 'problème'],
];

describe.each(decks)('%s deck', (uid, languageFront, sampleLemma) => {
  const deck = JSON.parse(
    readFileSync(resolve(`public/decks/${uid}.json`), 'utf8'),
  ) as DeckData;

  it('loads as a front-to-English deck with IPA pronunciations only', () => {
    expect(deck.uid).toBe(uid);
    expect(deck.languageFront).toBe(languageFront);
    expect(deck.languageBack).toBe('en');
    expect(deck.cards.length).toBeGreaterThan(3000);
    expect(deck.pronunciations).toBeDefined();
    expect(deck.lexicon).toBeUndefined();
  });

  it('covers most of the generated lemmas with high IPA coverage', () => {
    const lemmas = new Set(deck.cards.map(card => card[0]));

    // Jev triage removes whole lemmas when every candidate is noise, so the
    // deck starts from 3,000 lemmas and settles somewhat below that.
    expect(lemmas.size).toBeGreaterThan(2700);
    expect(lemmas.size).toBeLessThanOrEqual(3000);
    expect(
      [...lemmas].filter(lemma => deck.pronunciations![`${languageFront}:${lemma}`]?.length).length,
    ).toBeGreaterThan(2700);
  });

  it('includes English IPA for many card backs', () => {
    const englishLemmas = new Set(deck.cards.map(card => card[1]));

    expect(englishLemmas.size).toBeGreaterThan(2000);
    expect(
      [...englishLemmas].filter(lemma => deck.pronunciations![`en:${lemma}`]?.length).length,
    ).toBeGreaterThan(1500);
  });

  it('stores pronunciations only for lemmas that appear on cards', () => {
    const allowed = new Set<string>();
    for (const [front, back] of deck.cards) {
      allowed.add(`${languageFront}:${front}`);
      allowed.add(`en:${back}`);
    }
    for (const key of Object.keys(deck.pronunciations!)) {
      expect(allowed.has(key)).toBe(true);
    }
  });

  it('preserves many-to-many translation relationships', () => {
    const targetsBySource = groupBy(deck.cards, card => card[0], card => card[1]);
    const sourcesByTarget = groupBy(deck.cards, card => card[1], card => card[0]);

    expect([...targetsBySource.values()].some(targets => targets.size > 1)).toBe(true);
    expect([...sourcesByTarget.values()].some(sources => sources.size > 1)).toBe(true);
  });

  it('includes a well-known example card with IPA', () => {
    expect(deck.cards).toContainEqual([sampleLemma, 'problem']);
    expect(deck.pronunciations![`${languageFront}:${sampleLemma}`]?.length).toBeGreaterThan(0);
    expect(deck.pronunciations!['en:problem']?.length).toBeGreaterThan(0);
  });
});

function groupBy<T>(
  values: T[],
  key: (value: T) => string,
  member: (value: T) => string,
): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();
  for (const value of values) {
    const group = groups.get(key(value)) ?? new Set();
    group.add(member(value));
    groups.set(key(value), group);
  }
  return groups;
}
