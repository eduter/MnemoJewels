// Re-decides keep/drop from a stored triage report without calling Jev again.
//
// The raw Noul probabilities are the expensive part; the threshold is cheap to
// change. Calibration on the labeled sample shows the default 0.5 over-drops
// (drop recall 0.85, keep recall 0.68), so the operating point is worth tuning
// after the fact. This also supports a never-empty guard: if a threshold would
// drop every candidate of a lemma, the lemma's own `best` pick is kept, since
// Jev's `best` and `misleading` questions are independent and it sometimes marks
// the only sensible translation as misleading.
//
//   node --experimental-strip-types tools/jev/policy.ts \
//     --report .cache/jev/full/triage-report.json \
//     --out    .cache/jev/full/drop-tuned.json \
//     --misleading-threshold 0.65
//
// Deck-agnostic: it only reads the report.

import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { DEFAULT_BAND_THRESHOLDS, mergeDefined, type DropFile, type TriageReport } from './types.ts';

export interface PolicyOptions {
  /** Drop a candidate when its misleading probability is at or above this. */
  misleadingThreshold: number;
  /**
   * Never drop a lemma's `best` pick. Jev's `best` and `misleading` questions are
   * asked independently, so it sometimes marks the one sensible translation as
   * misleading; without this a lemma can lose its primary sense while keeping a
   * marginal one, or be emptied outright.
   */
  protectBest: boolean;
  /**
   * Only consider lemmas at least this many characters long. Short lemmas are
   * often covered by hand curation, which should win over the classifier.
   */
  minLemmaLength: number;
}

export function defaultPolicyOptions(overrides: Partial<PolicyOptions> = {}): PolicyOptions {
  return mergeDefined<PolicyOptions>({
    misleadingThreshold: DEFAULT_BAND_THRESHOLDS.misleading,
    protectBest: true,
    minLemmaLength: 0,
  }, overrides);
}

export interface PolicyResult {
  dropFile: DropFile;
  keptCards: number;
  droppedCards: number;
  /** Lemmas where the never-empty guard overrode a drop. */
  protectedLemmas: { front: string; back: string; misleading: number; usefulness: number }[];
}

export function applyPolicy(report: TriageReport, options: PolicyOptions): PolicyResult {
  const cards: DropFile['cards'] = [];
  const protectedLemmas: PolicyResult['protectedLemmas'] = [];
  let keptCards = 0;

  for (const lemma of report.byLemma) {
    if (lemma.front.length < options.minLemmaLength) continue;
    const candidates = lemma.candidates ?? [];
    for (const candidate of candidates) {
      const protectedBest = options.protectBest && candidate.back === lemma.best;
      const kept = candidate.misleading < options.misleadingThreshold || protectedBest;
      if (kept) {
        keptCards += 1;
        if (protectedBest && candidate.misleading >= options.misleadingThreshold) {
          protectedLemmas.push({
            front: candidate.front,
            back: candidate.back,
            misleading: candidate.misleading,
            usefulness: candidate.usefulness,
          });
        }
        continue;
      }
      cards.push({
        front: candidate.front,
        back: candidate.back,
        reason: 'misleading',
        misleading: candidate.misleading,
        score: candidate.usefulness,
      });
    }
  }

  return {
    dropFile: {
      generatedBy: `tools/jev/policy.ts (threshold ${options.misleadingThreshold}, protectBest ${options.protectBest})`,
      model: report.model,
      deck: report.deck,
      cards,
    },
    keptCards,
    droppedCards: cards.length,
    protectedLemmas,
  };
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      report: { type: 'string', required: true },
      out: { type: 'string', required: true },
      'misleading-threshold': { type: 'string' },
      'min-lemma-length': { type: 'string' },
      'no-protect-best': { type: 'boolean', default: false },
    },
    allowPositionals: false,
  });

  const options = defaultPolicyOptions({
    misleadingThreshold: values['misleading-threshold']
      ? Number(values['misleading-threshold'])
      : undefined,
    minLemmaLength: values['min-lemma-length'] ? Number(values['min-lemma-length']) : undefined,
    protectBest: !values['no-protect-best'],
  });
  const report = JSON.parse(await readFile(resolve(values.report!), 'utf8')) as TriageReport;
  const result = applyPolicy(report, options);
  const out = resolve(values.out!);
  await mkdir(resolve(out, '..'), { recursive: true });
  await writeFile(out, `${JSON.stringify(result.dropFile, null, 2)}\n`);
  console.log(
    `threshold ${options.misleadingThreshold}, protectBest ${options.protectBest}, `
    + `minLemmaLength ${options.minLemmaLength}: `
    + `kept ${result.keptCards}, dropped ${result.droppedCards}, `
    + `protected ${result.protectedLemmas.length} lemmas from being emptied. Wrote ${out}`,
  );
}

if (process.argv[1] && import.meta.url === `file://${resolve(process.argv[1])}`) {
  await main();
}
