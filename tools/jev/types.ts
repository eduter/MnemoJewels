import type { DeckData } from '../../src/types.ts';

/** A single `[front, back]` card as it appears in a deck. */
export type DeckCard = DeckData['cards'][number];

/**
 * How Jev was asked to screen one candidate, plus the model's answer.
 * `misleading` is the Noul probability that the pair would teach a beginner a
 * false association; `keep` is the application decision derived from it.
 */
export interface CandidateVerdict {
  front: string;
  back: string;
  misleading: number;
  /** Score primitive for the lemma's whole candidate set. */
  usefulness: number;
  keep: boolean;
  reason: string;
}

export interface LemmaTriage {
  front: string;
  best: string;
  bestConfidence: number;
  worst: string;
  worstConfidence: number;
  candidates: CandidateVerdict[];
}

export interface BandThresholds {
  /** Noul "would this mislead a beginner?" is at or above this → drop. */
  misleading: number;
  /** Score primitive is below this → flag the lemma for review. */
  score: number;
  /** Reserved for confidence-gated review of the best/worst picks. */
  pick: number;
  ambiguousPick: number;
}

// Merges overrides over defaults without letting an explicit `undefined` wipe a
// default. A plain `{...defaults, ...overrides}` does, which silently turned a
// numeric threshold into NaN in callers that pass optional CLI flags straight
// through.
export function mergeDefined<T extends object>(base: T, overrides: Partial<T>): T {
  const merged = { ...base };
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const value = overrides[key];
    if (value !== undefined) merged[key] = value as T[keyof T];
  }
  return merged;
}

export const DEFAULT_BAND_THRESHOLDS: BandThresholds = {
  misleading: 0.5,
  score: 0.4,
  pick: 0.25,
  ambiguousPick: 0.6,
};

export interface TriageSummary {
  front: string;
  best: string;
  bestConfidence: number;
  worst: string;
  worstConfidence: number;
  keep: string[];
  drop: string[];
  flagged: boolean;
  /** Per-candidate verdicts so borderline keeps can be reviewed, not just drops. */
  candidates: CandidateVerdict[];
}

export interface TriageReport {
  model: string;
  /** Base URL the requests were sent to, for provenance across Jev providers. */
  endpoint: string;
  deck: string;
  totalCards: number;
  processedCards: number;
  keptCards: number;
  droppedCards: number;
  flaggedLemmas: number;
  inputTokens: number;
  outputTokens: number;
  byLemma: TriageSummary[];
}

/** A single card that should be dropped, with the reason and confidence. */
export interface DropRecord {
  front: string;
  back: string;
  reason: string;
  misleading?: number;
  score?: number;
}

export interface DropFile {
  generatedBy: string;
  model: string;
  deck: string;
  cards: DropRecord[];
}
