import { describe, expect, it } from 'vitest';
import {
  englishFromSenseLink,
  shouldRejectHeuristicGloss,
  translationsForSense,
} from '../tools/decks/translationQuality.ts';

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

  it('drops links into another language section', () => {
    // `de#Spanish` under `antes` ("ahead of (when followed by de)") is a
    // cross-reference to the Spanish entry for "de", not a translation.
    expect(englishFromSenseLink(['de', 'de#Spanish'])).toBeNull();
    expect(englishFromSenseLink(['partie', 'partie#French'])).toBeNull();
    expect(englishFromSenseLink(['copa', 'copa#Spanish'])).toBeNull();
  });

  it('keeps English-section and plain self-links', () => {
    expect(englishFromSenseLink(['color', 'color#English'])).toBe('color');
    expect(englishFromSenseLink(['party', 'party'])).toBe('party');
    expect(englishFromSenseLink(['law', 'law#English'])).toBe('law');
  });

  it('drops topic labels that are not part of the gloss', () => {
    // `parte` → `(law) party …` links both `law` (the topic label) and `party`.
    const sense = {
      glosses: ['party (e.g. a third party, state party, to be party to)'],
      topics: ['law'],
      links: [['law', 'law#English'], ['party', 'party']],
    };
    expect(translationsForSense(sense, { englishHeadwords: new Set(['law', 'party']) }))
      .toEqual([{ value: 'party', sources: new Set(['link']) }]);
  });

  it('keeps a topic word that is genuinely part of the gloss', () => {
    const sense = {
      glosses: ['law (particular piece of legislation)'],
      topics: ['law'],
      links: [['law', 'law#English']],
    };
    expect(translationsForSense(sense, { englishHeadwords: new Set(['law']) }))
      .toEqual([{ value: 'law', sources: new Set(['link']) }]);
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
      frontLemma: 'глагол',
      englishHeadwords: new Set(['verb']),
    })).toEqual([{ value: 'verb', sources: new Set(['link']) }]);
  });
});
