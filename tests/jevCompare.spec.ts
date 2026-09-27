import { describe, expect, it } from 'vitest';
import { compare, type Curation } from '../tools/jev/compare.ts';
import type { TriageReport, TriageSummary } from '../tools/jev/types.ts';

function lemma(front: string, candidates: [back: string, misleading: number][]): TriageSummary {
  return {
    front,
    best: candidates[0][0],
    bestConfidence: 0.9,
    worst: candidates[candidates.length - 1][0],
    worstConfidence: 0.9,
    keep: candidates.filter(([, m]) => m < 0.5).map(([b]) => b),
    drop: candidates.filter(([, m]) => m >= 0.5).map(([b]) => b),
    flagged: false,
    candidates: candidates.map(([back, misleading]) => ({
      front,
      back,
      misleading,
      usefulness: 1.5,
      keep: misleading < 0.5,
      reason: misleading < 0.5 ? 'keep' : 'misleading',
    })),
  };
}

function report(byLemma: TriageSummary[]): TriageReport {
  return {
    model: 'test',
    endpoint: 'https://example.test',
    deck: 'test',
    totalCards: 0,
    processedCards: 0,
    keptCards: 0,
    droppedCards: 0,
    flaggedLemmas: 0,
    inputTokens: 0,
    outputTokens: 0,
    byLemma,
  };
}

const curation: Curation = {
  maxLength: 4,
  glosses: new Map([
    ['на', ['on', 'to']],
    ['мой', ['mine']],
  ]),
};

describe('Jev vs hand curation', () => {
  it('separates false drops of wanted senses from false keeps of extra ones', () => {
    const result = compare(report([
      // Jev keeps on, drops to -> "to" is a false drop of a curated sense.
      lemma('на', [['on', 0.1], ['to', 0.5]]),
      // Jev keeps a sense the curator did not list -> false keep.
      lemma('мой', [['mine', 0.3], ['my', 0.2]]),
    ]), curation);
    expect(result.evaluated).toBe(4);
    expect(result.exactMatches).toBe(2);
    expect(result.jevDropsCurated.map(r => r.back)).toEqual(['to']);
    expect(result.jevKeepsUncurated.map(r => r.back)).toEqual(['my']);
    expect(result.metrics).toMatchObject({ falseDrop: 1, falseKeep: 1 });
    expect(result.metrics.recall).toBeCloseTo(2 / 3);
    expect(result.metrics.precision).toBeCloseTo(2 / 3);
  });

  it('ignores lemmas absent from the curation and lemmas over the length limit', () => {
    const result = compare(report([
      lemma('книга', [['book', 0.0]]),
      lemma('дом', [['house', 0.0]]),
    ]), curation);
    expect(result.evaluated).toBe(0);
  });
});
