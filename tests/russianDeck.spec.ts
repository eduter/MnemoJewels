import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DeckData } from '../src/types';

const russianDeck = JSON.parse(
  readFileSync(resolve('public/decks/top-ru-en.json'), 'utf8'),
) as DeckData;

describe('Russian deck', () => {
  it('loads as a regular Russian-to-English deck', () => {
    expect(russianDeck.uid).toBe('top-ru-en');
    expect(russianDeck.languageFront).toBe('ru');
    expect(russianDeck.languageBack).toBe('en');
    expect(russianDeck.cards.length).toBeGreaterThan(3000);
    expect(russianDeck.lexicon).toBeDefined();
  });

  it('contains 3,000 ranked Russian lemmas with high IPA coverage', () => {
    const russianItems = Object.values(russianDeck.lexicon!.items)
      .filter(item => item.language === 'ru');

    expect(russianItems).toHaveLength(3000);
    expect(russianItems.filter(item => item.ipa?.length).length).toBeGreaterThan(2800);
    expect(russianItems.every(item => item.frequency?.rank)).toBe(true);
  });

  it('contains English lexical items and English IPA', () => {
    const englishItems = Object.values(russianDeck.lexicon!.items)
      .filter(item => item.language === 'en');

    expect(englishItems.length).toBeGreaterThan(2000);
    expect(englishItems.filter(item => item.ipa?.length).length).toBeGreaterThan(1500);
  });

  it('preserves many-to-many translation relationships', () => {
    const relations = russianDeck.lexicon!.translations;
    const targetsBySource = groupBy(relations, relation => relation.source, relation => relation.target);
    const sourcesByTarget = groupBy(relations, relation => relation.target, relation => relation.source);

    expect([...targetsBySource.values()].some(targets => targets.size > 1)).toBe(true);
    expect([...sourcesByTarget.values()].some(sources => sources.size > 1)).toBe(true);
    expect(relations.some(relation => relation.senses?.length)).toBe(true);
  });

  it('represents проблема/problem with IPA and similarity metadata', () => {
    const items = russianDeck.lexicon!.items;
    const relation = russianDeck.lexicon!.translations.find(candidate =>
      items[candidate.source].lemma === 'проблема'
        && items[candidate.target].lemma === 'problem');

    expect(relation).toBeDefined();
    expect(items[relation!.source].ipa?.length).toBeGreaterThan(0);
    expect(items[relation!.target].ipa?.length).toBeGreaterThan(0);
    expect(russianDeck.lexicon!.similarities).toContainEqual(
      expect.objectContaining({
        source: relation!.source,
        target: relation!.target,
        sourceType: 'computed',
      }),
    );
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
