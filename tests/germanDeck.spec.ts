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
    expect(deck.version).toBe(3);
    expect(deck.languageFront).toBe('de');
    expect(deck.languageBack).toBe('en');
    expect(deck.cards.length).toBeGreaterThan(3000);
    expect(deck.pronunciations).toBeDefined();
    expect(deck.lexicon).toBeUndefined();
  });

  it('covers 3,000 German lemmas with high IPA coverage', () => {
    const lemmas = new Set(deck.cards.map(card => card[0].toLowerCase()));

    // The Jev triage drops misleading candidate pairs, not lemmas, so the full
    // 3,000 remain after the pass.
    expect(lemmas.size).toBe(3000);
    expect(
      deck.cards.filter(card => deck.pronunciations![`de:${card[0]}`]?.length).length,
    ).toBeGreaterThan(2500);
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
    expect(deck.cards).toContainEqual(['Problem', 'problem']);
    expect(deck.pronunciations!['de:Problem']?.length).toBeGreaterThan(0);
    expect(deck.pronunciations!['en:problem']?.length).toBeGreaterThan(0);
  });

  it('capitalizes German nouns using the Wiktionary spelling', () => {
    // The Kelly list is lowercase (`haus`), Wiktionary capitalizes nouns
    // (`Haus`); the card front must use the canonical spelling, not the
    // frequency-list one.
    const cards = cardsByFront(deck);
    expect(cards.get('Haus')).toEqual(['house', 'home']);
    expect(cards.has('haus')).toBe(false);
    expect(cards.get('Frau')).toContain('woman');
    expect(cards.get('Abend')).toContain('evening');
    expect(cards.get('Wasser')).toContain('water');
  });

  it('splits a case-homograph into a lowercase word and a capitalized noun', () => {
    // `arm` (poor) and `Arm` (arm) are different words, so the deck carries both
    // as separate cards rather than folding the noun onto the lowercase lemma.
    const cards = cardsByFront(deck);
    expect(cards.get('arm')).toEqual(['poor']);
    expect(cards.get('Arm')).toContain('arm');
    // The split covers the everyday pairs, including ones whose noun meaning was
    // previously dropped altogether (`Fest`, `Gut`).
    expect(cards.get('morgen')).toEqual(['tomorrow']);
    expect(cards.get('Morgen')).toContain('morning');
    expect(cards.get('weise')).toEqual(['wise']);
    expect(cards.get('Weise')).toContain('way');
    expect(cards.get('fest')).toContain('firm');
    expect(cards.get('Fest')).toContain('festival');
    expect(cards.get('gut')).toContain('good');
    expect(cards.get('Gut')).toContain('estate');
    // A lowercase lemma with no capitalized noun homograph stays a single card.
    expect(cards.get('sie')).toContain('she');
    expect(cards.has('Sie')).toBe(false);
  });

  it('does not replace a common word with a proper-noun homograph', () => {
    // `seine` is an inflection of `sein` (possessive), not the river `Seine`.
    // Its Wiktionary entry carries no translation of its own, but the name
    // homograph must not fill the gap.
    const cards = cardsByFront(deck);
    expect(cards.has('Seine')).toBe(false);
    expect(cards.get('seine') ?? []).not.toContain('river');
  });

  it('applies the curated short-word glosses instead of the raw links', () => {
    const cards = cardsByFront(deck);
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

function cardsByFront(deck: DeckData): Map<string, string[]> {
  const cards = new Map<string, string[]>();
  for (const [front, back] of deck.cards) {
    cards.set(front, [...(cards.get(front) ?? []), back]);
  }
  return cards;
}

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
