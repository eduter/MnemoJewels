import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DeckData } from '../src/types';

const russianDeck = JSON.parse(
  readFileSync(resolve('public/decks/top-ru-en.json'), 'utf8'),
) as DeckData;

describe('Russian deck', () => {
  it('loads as a Russian-to-English deck with IPA pronunciations only', () => {
    expect(russianDeck.uid).toBe('top-ru-en');
    expect(russianDeck.languageFront).toBe('ru');
    expect(russianDeck.languageBack).toBe('en');
    expect(russianDeck.cards.length).toBeGreaterThan(3000);
    expect(russianDeck.pronunciations).toBeDefined();
    expect(russianDeck.lexicon).toBeUndefined();
  });

  it('covers about 3,000 Russian lemmas with high IPA coverage', () => {
    const russianLemmas = new Set(russianDeck.cards.map(card => card[0]));

    expect(russianLemmas.size).toBe(3000);
    expect(
      [...russianLemmas].filter(lemma => russianDeck.pronunciations![`ru:${lemma}`]?.length).length,
    ).toBeGreaterThan(2800);
  });

  it('includes English IPA for many card backs', () => {
    const englishLemmas = new Set(russianDeck.cards.map(card => card[1]));

    expect(englishLemmas.size).toBeGreaterThan(2000);
    expect(
      [...englishLemmas].filter(lemma => russianDeck.pronunciations![`en:${lemma}`]?.length).length,
    ).toBeGreaterThan(1500);
  });

  it('stores pronunciations only for lemmas that appear on cards', () => {
    const allowed = new Set<string>();
    for (const [russianLemma, englishLemma] of russianDeck.cards) {
      allowed.add(`ru:${russianLemma}`);
      allowed.add(`en:${englishLemma}`);
    }
    for (const key of Object.keys(russianDeck.pronunciations!)) {
      expect(allowed.has(key)).toBe(true);
    }
  });

  it('preserves many-to-many translation relationships', () => {
    const targetsBySource = groupBy(russianDeck.cards, card => card[0], card => card[1]);
    const sourcesByTarget = groupBy(russianDeck.cards, card => card[1], card => card[0]);

    expect([...targetsBySource.values()].some(targets => targets.size > 1)).toBe(true);
    expect([...sourcesByTarget.values()].some(sources => sources.size > 1)).toBe(true);
  });

  it('includes проблема/problem with IPA', () => {
    expect(russianDeck.cards).toContainEqual(['проблема', 'problem']);
    expect(russianDeck.pronunciations!['ru:проблема']?.length).toBeGreaterThan(0);
    expect(russianDeck.pronunciations!['en:problem']?.length).toBeGreaterThan(0);
  });
});

describe('existing decks', () => {
  it.each(['top-no-en', 'top-pt_BR-en', 'top-sv-en'])(
    'keeps the legacy card schema loadable for %s',
    uid => {
      const deck = JSON.parse(
        readFileSync(resolve(`public/decks/${uid}.json`), 'utf8'),
      ) as DeckData;

      expect(deck.cards.length).toBeGreaterThan(0);
      expect(deck.cards.every(card =>
        Array.isArray(card)
          && card.length === 2
          && card.every(value => typeof value === 'string'),
      )).toBe(true);
    },
  );
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
