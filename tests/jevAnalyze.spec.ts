import { describe, expect, it } from 'vitest';
import { buildReview, defaultReviewOptions, reasonsFor, renderMarkdown } from '../tools/jev/analyze.ts';
import type { TriageReport, TriageSummary } from '../tools/jev/types.ts';

function lemma(
  front: string,
  candidates: [back: string, misleading: number, keep: boolean][],
  extra: Partial<TriageSummary> = {},
): TriageSummary {
  return {
    front,
    best: candidates[0]?.[0] ?? '',
    bestConfidence: 0.9,
    worst: candidates[candidates.length - 1]?.[0] ?? '',
    worstConfidence: 0.9,
    keep: candidates.filter(c => c[2]).map(c => c[0]),
    drop: candidates.filter(c => !c[2]).map(c => c[0]),
    flagged: false,
    candidates: candidates.map(([back, misleading, keep]) => ({
      front,
      back,
      misleading,
      usefulness: 1.5,
      keep,
      reason: keep ? 'keep' : 'misleading',
    })),
    ...extra,
  };
}

function report(byLemma: TriageSummary[]): TriageReport {
  return {
    model: 'test',
    endpoint: 'https://example.test',
    deck: 'test',
    totalCards: byLemma.reduce((n, l) => n + l.candidates.length, 0),
    processedCards: byLemma.reduce((n, l) => n + l.candidates.length, 0),
    keptCards: 0,
    droppedCards: 0,
    flaggedLemmas: 0,
    inputTokens: 0,
    outputTokens: 0,
    byLemma,
  };
}

const opts = defaultReviewOptions();

describe('Jev review analyzer', () => {
  it('leaves confident decisions settled and flags near-threshold keeps and drops', () => {
    const buckets = buildReview(report([
      lemma('дом', [['house', 0.02, true], ['home', 0.90, false]]),
      lemma('и', [['and', 0.45, true], ['as well', 0.62, false]]),
    ]), opts);
    expect(buckets.report.evaluatedCards).toBe(4);
    expect(buckets.report.reviewCards).toBe(2);
    expect(buckets.report.settledCards).toBe(2);
    expect(buckets.byReason['uncertain-keep'].map(e => e.back)).toEqual(['and']);
    expect(buckets.byReason['uncertain-drop'].map(e => e.back)).toEqual(['as well']);
  });

  it('flags a lemma the policy would empty', () => {
    const buckets = buildReview(report([
      lemma('лук', [['bow', 0.71, false], ['onion', 0.55, false]]),
    ]), opts);
    expect(buckets.emptiedLemmas).toEqual([
      expect.objectContaining({ front: 'лук', candidates: ['bow', 'onion'] }),
    ]);
    expect(buckets.byReason['lemma-emptied']).toHaveLength(2);
  });

  it('flags low usefulness and ambiguous best pick near the line', () => {
    const low = lemma('раз', [['time', 0.45, true]], { bestConfidence: 0.3 });
    low.candidates[0].usefulness = 0.2;
    const buckets = buildReview(report([low]), opts);
    const reasons = buckets.entries[0].band;
    expect(reasons).toContain('ambiguous-best-pick');
    expect(reasons).toContain('low-usefulness');
  });

  it('does not attach usefulness flags to confidently kept cards', () => {
    const entry = reasonsFor(lemma('дом', [['house', 0.01, true]], { bestConfidence: 0.2 }), 'house', opts);
    expect(entry).toEqual([]);
  });

  it('renders markdown with the counts and reason sections', () => {
    const md = renderMarkdown(buildReview(report([
      lemma('и', [['and', 0.45, true], ['as well', 0.62, false]]),
    ]), opts), opts);
    expect(md).toContain('# Jev triage review');
    expect(md).toContain('## Kept, but near the drop line (1)');
    expect(md).toContain('## Dropped, but near the keep line (1)');
    expect(md).toContain('| и | and | keep |');
  });
});
