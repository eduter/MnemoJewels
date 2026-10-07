// Minimal client for TypeSafe AI's System One API (Jev). Kept dependency-free
// so the harness runs under `node --experimental-strip-types` like the rest of
// the tools.
//
// Request shape (https://docs.typesafe.ai/api):
//   POST {baseURL}
//   Authorization: Bearer <TYPESAFE_API_KEY>
//   { model, state, questions: { id: { type, instructions, criteria } } }
// Response:
//   { model, answers: { id: { type, choice|noul|score, probabilities?, confidence? } }, usage }

export interface NoulQuestion {
  type: 'noul';
  instructions: string;
  criteria?: { true: string; false: string };
}

export interface ChoiceQuestion {
  type: 'choice';
  instructions: string;
  criteria: Record<string, string>;
}

export interface ScoreQuestion {
  type: 'score';
  instructions: string;
  criteria: string[];
}

export type JevQuestion = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export interface NoulAnswer {
  type: 'noul';
  noul: number;
}

export interface ChoiceAnswer {
  type: 'choice';
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface ScoreAnswer {
  type: 'score';
  score: number;
  probabilities: number[];
  confidence: number;
}

export type JevAnswer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export interface JevResponse {
  model: string;
  answers: Record<string, JevAnswer>;
  usage: { input_tokens: number; output_tokens: number };
}

export interface JevClientOptions {
  apiKey: string;
  baseURL?: string;
  model?: string;
  /** Attempts per request, including the first; retries cover transient 5xx/429. */
  maxAttempts?: number;
  /** Base of the exponential backoff between retries, in milliseconds. */
  retryBaseDelayMs?: number;
}

export const DEFAULT_JE_BASE_URL = 'https://api.typesafe.ai/v1/systemone';

/**
 * Statuses the endpoint returns when it is momentarily overloaded rather than
 * rejecting the request. A full deck is thousands of sequential calls, so a
 * single transient 529 partway through would otherwise discard the whole run.
 */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504, 529]);
const DEFAULT_MAX_ATTEMPTS = 6;
const DEFAULT_RETRY_BASE_DELAY_MS = 1000;
/**
 * Independent hosted Jev proxy with the same request/response contract. Keys
 * minted on jevtypesafeai.com (prefix `jv_live_`) authenticate here, not at the
 * official endpoint; the reverse is also true.
 */
export const HOSTED_JE_BASE_URL = 'https://jevtypesafeai.com/api/v1/decide';
export const DEFAULT_JE_MODEL = 'jev-latest';

export class JevClient {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly maxAttempts: number;
  private readonly retryBaseDelayMs: number;
  readonly model: string;

  constructor(options: JevClientOptions) {
    if (!options.apiKey) throw new Error('A TypeSafe API key is required.');
    this.apiKey = options.apiKey;
    this.baseURL = options.baseURL ?? DEFAULT_JE_BASE_URL;
    this.model = options.model ?? DEFAULT_JE_MODEL;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;
  }

  get endpoint(): string {
    return this.baseURL;
  }

  async ask(state: unknown, questions: Record<string, JevQuestion>): Promise<JevResponse> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: this.model, state, questions }),
      });
      if (response.ok) return await response.json() as JevResponse;
      const body = await response.text().catch(() => '');
      lastError = new Error(`Jev request failed (${response.status}): ${body.slice(0, 500)}`);
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === this.maxAttempts) throw lastError;
      // Exponential backoff with jitter; the endpoint asks callers to retry
      // later on these statuses, and sequential deck runs are cheap to pace.
      const backoffMs = Math.min(this.retryBaseDelayMs * 2 ** (attempt - 1), 15000)
        + Math.random() * 250;
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
    throw lastError;
  }
}

export function noulAnswer(response: JevResponse, id: string): number {
  const answer = response.answers[id];
  if (!answer || answer.type !== 'noul') {
    throw new Error(`Expected noul answer "${id}", got ${answer?.type ?? 'nothing'}.`);
  }
  return answer.noul;
}

export function choiceAnswer(response: JevResponse, id: string): ChoiceAnswer {
  const answer = response.answers[id];
  if (!answer || answer.type !== 'choice') {
    throw new Error(`Expected choice answer "${id}", got ${answer?.type ?? 'nothing'}.`);
  }
  return answer;
}

export function scoreAnswer(response: JevResponse, id: string): ScoreAnswer {
  const answer = response.answers[id];
  if (!answer || answer.type !== 'score') {
    throw new Error(`Expected score answer "${id}", got ${answer?.type ?? 'nothing'}.`);
  }
  return answer;
}
