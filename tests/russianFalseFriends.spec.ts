import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cardDistance, createDistanceContext, mappedCardsConflict } from '../src/alternativeSelection';
import type { CardWords } from '../src/alternativeSelection';
import { normalizeIpa } from '../src/lexicalSimilarity';

// Russian/English "false friends": the pair sounds alike but means something
// different. A learner who groups them by pronunciation should be reminded of
// the trap, so the deck's alternative selection should be able to surface them.
// This exercises the whole path the Russian deck uses: the `pronunciations`
// map, the cross-language IPA distance, and the candidate ranking.
const FALSE_FRIENDS: [russian: string, english: string][] = [
  ['магазин', 'magazine'],
  ['фамилия', 'family'],
  ['кабинет', 'cabinet'],
  ['лук', 'luck'],
  ['шампунь', 'champagne'],
  ['цель', 'cell'],
  ['рецепт', 'receipt'],
];

const russianDeck = JSON.parse(readFileSync('public/decks/top-ru-en.json', 'utf8'));
const cards: CardWords[] = russianDeck.cards.map(([front, back]: [string, string]) => ({ front, back }));
const context = createDistanceContext(
  cards,
  russianDeck.pronunciations,
  russianDeck.languageFront,
  russianDeck.languageBack,
);

const wordMappings: Record<string, string[]> = {};
for (const card of cards) {
  if (!(wordMappings[card.front] ?? []).includes(card.back)) {
    (wordMappings[card.front] ??= []).push(card.back);
  }
}

function distance(candidate: CardWords, first: CardWords): number {
  return cardDistance(candidate, first, context);
}

/** Deterministic stride sample, fast enough for a unit test and spread across the deck. */
function sample(target: string): CardWords[] {
  return cards.filter((_, index) => index % 17 === 0 && cards[index].back !== target);
}

describe('IPA-aware distance recognises Russian false friends', () => {
  it('scores each false friend far below the typical deck answer', () => {
    for (const [russian, english] of FALSE_FRIENDS) {
      const first = cards.find(card => card.front === russian);
      const candidate = cards.find(card => card.back === english);
      expect(first && candidate, `${russian}/${english} cards`).toBeTruthy();
      if (!first || !candidate) continue;

      const falseFriendDistance = distance(candidate, first);
      const others = sample(english)
        .filter(card => !mappedCardsConflict(card, first, wordMappings))
        .map(card => distance(card, first))
        .sort((a, b) => a - b);
      const median = others[Math.floor(others.length / 2)];

      expect(
        falseFriendDistance,
        `${russian}/${english}: distance ${falseFriendDistance} vs median ${median}`,
      ).toBeLessThan(median);
    }
  });

  it('uses the phonological comparison, not raw symbol equality', () => {
    // The root cause: comparing IPA characters treats allophones as distinct, so
    // a false friend whose transcription uses different symbols for the same
    // sounds looks far away. Segment-aware distance should collapse that gap.
    const cases: [russian: string, english: string][] = [
      ['магазин', 'magazine'],
      ['кабинет', 'cabinet'],
      ['лук', 'luck'],
    ];

    const naiveIpaDistance = (left: string[] | undefined, right: string[] | undefined): number => {
      if (!left?.length || !right?.length) return Infinity;
      let best = Infinity;
      for (const a of left) {
        for (const b of right) {
          const x = normalizeIpa(a);
          const y = normalizeIpa(b);
          const previous = Array.from({ length: y.length + 1 }, (_, index) => index);
          for (let i = 1; i <= x.length; i++) {
            let diagonal = previous[0];
            previous[0] = i;
            for (let j = 1; j <= y.length; j++) {
              const saved = previous[j];
              previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (x[i - 1] === y[j - 1] ? 0 : 1));
              diagonal = saved;
            }
          }
          best = Math.min(best, previous[y.length]);
        }
      }
      return best;
    };

    for (const [russian, english] of cases) {
      const first = cards.find(card => card.front === russian);
      const candidate = cards.find(card => card.back === english);
      if (!first || !candidate) continue;

      const naive = naiveIpaDistance(
        russianDeck.pronunciations[`ru:${first.front}`],
        russianDeck.pronunciations[`en:${candidate.back}`],
      );
      const phonological = distance(candidate, first);
      expect(phonological, `${russian}/${english}`).toBeLessThan(naive);
    }
  });
});
