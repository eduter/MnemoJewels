import { describe, expect, it } from 'vitest';
import { JevClient, type JevAnswer, type JevResponse } from '../tools/jev/client.ts';
import { buildLemmaRequest } from '../tools/jev/prompts.ts';
import { decideCandidates, groupCardsByLemma, triageDeck } from '../tools/jev/triage.ts';
import { scorePredictions } from '../tools/jev/calibration.ts';
import type { DeckData } from '../src/types';

/** A fake client that answers the lemma request with scripted verdicts. */
class FakeClient extends JevClient {
  readonly calls: unknown[] = [];

  constructor(private readonly respond: (state: any, questions: any) => JevResponse) {
    super({ apiKey: 'test' });
  }

  override async ask(state: unknown, questions: any): Promise<JevResponse> {
    this.calls.push(state);
    return this.respond(state, questions);
  }
}

function buildFakeResponse(state: any, misleadingByBack: Record<string, number>): JevResponse {
  const candidates: string[] = state.candidate_translations;
  const misleading = Object.fromEntries(
    candidates.map((back, index) => [`misleading_${index}`, {
      type: 'noul' as const,
      noul: misleadingByBack[back] ?? 0.1,
    }]),
  );
  const answers: Record<string, JevAnswer> = {
    usefulness: { type: 'score', score: 1, probabilities: [0.2, 0.8], confidence: 0.8 },
    ...misleading,
  };
  if (candidates.length > 1) {
    answers.best = { type: 'choice', choice: candidates[0], probabilities: {}, confidence: 0.9 };
    answers.worst = {
      type: 'choice', choice: candidates[candidates.length - 1], probabilities: {}, confidence: 0.2,
    };
  }
  return {
    model: 'fake',
    answers,
    usage: { input_tokens: 100, output_tokens: 0 },
  };
}

describe('Jev triage harness', () => {
  it('builds one request per lemma with best, worst, score and a noul per candidate', () => {
    const { state, questions } = buildLemmaRequest('и', ['and', 'yi', 'both', 'and']);
    expect((state as any).candidate_translations).toEqual(['and', 'yi', 'both']);
    expect(questions.best.type).toBe('choice');
    expect(questions.worst.type).toBe('choice');
    expect(questions.usefulness.type).toBe('score');
    expect(questions.misleading_0.type).toBe('noul');
    expect(questions.misleading_2.type).toBe('noul');
    expect(questions.misleading_3).toBeUndefined();
  });

  it('omits best/worst for a single-candidate lemma', () => {
    const { questions } = buildLemmaRequest('год', ['year']);
    expect(questions.best).toBeUndefined();
    expect(questions.worst).toBeUndefined();
    expect(questions.usefulness.type).toBe('score');
    expect(questions.misleading_0.type).toBe('noul');
  });

  it('groups cards by front word', () => {
    const grouped = groupCardsByLemma([['и', 'and'], ['и', 'yi'], ['дом', 'house']]);
    expect([...grouped.entries()]).toEqual([['и', ['and', 'yi']], ['дом', ['house']]]);
  });

  it('drops candidates whose misleading probability crosses the threshold', () => {
    const verdicts = decideCandidates(
      'и',
      ['and', 'yi'],
      [0.05, 0.98],
      1,
      { misleading: 0.5, score: 0.4, pick: 0.25, ambiguousPick: 0.6 },
    );
    expect(verdicts.map(v => [v.back, v.keep])).toEqual([['and', true], ['yi', false]]);
  });

  it('triages a deck through the client and produces a drop file', async () => {
    const deck: DeckData = {
      displayName: 'Test',
      uid: 'test',
      cards: [['и', 'and'], ['и', 'yi'], ['дом', 'house']],
    };
    const client = new FakeClient(state => buildFakeResponse(state, { yi: 0.99 }));
    const { report, dropFile } = await triageDeck(deck, { client });

    expect(report.byLemma.map(l => l.front)).toEqual(['и', 'дом']);
    expect(report.keptCards).toBe(2);
    expect(report.droppedCards).toBe(1);
    expect(dropFile.cards).toEqual([
      expect.objectContaining({ front: 'и', back: 'yi', reason: 'misleading' }),
    ]);
    expect(report.inputTokens).toBe(200);
  });

  it('scores predictions against human labels for calibration', () => {
    const truth = [
      { front: 'и', back: 'and', expect: 'keep' as const },
      { front: 'и', back: 'yi', expect: 'drop' as const },
      { front: 'дом', back: 'house', expect: 'keep' as const },
    ];
    const predictedKeep = new Set(['и\u0000and']);
    const predictedDrop = {
      generatedBy: 'test', model: 'fake', deck: 'test',
      cards: [
        { front: 'и', back: 'yi', reason: 'misleading' },
        { front: 'дом', back: 'house', reason: 'misleading' },
      ],
    };
    const metrics = scorePredictions(truth, predictedKeep, predictedDrop);
    expect(metrics.accuracy).toBeCloseTo(2 / 3);
    expect(metrics.dropRecall).toBe(1);
    expect(metrics.keepRecall).toBe(0.5);
    expect(metrics.confusion).toEqual({ trueKeep: 1, falseDrop: 1, falseKeep: 0, trueDrop: 1 });
  });
});
