import type { JevQuestion } from './client.ts';
import { languageName } from './languages.ts';

/**
 * The two languages of the deck being triaged, used to describe the task to Jev.
 * Everything deck-specific enters the prompt through here, so nothing below is
 * tied to a particular language pair.
 */
export interface DeckLanguages {
  /** ISO code from `deck.languageFront`; the language of the card front. */
  front?: string;
  /** ISO code from `deck.languageBack`; the language of the card back. */
  back?: string;
}

/**
 * The learner framing for every question, derived from the deck's languages.
 *
 * Jev loses accuracy as irrelevant context grows, so this stays short and states
 * the one thing that matters: the learner sees the pair with no sentence and
 * must form a direct association. It is a function of the language pair rather
 * than a constant, so the harness is not tied to one deck.
 */
export function learnerContext(languages: DeckLanguages = {}): string {
  const front = languageName(languages.front);
  const back = languageName(languages.back, 'translation');
  return `Context: a flashcard memory game teaches ${front} vocabulary to an absolute beginner. `
    + `Each card shows one ${front} word and one candidate ${back} translation as an isolated pair `
    + 'with no sentence, picture, or part of speech. The learner forms a direct word-to-word '
    + 'association, so a candidate that is not a real translation — a transliteration look-alike, '
    + 'a grammatical label, a rare or idiomatic sense, or an unrelated homonym — teaches a false '
    + 'association that is hard to unlearn. Most candidate lists contain such noise; dropping is expected.';
}

export const USEFULNESS_LEVELS = [
  'None of these candidates belong with this front word',
  'Only one or two candidates are useful to a beginner',
  'Several candidates are useful core meanings',
] as const;

export interface LemmaRequestOptions {
  /** The deck's languages; drives the learner framing. */
  languages?: DeckLanguages;
}

export interface BuiltLemmaRequest {
  state: Record<string, unknown>;
  questions: Record<string, JevQuestion>;
}

/**
 * Builds one Jev request for a single front word and all of its candidate
 * translations: a Choice for the best candidate, a Choice for the worst, a
 * Score for how useful the set is, and one Noul per candidate asking whether it
 * would mislead a beginner.
 */
export function buildLemmaRequest(
  front: string,
  candidates: string[],
  options: LemmaRequestOptions = {},
): BuiltLemmaRequest {
  const context = learnerContext(options.languages);
  const unique = [...new Set(candidates)];
  const criteria = Object.fromEntries(unique.map(candidate => [candidate, candidate]));

  const questions: Record<string, JevQuestion> = {};

  // A best/worst comparison only carries information when there is a choice to
  // make, so skip it for single-candidate lemmas (about half the deck).
  if (unique.length > 1) {
    questions.best = {
      type: 'choice',
      instructions:
        `${context} `
        + `Comparing all candidates together, which single one is the most useful PRIMARY translation `
        + `to teach a beginner for "${front}"? Prefer the everyday core meaning. If several are equally `
        + 'core, choose exactly one.',
      criteria,
    };
    questions.worst = {
      type: 'choice',
      instructions:
        `${context} `
        + `Comparing all candidates together, which single one would be MOST HARMFUL for a beginner — `
        + `the least like a real translation of "${front}"?`,
      criteria,
    };
  }

  questions.usefulness = {
    type: 'score',
    instructions:
      `${context} `
      + `Overall, how well does this candidate set serve a beginner learning "${front}"?`,
    criteria: [...USEFULNESS_LEVELS],
  };

  unique.forEach((candidate, index) => {
    questions[`misleading_${index}`] = {
      type: 'noul',
      instructions:
        `${context} `
        + `Would teaching the pair "${front}" → "${candidate}" as an isolated card create a false `
        + `association for an absolute beginner? Answer yes for a transliteration look-alike, a `
        + 'grammatical label rather than a translation, an unrelated homonym, or a rare/idiomatic sense '
        + 'that is not what the word normally means.',
      criteria: {
        true: 'This pairing would mislead a beginner',
        false: 'This is a genuine, useful translation',
      },
    };
  });

  return {
    state: {
      word: front,
      candidate_translations: unique,
    },
    questions,
  };
}
