import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DeckData } from '../src/types';

const decks: Array<[string, string, string, string, string]> = [
  ['top-es-en', 'es', 'en', 'problema', 'problem'],
  ['top-fr-en', 'fr', 'en', 'problème', 'problem'],
  ['top-pt-en', 'pt', 'en', 'problema', 'problem'],
  ['top-en-pt', 'en', 'pt', 'problem', 'problema'],
];

describe.each(decks)('%s deck', (uid, languageFront, languageBack, frontSample, backSample) => {
  const deck = JSON.parse(
    readFileSync(resolve(`public/decks/${uid}.json`), 'utf8'),
  ) as DeckData;

  it('loads with the declared front and back languages and IPA only', () => {
    expect(deck.uid).toBe(uid);
    expect(deck.languageFront).toBe(languageFront);
    expect(deck.languageBack).toBe(languageBack);
    expect(deck.cards.length).toBeGreaterThan(3000);
    expect(deck.pronunciations).toBeDefined();
    expect(deck.lexicon).toBeUndefined();
  });

  it('covers most of the generated front lemmas with high IPA coverage', () => {
    const lemmas = new Set(deck.cards.map(card => card[0]));

    // Jev triage removes whole lemmas when every candidate is noise, so the
    // deck starts from 3,000 lemmas and settles somewhat below that.
    expect(lemmas.size).toBeGreaterThan(2700);
    expect(lemmas.size).toBeLessThanOrEqual(3000);
    expect(
      [...lemmas].filter(lemma => deck.pronunciations![`${languageFront}:${lemma}`]?.length).length,
    ).toBeGreaterThan(2700);
  });

  it('includes back-language IPA for many card backs', () => {
    const backLemmas = new Set(deck.cards.map(card => card[1]));

    expect(backLemmas.size).toBeGreaterThan(2000);
    expect(
      [...backLemmas].filter(lemma => deck.pronunciations![`${languageBack}:${lemma}`]?.length).length,
    ).toBeGreaterThan(1500);
  });

  it('stores pronunciations only for lemmas that appear on cards', () => {
    const allowed = new Set<string>();
    for (const [front, back] of deck.cards) {
      allowed.add(`${languageFront}:${front}`);
      allowed.add(`${languageBack}:${back}`);
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
    expect(deck.cards).toContainEqual([frontSample, backSample]);
    expect(deck.pronunciations![`${languageFront}:${frontSample}`]?.length).toBeGreaterThan(0);
    expect(deck.pronunciations![`${languageBack}:${backSample}`]?.length).toBeGreaterThan(0);
  });
});

// The generator drops senses Wiktionary marks obsolete/archaic/dated/rare/
// historical, but these decks were generated before that rule, so the shipped
// files were filtered retroactively. Guard against a regression that lets the
// stale senses back in, while keeping words whose *head template* is tagged
// noncurrent (`mapa` "map", `juiz` "judge") — those are current words.
describe('Portuguese decks exclude obsolete senses', () => {
  it('drops the obsolete-only cards', () => {
    const forward = JSON.parse(readFileSync(resolve('public/decks/top-pt-en.json'), 'utf8')) as DeckData;
    const reverse = JSON.parse(readFileSync(resolve('public/decks/top-en-pt.json'), 'utf8')) as DeckData;

    expect(forward.cards).not.toContainEqual(['al', 'other']);
    expect(forward.cards).not.toContainEqual(['esposa', 'bride']);
    expect(reverse.cards).not.toContainEqual(['other', 'al']);
  });

  it('keeps current words whose head template is tagged noncurrent', () => {
    const forward = JSON.parse(readFileSync(resolve('public/decks/top-pt-en.json'), 'utf8')) as DeckData;
    expect(forward.cards).toContainEqual(['mapa', 'map']);
    expect(forward.cards).toContainEqual(['juiz', 'judge']);
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
