// Reviews a Jev triage report and separates the calls that are already settled
// from the ones a human should look at.
//
// The triage policy is a single threshold on `misleading` (default 0.5). That is
// fine for the confident majority, but the interesting cases sit near the line,
// where Jev's probability is close enough to the boundary that either decision
// is defensible. This script buckets those cases so review time goes where it
// matters, and leaves the confident cards alone.
//
//   node --experimental-strip-types tools/jev/analyze.ts \
//     --report .cache/jev/full/triage-report.json \
//     --out    .cache/jev/full/review
//
// Writes <out>/review.json (machine-readable) and <out>/review.md (to read).
//
// Deck-agnostic: it only reads the triage report, so it works for any deck.

import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { DEFAULT_BAND_THRESHOLDS, type TriageReport, type TriageSummary } from './types.ts';

export interface ReviewOptions {
  /** Half-width of the review band around the drop threshold. */
  band: number;
  /** Drop threshold the triage used; the band straddles it. */
  misleadingThreshold: number;
  /** Best/worst pick confidence below this is treated as ambiguous. */
  ambiguousPick: number;
  /** Lemma usefulness below this is treated as low-value. */
  scoreThreshold: number;
}

export function defaultReviewOptions(overrides: Partial<ReviewOptions> = {}): ReviewOptions {
  return {
    band: 0.15,
    misleadingThreshold: DEFAULT_BAND_THRESHOLDS.misleading,
    ambiguousPick: DEFAULT_BAND_THRESHOLDS.ambiguousPick,
    scoreThreshold: DEFAULT_BAND_THRESHOLDS.score,
    ...overrides,
  };
}

export type ReviewReason =
  | 'uncertain-keep'
  | 'uncertain-drop'
  | 'ambiguous-best-pick'
  | 'low-usefulness'
  | 'lemma-emptied';

export interface ReviewEntry {
  front: string;
  back: string;
  decision: 'keep' | 'drop';
  misleading: number;
  usefulness: number;
  band: ReviewReason[];
  /** The other candidate translations, for context while judging this card. */
  siblings: string[];
}

export interface ReviewBuckets {
  report: {
    deck: string;
    endpoint: string;
    model: string;
    totalCards: number;
    evaluatedCards: number;
    settledCards: number;
    reviewCards: number;
    reviewLemmas: number;
  };
  /** Cards grouped by why they need review, most-suspect first. */
  byReason: Record<ReviewReason, ReviewEntry[]>;
  entries: ReviewEntry[];
  /**
   * Lemmas whose `keep` list is empty but that have a plausible best candidate,
   * i.e. the whole lemma would be removed by the policy.
   */
  emptiedLemmas: { front: string; best: string; bestConfidence: number; candidates: string[] }[];
}

export function reasonsFor(
  lemma: TriageSummary,
  back: string,
  options: ReviewOptions,
): ReviewReason[] {
  const candidate = lemma.candidates.find(c => c.back === back);
  if (!candidate) return [];
  const reasons: ReviewReason[] = [];
  const nearLine = candidate.misleading >= options.misleadingThreshold - options.band;
  if (candidate.keep) {
    if (nearLine) reasons.push('uncertain-keep');
  } else {
    if (candidate.misleading <= options.misleadingThreshold + options.band) reasons.push('uncertain-drop');
    if (lemma.candidates.every(c => !c.keep)) reasons.push('lemma-emptied');
  }
  if (nearLine) {
    if (lemma.bestConfidence < options.ambiguousPick) reasons.push('ambiguous-best-pick');
    if (candidate.usefulness < options.scoreThreshold) reasons.push('low-usefulness');
  }
  return reasons;
}

export function buildReview(report: TriageReport, options: ReviewOptions): ReviewBuckets {
  const byReason: ReviewBuckets['byReason'] = {
    'uncertain-keep': [],
    'uncertain-drop': [],
    'ambiguous-best-pick': [],
    'low-usefulness': [],
    'lemma-emptied': [],
  };
  const entries: ReviewEntry[] = [];
  const emptiedLemmas: ReviewBuckets['emptiedLemmas'] = [];
  const reviewLemmas = new Set<string>();
  let evaluatedCards = 0;

  for (const lemma of report.byLemma) {
    const candidates = lemma.candidates ?? [];
    evaluatedCards += candidates.length;
    if (candidates.length > 0 && candidates.every(c => !c.keep)) {
      emptiedLemmas.push({
        front: lemma.front,
        best: lemma.best,
        bestConfidence: lemma.bestConfidence,
        candidates: candidates.map(c => c.back),
      });
    }
    const siblings = candidates.map(c => c.back);
    for (const candidate of candidates) {
      const reasons = reasonsFor(lemma, candidate.back, options);
      if (reasons.length === 0) continue;
      reviewLemmas.add(lemma.front);
      const entry: ReviewEntry = {
        front: candidate.front,
        back: candidate.back,
        decision: candidate.keep ? 'keep' : 'drop',
        misleading: candidate.misleading,
        usefulness: candidate.usefulness,
        band: reasons,
        siblings,
      };
      entries.push(entry);
      for (const reason of reasons) byReason[reason].push(entry);
    }
  }

  for (const list of Object.values(byReason)) list.sort((a, b) => b.misleading - a.misleading);
  entries.sort((a, b) => b.misleading - a.misleading);

  return {
    report: {
      deck: report.deck,
      endpoint: report.endpoint,
      model: report.model,
      totalCards: report.totalCards,
      evaluatedCards,
      settledCards: evaluatedCards - entries.length,
      reviewCards: entries.length,
      reviewLemmas: reviewLemmas.size,
    },
    byReason,
    entries,
    emptiedLemmas,
  };
}

function formatEntry(entry: ReviewEntry): string {
  const siblings = entry.siblings.filter(back => back !== entry.back).join(', ');
  return `| ${entry.front} | ${entry.back} | ${entry.decision} | ${entry.misleading.toFixed(3)} `
    + `| ${entry.usefulness.toFixed(2)} | ${entry.band.join(', ')} | ${siblings} |`;
}

export function renderMarkdown(buckets: ReviewBuckets, options: ReviewOptions): string {
  const r = buckets.report;
  const lines: string[] = [
    '# Jev triage review',
    '',
    `Deck: ${r.deck}  `,
    `Endpoint: ${r.endpoint}  `,
    `Model: ${r.model}`,
    '',
    `Evaluated ${r.evaluatedCards} cards. ${r.settledCards} are settled by the threshold; `,
    `${r.reviewCards} across ${r.reviewLemmas} lemmas need a closer look.`,
    '',
    `Thresholds: drop when misleading >= ${options.misleadingThreshold}; review band +/-${options.band}; `
      + `ambiguous best-pick below ${options.ambiguousPick}; low usefulness below ${options.scoreThreshold}.`,
    '',
  ];

  const titles: Record<ReviewReason, string> = {
    'uncertain-keep': 'Kept, but near the drop line',
    'uncertain-drop': 'Dropped, but near the keep line',
    'ambiguous-best-pick': 'No clear best translation for the lemma',
    'low-usefulness': 'Lemma has little value for a beginner',
    'lemma-emptied': 'Drop empties the lemma entirely',
  };
  const table = ['| front | back | decision | misleading | usefulness | reason | siblings |', '| --- | --- | --- | --- | --- | --- | --- |'];

  for (const reason of Object.keys(buckets.byReason) as ReviewReason[]) {
    const list = buckets.byReason[reason];
    if (list.length === 0) continue;
    lines.push(`## ${titles[reason]} (${list.length})`, '', ...table, ...list.map(formatEntry), '');
  }

  lines.push(`## Lemmas the policy would empty (${buckets.emptiedLemmas.length})`, '');
  if (buckets.emptiedLemmas.length > 0) {
    lines.push('| front | best guess | confidence | candidates |', '| --- | --- | --- | --- |');
    for (const lemma of buckets.emptiedLemmas) {
      lines.push(`| ${lemma.front} | ${lemma.best} | ${lemma.bestConfidence.toFixed(2)} | ${lemma.candidates.join(', ')} |`);
    }
  } else {
    lines.push('None.');
  }
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      report: { type: 'string', required: true },
      out: { type: 'string', required: true },
      band: { type: 'string' },
    },
    allowPositionals: false,
  });

  const options = defaultReviewOptions({
    band: values.band ? Number(values.band) : undefined,
  });

  const report = JSON.parse(await readFile(resolve(values.report!), 'utf8')) as TriageReport;
  const buckets = buildReview(report, options);
  const out = resolve(values.out!);
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'review.json'), `${JSON.stringify(buckets, null, 2)}\n`);
  await writeFile(resolve(out, 'review.md'), renderMarkdown(buckets, options));
  console.log(
    `Analyzed ${buckets.report.evaluatedCards} cards: ${buckets.report.settledCards} settled, `
    + `${buckets.report.reviewCards} need review across ${buckets.report.reviewLemmas} lemmas. `
    + `Wrote ${resolve(out, 'review.json')} and review.md`,
  );
}

if (process.argv[1] && import.meta.url === `file://${resolve(process.argv[1])}`) {
  await main();
}
