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
}

export const DEFAULT_JE_BASE_URL = 'https://api.typesafe.ai/v1/systemone';
export const DEFAULT_JE_MODEL = 'jev-latest';

export class JevClient {
  private readonly apiKey: string;
  private readonly baseURL: string;
  readonly model: string;

  constructor(options: JevClientOptions) {
    if (!options.apiKey) throw new Error('A TypeSafe API key is required.');
    this.apiKey = options.apiKey;
    this.baseURL = options.baseURL ?? DEFAULT_JE_BASE_URL;
    this.model = options.model ?? DEFAULT_JE_MODEL;
  }

  async ask(state: unknown, questions: Record<string, JevQuestion>): Promise<JevResponse> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: this.model, state, questions }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Jev request failed (${response.status}): ${body.slice(0, 500)}`);
    }
    return await response.json() as JevResponse;
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
