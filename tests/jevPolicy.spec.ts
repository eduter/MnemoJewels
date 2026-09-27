import { describe, expect, it } from 'vitest';
import { applyPolicy, defaultPolicyOptions } from '../tools/jev/policy.ts';
import type { TriageReport, TriageSummary } from '../tools/jev/types.ts';

function lemma(
  front: string,
  candidates: [back: string, misleading: number][],
  best = candidates[0][0],
): TriageSummary {
  return {
    front,
    best,
    bestConfidence: 0.9,
    worst: candidates[candidates.length - 1][0],
    worstConfidence: 0.9,
    keep: [],
    drop: [],
    flagged: false,
    candidates: candidates.map(([back, misleading]) => ({
      front,
      back,
      misleading,
      usefulness: 1.5,
      keep: false,
      reason: 'misleading',
    })),
  };
}

function report(byLemma: TriageSummary[]): TriageReport {
  return {
    model: 'test',
    endpoint: 'https://example.test',
    deck: 'test',
    totalCards: byLemma.reduce((n, l) => n + l.candidates.length, 0),
    processedCards: 0,
    keptCards: 0,
    droppedCards: 0,
    flaggedLemmas: 0,
    inputTokens: 0,
    outputTokens: 0,
    byLemma,
  };
}

describe('Jev keep/drop policy', () => {
  it('drops above the threshold and keeps below it', () => {
    const result = applyPolicy(report([
      lemma('дом', [['house', 0.1], ['plot', 0.95]]),
    ]), defaultPolicyOptions({ misleadingThreshold: 0.65 }));
    expect(result.keptCards).toBe(1);
    expect(result.dropFile.cards.map(c => c.back)).toEqual(['plot']);
  });

  it('protects the best pick when a threshold would empty the lemma', () => {
    const result = applyPolicy(report([
      lemma('май', [['may', 0.6]]),
    ]), defaultPolicyOptions({ misleadingThreshold: 0.65 }));
    // 0.6 < 0.65, so may is kept normally; use a case above the threshold.
    expect(result.keptCards).toBe(1);

    const emptied = applyPolicy(report([
      lemma('май', [['may', 0.85]]),
    ]), defaultPolicyOptions({ misleadingThreshold: 0.65, protectBest: true }));
    expect(emptied.keptCards).toBe(1);
    expect(emptied.protectedLemmas).toEqual([
      expect.objectContaining({ front: 'май', back: 'may' }),
    ]);
    expect(emptied.dropFile.cards).toEqual([]);
  });

  it('lets a lemma be emptied when the guard is off', () => {
    const result = applyPolicy(report([
      lemma('май', [['may', 0.85]]),
    ]), defaultPolicyOptions({ misleadingThreshold: 0.65, protectBest: false }));
    expect(result.keptCards).toBe(0);
    expect(result.dropFile.cards.map(c => c.back)).toEqual(['may']);
  });

  it('only protects a lemma when every candidate is above the threshold', () => {
    const result = applyPolicy(report([
      lemma('год', [['year', 0.2], ['summer', 0.8]], 'summer'),
    ]), defaultPolicyOptions({ misleadingThreshold: 0.5 }));
    // year is kept on its own, so no guard is needed even though best=summer.
    expect(result.protectedLemmas).toEqual([]);
    expect(result.keptCards).toBe(1);
  });
});
