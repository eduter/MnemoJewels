import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DeckData } from '../src/types';
import {
  SHORT_WORD_GLOSSES,
  curatedGlossesFor,
  curateCards,
  isShortWord,
} from '../tools/russian/shortWordCuration.ts';

const russianDeck = JSON.parse(
  readFileSync(resolve('public/decks/top-ru-en.json'), 'utf8'),
) as DeckData;

describe('short-word curation', () => {
  it('detects lemmas of four characters or fewer', () => {
    expect(isShortWord('что')).toBe(true);
    expect(isShortWord('слово')).toBe(false);
  });

  it('drops transliteration and grammar-label noise', () => {
    const cards = curateCards([
      ['и', 'and'],
      ['и', 'yi'],
      ['а', 'a'],
      ['а', 'criminal'],
    ]);
    expect(cards).toEqual([
      ['и', 'and'],
      ['а', 'and'],
      ['а', 'but'],
    ]);
  });

  it('replaces a lemma\'s glosses while preserving first-occurrence order', () => {
    const cards = curateCards([
      ['дом', 'house'],
      ['проблема', 'problem'],
      ['и', 'and'],
      ['дом', 'building'],
      ['и', 'yi'],
    ]);
    expect(cards).toEqual([
      ['дом', 'house'],
      ['дом', 'home'],
      ['проблема', 'problem'],
      ['и', 'and'],
    ]);
  });

  it('leaves lemmas longer than four characters untouched', () => {
    const cards: [string, string][] = [['проблема', 'problem']];
    expect(curateCards(cards)).toEqual(cards);
  });

  it('caps every curated lemma at three glosses', () => {
    for (const glosses of SHORT_WORD_GLOSSES.values()) {
      expect(glosses.length).toBeGreaterThan(0);
      expect(glosses.length).toBeLessThanOrEqual(3);
    }
  });

  it('covers every short lemma in the shipped deck', () => {
    const shortLemmas = new Set(
      russianDeck.cards.map(card => card[0]).filter(isShortWord),
    );
    for (const lemma of shortLemmas) {
      expect(curatedGlossesFor(lemma)).not.toBeNull();
    }
  });
});
