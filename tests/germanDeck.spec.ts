import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeWord } from '../src/alternativeSelection';
import type { DeckData } from '../src/types';

const deck = JSON.parse(
  readFileSync(resolve('public/decks/top-de-en.json'), 'utf8'),
) as DeckData;

describe('German deck', () => {
  it('loads as a German-to-English deck with IPA pronunciations only', () => {
    expect(deck.uid).toBe('top-de-en');
    expect(deck.version).toBe(1);
    expect(deck.languageFront).toBe('de');
    expect(deck.languageBack).toBe('en');
    expect(deck.cards.length).toBeGreaterThan(3000);
    expect(deck.pronunciations).toBeDefined();
    expect(deck.lexicon).toBeUndefined();
  });

  it('covers 3,000 German lemmas with high IPA coverage', () => {
    const lemmas = new Set(deck.cards.map(card => card[0]));

    // German ships unfiltered (no Jev pass yet), so the full 3,000 remain.
    expect(lemmas.size).toBe(3000);
    expect(
      [...lemmas].filter(lemma => deck.pronunciations![`de:${lemma}`]?.length).length,
    ).toBeGreaterThan(2600);
  });

  it('includes English IPA for many card backs', () => {
    const backLemmas = new Set(deck.cards.map(card => card[1]));

    expect(backLemmas.size).toBeGreaterThan(2000);
    expect(
      [...backLemmas].filter(lemma => deck.pronunciations![`en:${lemma}`]?.length).length,
    ).toBeGreaterThan(1500);
  });

  it('stores pronunciations only for lemmas that appear on cards', () => {
    const allowed = new Set<string>();
    for (const [front, back] of deck.cards) {
      allowed.add(`de:${front}`);
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

  it('includes problem/problem with IPA', () => {
    expect(deck.cards).toContainEqual(['problem', 'problem']);
    expect(deck.pronunciations!['de:problem']?.length).toBeGreaterThan(0);
    expect(deck.pronunciations!['en:problem']?.length).toBeGreaterThan(0);
  });

  it('lowercases German nouns so the frequency list matches Wiktionary', () => {
    // The Kelly list is lowercase (`haus`), Wiktionary capitalizes nouns
    // (`Haus`); the deck must key the noun by its lowercase form and no card may
    // carry a capitalized German front.
    expect(deck.cards).toContainEqual(['haus', 'house']);
    expect(deck.cards.some(([front]) => /^[A-ZÄÖÜ]/.test(front))).toBe(false);
  });

  it('applies the curated short-word glosses instead of the raw links', () => {
    const cards = new Map<string, string[]>();
    for (const [front, back] of deck.cards) {
      cards.set(front, [...(cards.get(front) ?? []), back]);
    }
    // Raw sense links gave `das` -> "who", `sie` -> "pedantic", `h` -> "hour".
    expect(cards.get('das')).toEqual(['the', 'that', 'which']);
    expect(cards.get('sie')).toEqual(['she', 'they', 'you']);
    expect(cards.get('h')).toEqual(['h']);
    // Dropped lemmas leave the deck entirely.
    for (const dropped of ['dvd', 'cd', 'npd', 'sms']) {
      expect(cards.has(dropped)).toBe(false);
    }
  });

  it('folds German umlauts and ß for orthographic comparison', () => {
    expect(normalizeWord('Straße', 'de')).toBe('strasse');
    expect(normalizeWord('grün', 'de')).toBe('grun');
    expect(normalizeWord('Haus', 'de')).toBe('haus');
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
