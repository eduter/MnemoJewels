import { describe, expect, it } from 'vitest';
import {
  englishFromSenseLink,
  shouldRejectHeuristicGloss,
  translationsForSense,
} from '../tools/russian/translationQuality.ts';

describe('translationQuality', () => {
  const englishHeadwords = new Set([
    'and',
    'relative clause',
    'dative case',
    'problem',
  ]);

  it('drops Wikipedia link targets', () => {
    expect(englishFromSenseLink([
      'declarative content clause',
      'w:Content clause#Declarative content clauses',
    ])).toBeNull();
  });

  it('keeps ordinary English wikilinks', () => {
    expect(englishFromSenseLink(['and', 'and'])).toBe('and');
  });

  it('drops gloss-only usage notes without headwords', () => {
    const sense = {
      glosses: ['used as an emphasiser, including in a few set phrases'],
    };
    expect(translationsForSense(sense, { englishHeadwords })).toEqual([]);
  });

  it('rejects heuristic garbage on cards', () => {
    expect(shouldRejectHeuristicGloss('тот', 'relative clause')).toBe(true);
    expect(shouldRejectHeuristicGloss('должен', 'dative case')).toBe(true);
    expect(shouldRejectHeuristicGloss('и', 'and')).toBe(false);
    expect(shouldRejectHeuristicGloss('если', 'in case')).toBe(false);
  });

  it('keeps grammar-term lemmas on their POS translations', () => {
    const sense = { links: [['verb', 'verb']], glosses: ['verb'] };
    expect(translationsForSense(sense, {
      russianLemma: 'глагол',
      englishHeadwords: new Set(['verb']),
    })).toEqual([{ value: 'verb', sources: new Set(['link']) }]);
  });
});
