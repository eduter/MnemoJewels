import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { DeckData } from '../../src/types.ts';
import {
  JevClient,
  choiceAnswer,
  noulAnswer,
  scoreAnswer,
  type JevClientOptions,
} from './client.ts';
import { buildLemmaRequest } from './prompts.ts';
import {
  DEFAULT_BAND_THRESHOLDS,
  type BandThresholds,
  type CandidateVerdict,
  type DeckCard,
  type DropFile,
  type LemmaTriage,
  type TriageReport,
} from './types.ts';

export interface TriageOptions {
  /** Only process front words up to this many characters. */
  onlyShortWords?: number;
  /** Range of unique front words to process, for partial runs. */
  start?: number;
  limit?: number;
  thresholds?: Partial<BandThresholds>;
  /** Milliseconds between requests; keeps a run gentle and re-startable. */
  delayMs?: number;
  /** Print progress to stderr. */
  verbose?: boolean;
  /** Override the client, primarily for tests. */
  client?: JevClient;
}

export interface TriageResult {
  report: TriageReport;
  dropFile: DropFile;
}

interface LemmaOutcome {
  triage: LemmaTriage;
  inputTokens: number;
  outputTokens: number;
}

export function groupCardsByLemma(cards: DeckCard[]): Map<string, string[]> {
  const byLemma = new Map<string, string[]>();
  for (const [front, back] of cards) {
    const backs = byLemma.get(front) ?? [];
    backs.push(back);
    byLemma.set(front, backs);
  }
  return byLemma;
}

/** Derives keep/drop from Jev's answers using the confidence-gated policy. */
export function decideCandidates(
  front: string,
  candidates: string[],
  misleading: number[],
  usefulness: number,
  thresholds: BandThresholds,
): CandidateVerdict[] {
  return candidates.map((back, index) => {
    const wouldMislead = misleading[index] ?? 0;
    return {
      front,
      back,
      misleading: wouldMislead,
      usefulness,
      keep: wouldMislead < thresholds.misleading,
      reason: wouldMislead >= thresholds.misleading ? 'misleading' : 'keep',
    };
  });
}

async function triageLemma(
  client: JevClient,
  front: string,
  candidates: string[],
  thresholds: BandThresholds,
): Promise<LemmaOutcome> {
  const unique = [...new Set(candidates)];
  const { state, questions } = buildLemmaRequest(front, unique);
  const response = await client.ask(state, questions);

  // Single-candidate lemmas have no best/worst question; fall back to the only
  // candidate so the report shape stays uniform.
  const best = response.answers.best?.type === 'choice'
    ? choiceAnswer(response, 'best')
    : null;
  const worst = response.answers.worst?.type === 'choice'
    ? choiceAnswer(response, 'worst')
    : null;
  const usefulness = scoreAnswer(response, 'usefulness');
  const misleading = unique.map((_, index) => noulAnswer(response, `misleading_${index}`));

  return {
    triage: {
      front,
      best: best?.choice ?? unique[0],
      bestConfidence: best?.confidence ?? 1,
      worst: worst?.choice ?? unique[0],
      worstConfidence: worst?.confidence ?? 1,
      candidates: decideCandidates(front, unique, misleading, usefulness.score, thresholds),
    },
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  };
}

export async function triageDeck(
  deck: DeckData,
  options: TriageOptions = {},
): Promise<TriageResult> {
  const thresholds: BandThresholds = { ...DEFAULT_BAND_THRESHOLDS };
  for (const [key, value] of Object.entries(options.thresholds ?? {})) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      thresholds[key as keyof BandThresholds] = value;
    }
  }
  const client = options.client ?? new JevClient({
    apiKey: process.env.TYPESAFE_API_KEY ?? '',
    baseURL: process.env.TYPESAFE_API_BASE,
    model: process.env.TYPESAFE_MODEL,
  } satisfies JevClientOptions);

  const byLemma = groupCardsByLemma(deck.cards);
  let lemmas = [...byLemma.entries()];
  if (options.onlyShortWords) {
    lemmas = lemmas.filter(([front]) => [...front].length <= options.onlyShortWords!);
  }
  if (options.start) lemmas = lemmas.slice(options.start);
  if (options.limit) lemmas = lemmas.slice(0, options.limit);

  const triages: LemmaTriage[] = [];
  let keptCards = 0;
  let droppedCards = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  for (const [index, [front, candidates]] of lemmas.entries()) {
    const outcome = await triageLemma(client, front, candidates, thresholds);
    const { triage } = outcome;
    triages.push(triage);
    keptCards += triage.candidates.filter(candidate => candidate.keep).length;
    droppedCards += triage.candidates.filter(candidate => !candidate.keep).length;
    inputTokens += outcome.inputTokens;
    outputTokens += outcome.outputTokens;
    if (options.verbose) {
      const dropped = triage.candidates
        .filter(candidate => !candidate.keep)
        .map(candidate => candidate.back)
        .join(', ');
      process.stderr.write(
        `[${index + 1}/${lemmas.length}] ${front}: best="${triage.best}" dropped=[${dropped}]\n`,
      );
    }
    if (options.delayMs) await new Promise(resolve => setTimeout(resolve, options.delayMs));
  }

  const dropFile: DropFile = {
    generatedBy: 'tools/jev/triage.ts',
    model: client.model,
    deck: deck.uid ?? deck.displayName,
    cards: triages.flatMap(triage =>
      triage.candidates
        .filter(candidate => !candidate.keep)
        .map(candidate => ({
          front: candidate.front,
          back: candidate.back,
          reason: candidate.reason,
          misleading: candidate.misleading,
          score: candidate.usefulness,
        })),
    ),
  };

  const report: TriageReport = {
    model: client.model,
    deck: deck.uid ?? deck.displayName,
    totalCards: deck.cards.length,
    processedCards: lemmas.reduce((sum, [, candidates]) => sum + candidates.length, 0),
    keptCards,
    droppedCards,
    flaggedLemmas: 0,
    inputTokens,
    outputTokens,
    byLemma: triages.map(triage => ({
      front: triage.front,
      best: triage.best,
      bestConfidence: triage.bestConfidence,
      worst: triage.worst,
      worstConfidence: triage.worstConfidence,
      keep: triage.candidates.filter(c => c.keep).map(c => c.back),
      drop: triage.candidates.filter(c => !c.keep).map(c => c.back),
      flagged: false,
    })),
  };

  return { report, dropFile };
}

export async function readDeck(path: string): Promise<DeckData> {
  return JSON.parse(await readFile(resolve(path), 'utf8')) as DeckData;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(resolve(path, '..'), { recursive: true });
  await writeFile(resolve(path), `${JSON.stringify(value, null, 2)}\n`);
}
