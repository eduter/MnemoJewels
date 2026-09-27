import { describe, expect, it } from 'vitest';
import { buildLemmaRequest, learnerContext } from '../tools/jev/prompts.ts';
import { languageName } from '../tools/jev/languages.ts';

describe('learner context', () => {
  it('names the deck languages rather than hardcoding a pair', () => {
    const russian = learnerContext({ front: 'ru', back: 'en' });
    expect(russian).toContain('Russian');
    expect(russian).toContain('English');

    const swedish = learnerContext({ front: 'sv', back: 'en' });
    expect(swedish).toContain('Swedish');
    expect(swedish).not.toContain('Russian');
  });

  it('falls back to the raw code for an unmapped language', () => {
    expect(languageName('xx')).toBe('xx');
    expect(learnerContext({ front: 'xx', back: 'en' })).toContain('xx');
  });

  it('degrades gracefully when the deck declares no languages', () => {
    const context = learnerContext();
    expect(context).toContain('the source language');
    expect(context).toContain('translation');
  });
});

describe('buildLemmaRequest', () => {
  it('carries the language pair into every question', () => {
    const { questions } = buildLemmaRequest('hus', ['house', 'building'], {
      languages: { front: 'sv', back: 'en' },
    });
    for (const question of Object.values(questions)) {
      expect(question.instructions).toContain('Swedish');
    }
  });

  it('skips best/worst for a single-candidate lemma', () => {
    const { questions } = buildLemmaRequest('hus', ['house']);
    expect(questions.best).toBeUndefined();
    expect(questions.worst).toBeUndefined();
    expect(questions.usefulness).toBeDefined();
    expect(questions.misleading_0).toBeDefined();
  });

  it('emits one misleading question per unique candidate', () => {
    const { questions, state } = buildLemmaRequest('hus', ['house', 'house', 'building']);
    expect(state.candidate_translations).toEqual(['house', 'building']);
    expect(Object.keys(questions)).toContain('misleading_0');
    expect(Object.keys(questions)).toContain('misleading_1');
    expect(Object.keys(questions)).not.toContain('misleading_2');
  });
});
