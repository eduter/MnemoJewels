// CLI for the Jev deck-triage harness.
//
//   node --experimental-strip-types tools/jev/cli.ts \
//     --input  public/decks/top-ru-en.json \
//     --out    .cache/jev/top-ru-en \
//     --only-short 4
//
// Produces:
//   <out>/triage-report.json  — per-lemma best/worst and keep/drop
//   <out>/drop.json           — cards to drop, with reasons and confidences
//
// Set TYPESAFE_API_KEY (and optionally TYPESAFE_API_BASE, TYPESAFE_MODEL).
// Use --calibrate <ground-truth.json> to score against a labeled sample first.
// Use --print-request to dump the exact JSON for one lemma without calling Jev.

import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import {
  calibrate,
  loadGroundTruth,
  writeCalibrationReport,
} from './calibration.ts';
import { buildLemmaRequest } from './prompts.ts';
import { groupCardsByLemma, readDeck, triageDeck, writeJson } from './triage.ts';

const { values } = parseArgs({
  options: {
    input: { type: 'string', default: 'public/decks/top-ru-en.json' },
    out: { type: 'string', default: '.cache/jev/run' },
    'only-short': { type: 'string' },
    start: { type: 'string' },
    limit: { type: 'string' },
    delay: { type: 'string' },
    'misleading-threshold': { type: 'string' },
    'score-threshold': { type: 'string' },
    calibrate: { type: 'string' },
    'print-request': { type: 'string' },
    verbose: { type: 'boolean', default: false },
  },
  allowPositionals: false,
});

const input = resolve(values.input!);
const out = resolve(values.out!);
const deck = await readDeck(input);

if (values['print-request']) {
  const front = values['print-request'];
  const candidates = groupCardsByLemma(deck.cards).get(front);
  if (!candidates) throw new Error(`No cards found for "${front}".`);
  console.log(JSON.stringify({ model: process.env.TYPESAFE_MODEL ?? 'jev-latest', ...buildLemmaRequest(front, candidates) }, null, 2));
  process.exit(0);
}

if (values.calibrate) {
  const truth = await loadGroundTruth(resolve(values.calibrate));
  const metrics = await calibrate(truth, { verbose: values.verbose });
  await writeCalibrationReport(resolve(out, 'calibration.json'), metrics);
  console.log(
    `Calibration: ${metrics.correct}/${metrics.total} correct (accuracy ${metrics.accuracy.toFixed(2)}), `
    + `drop recall ${metrics.dropRecall.toFixed(2)}, keep recall ${metrics.keepRecall.toFixed(2)}`,
  );
  process.exit(0);
}

const { report, dropFile } = await triageDeck(deck, {
  onlyShortWords: values['only-short'] ? Number(values['only-short']) : undefined,
  start: values.start ? Number(values.start) : undefined,
  limit: values.limit ? Number(values.limit) : undefined,
  delayMs: values.delay ? Number(values.delay) : undefined,
  verbose: values.verbose,
  thresholds: {
    misleading: values['misleading-threshold'] ? Number(values['misleading-threshold']) : undefined,
    score: values['score-threshold'] ? Number(values['score-threshold']) : undefined,
  },
});

await writeJson(resolve(out, 'triage-report.json'), report);
await writeJson(resolve(out, 'drop.json'), dropFile);
console.log(
  `Triaged ${report.byLemma.length} lemmas: kept ${report.keptCards}, dropped ${report.droppedCards} `
  + `of ${report.processedCards} cards. Wrote ${resolve(out, 'triage-report.json')} and drop.json`,
);
