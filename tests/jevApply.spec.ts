import { describe, expect, it } from 'vitest';
import { applyDrops } from '../tools/jev/apply.ts';
import type { DeckData } from '../src/types';
import type { DropFile } from '../tools/jev/types.ts';

function deck(overrides: Partial<DeckData> = {}): DeckData {
  return {
    uid: 'test-deck',
    version: 3,
    displayName: 'Test',
    languageFront: 'sv',
    languageBack: 'en',
    cards: [['hus', 'house'], ['hus', 'building'], ['bil', 'car']],
    pronunciations: {
      'sv:hus': ['[hʉːs]'],
      'sv:bil': ['[biːl]'],
      'en:house': ['/haʊs/'],
      'en:building': ['/ˈbɪldɪŋ/'],
      'en:car': ['/kɑː/'],
    },
    ...overrides,
  };
}

function drops(cards: [string, string][]): DropFile {
  return {
    generatedBy: 'test',
    model: 'test',
    deck: 'test-deck',
    cards: cards.map(([front, back]) => ({ front, back, reason: 'misleading' })),
  };
}

describe('applyDrops', () => {
  it('removes the flagged pairs and keeps the rest', () => {
    const result = applyDrops(deck(), drops([['hus', 'building']]), 4);
    expect(result.removed).toBe(1);
    expect(result.deck.cards).toEqual([['hus', 'house'], ['bil', 'car']]);
    expect(result.deck.version).toBe(4);
  });

  it('prunes pronunciations no surviving card references', () => {
    const result = applyDrops(deck(), drops([['hus', 'building']]), 4);
    // en:building was only reachable through the dropped pair.
    expect(result.prunedPronunciations).toBe(1);
    expect(Object.keys(result.deck.pronunciations!).sort()).toEqual([
      'en:car', 'en:house', 'sv:bil', 'sv:hus',
    ]);
  });

  it("keys pronunciations by the deck's declared languages, not hardcoded ru/en", () => {
    // A deck whose back language is not English still prunes correctly: the
    // `en:*` keys are not what this deck's back language claims, so they go.
    const result = applyDrops(
      deck({ languageBack: 'de' }),
      drops([['hus', 'building']]),
      4,
    );
    expect(result.prunedPronunciations).toBe(3);
    expect(Object.keys(result.deck.pronunciations!).sort()).toEqual(['sv:bil', 'sv:hus']);
  });

  it('bumps the version by one when none is given', () => {
    const result = applyDrops(deck(), drops([]), undefined);
    expect(result.deck.version).toBe(4);
  });

  it('does not touch cards when the drop file is empty', () => {
    const result = applyDrops(deck(), drops([]), 4);
    expect(result.removed).toBe(0);
    expect(result.prunedPronunciations).toBe(0);
    expect(result.deck.cards).toHaveLength(3);
  });

  it('tolerates a deck without pronunciations', () => {
    const result = applyDrops(
      deck({ pronunciations: undefined }),
      drops([['hus', 'building']]),
      4,
    );
    expect(result.prunedPronunciations).toBe(0);
    expect(result.deck.pronunciations).toEqual({});
  });
});
