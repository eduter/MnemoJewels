import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { triageDeck, writeJson, type TriageResult } from './triage.ts';
import type { BandThresholds, DeckCard, DropFile } from './types.ts';
import type { DeckData } from '../../src/types.ts';

// Ground truth for calibration: a set of cards a human has judged as either a
// genuine translation (`keep`) or noise a beginner should never learn (`drop`).
export interface GroundTruthPair {
  front: string;
  back: string;
  expect: 'keep' | 'drop';
}

export interface CalibrationOptions {
  limit?: number;
  verbose?: boolean;
  /** Override the drop threshold so the policy can be tuned against labels. */
  thresholds?: Partial<BandThresholds>;
}

export interface CalibrationRow extends GroundTruthPair {
  predicted: 'keep' | 'drop' | 'unknown';
  correct: boolean;
}

export interface CalibrationMetrics {
  total: number;
  correct: number;
  accuracy: number;
  /** Of the noise pairs, the share Jev correctly dropped. */
  dropRecall: number;
  /** Of the genuine pairs, the share Jev correctly kept. */
  keepRecall: number;
  confusion: { trueKeep: number; falseDrop: number; falseKeep: number; trueDrop: number };
  rows: CalibrationRow[];
  /** Predicted drops, to diff against the ground-truth drops. */
  predictedDrops: DropFile;
}

export async function loadGroundTruth(path: string): Promise<GroundTruthPair[]> {
  return JSON.parse(await readFile(resolve(path), 'utf8')) as GroundTruthPair[];
}

export function scorePredictions(
  truth: GroundTruthPair[],
  predictedKeep: Set<string>,
  predictedDrop: DropFile,
): CalibrationMetrics {
  const rows: CalibrationRow[] = truth.map(pair => {
    const key = `${pair.front}\u0000${pair.back}`;
    const predicted = predictedKeep.has(key)
      ? 'keep'
      : predictedDrop.cards.some(card => card.front === pair.front && card.back === pair.back)
        ? 'drop'
        : 'unknown';
    return { ...pair, predicted, correct: predicted === pair.expect };
  });

  const confusion = {
    trueKeep: rows.filter(r => r.expect === 'keep' && r.predicted === 'keep').length,
    falseDrop: rows.filter(r => r.expect === 'keep' && r.predicted !== 'keep').length,
    falseKeep: rows.filter(r => r.expect === 'drop' && r.predicted !== 'drop').length,
    trueDrop: rows.filter(r => r.expect === 'drop' && r.predicted === 'drop').length,
  };
  const noise = rows.filter(r => r.expect === 'drop').length;
  const genuine = rows.filter(r => r.expect === 'keep').length;

  return {
    total: rows.length,
    correct: rows.filter(r => r.correct).length,
    accuracy: rows.length ? rows.filter(r => r.correct).length / rows.length : 0,
    dropRecall: noise ? confusion.trueDrop / noise : 1,
    keepRecall: genuine ? confusion.trueKeep / genuine : 1,
    confusion,
    rows,
    predictedDrops: predictedDrop,
  };
}

/**
 * Runs a small, hand-labeled sample through Jev and reports how well the
 * keep/drop policy matches the human labels. Run this before trusting a full
 * deck pass: tune the thresholds here, then apply them to the whole deck.
 */
export async function calibrate(
  truth: GroundTruthPair[],
  options: CalibrationOptions = {},
): Promise<CalibrationMetrics> {
  // Build the sample from the labeled pairs, not from the current deck: the
  // ground truth deliberately contains the noisy candidates that curation has
  // already removed, and those are exactly what Jev is being tested on.
  const deck: DeckData = {
    displayName: 'calibration',
    uid: 'calibration',
    cards: truth.map(pair => [pair.front, pair.back] as DeckCard),
  };
  const result: TriageResult = await triageDeck(deck, {
    verbose: options.verbose,
    limit: options.limit,
    thresholds: options.thresholds,
  });
  const predictedKeep = new Set<string>();
  for (const lemma of result.report.byLemma) {
    for (const back of lemma.keep) predictedKeep.add(`${lemma.front}\u0000${back}`);
  }
  return scorePredictions(truth, predictedKeep, result.dropFile);
}

/** Writes the calibration report next to the run output for inspection. */
export async function writeCalibrationReport(path: string, metrics: CalibrationMetrics): Promise<void> {
  await writeJson(path, {
    total: metrics.total,
    correct: metrics.correct,
    accuracy: metrics.accuracy,
    dropRecall: metrics.dropRecall,
    keepRecall: metrics.keepRecall,
    confusion: metrics.confusion,
    rows: metrics.rows,
  });
}
