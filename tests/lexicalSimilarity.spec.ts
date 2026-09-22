import { mappedCardsConflict } from '../src/alternativeSelection';
import { lexicalDistance, lexicalSimilarity } from '../src/lexicalSimilarity';
import type { LexicalItem } from '../src/types';

describe('lexical similarity', () => {
  const russianProblem: LexicalItem = {
    id: 'ru:problem',
    language: 'ru',
    lemma: 'проблема',
    ipa: ['[prɐˈblʲemə]'],
  };
  const englishProblem: LexicalItem = {
    id: 'en:problem',
    language: 'en',
    lemma: 'problem',
    ipa: ['/ˈprɒbləm/'],
  };

  it('combines transliterated orthography and IPA', () => {
    const similarity = lexicalSimilarity(russianProblem, englishProblem);

    expect(similarity.score).toBeGreaterThan(0.65);
    expect(similarity.phonologicalScore).toBeGreaterThan(0.5);
    expect(similarity.orthographicScore).toBeGreaterThan(0.7);
  });

  it('treats missing IPA as unavailable rather than an error', () => {
    expect(lexicalDistance(russianProblem, {
      id: 'en:issue',
      language: 'en',
      lemma: 'issue',
    })).toBeNull();
  });

  it('does not treat lexical similarity as semantic equivalence', () => {
    const mappings = {
      магазин: ['shop'],
      magazine: ['journal'],
    };

    expect(mappedCardsConflict(
      { front: 'магазин', back: 'shop' },
      { front: 'magazine', back: 'journal' },
      mappings,
    )).toBe(false);
  });
});

describe('alternative ambiguity checks', () => {
  it('rejects another translation of the prompt', () => {
    const mappings = {
      замок: ['castle', 'lock'],
      крепость: ['fortress'],
    };

    expect(mappedCardsConflict(
      { front: 'замок', back: 'castle' },
      { front: 'крепость', back: 'lock' },
      mappings,
    )).toBe(true);
  });

  it('rejects cards sharing an answer while allowing unrelated cards', () => {
    const mappings = {
      замок: ['castle'],
      дворец: ['castle', 'palace'],
      ключ: ['key'],
    };

    expect(mappedCardsConflict(
      { front: 'замок', back: 'castle' },
      { front: 'дворец', back: 'castle' },
      mappings,
    )).toBe(true);
    expect(mappedCardsConflict(
      { front: 'замок', back: 'castle' },
      { front: 'ключ', back: 'key' },
      mappings,
    )).toBe(false);
  });
});
