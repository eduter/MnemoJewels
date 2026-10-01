import { ipaDistance } from './lexicalSimilarity';

export interface CardWords {
  front: string;
  back: string;
}

export interface DistanceContext {
  normalizedFront: Record<string, string>;
  normalizedBack: Record<string, string>;
  ipaFront: Record<string, string[]>;
  ipaBack: Record<string, string[]>;
}

/** Language-specific normalizations applied before orthographic comparison. */
const NORMALIZATION_FUNCTIONS: Record<string, (word: string) => string> = {
  no: word => word.toLowerCase().replace(/å/g, 'a').replace(/ø/g, 'o'),
  sv: word => word.toLowerCase().replace(/[äå]/g, 'a').replace(/ö/g, 'o'),
  es: word => foldDiacritics(word).replace(/ñ/g, 'n'),
  fr: word => foldDiacritics(word).replace(/œ/g, 'oe').replace(/æ/g, 'ae'),
};

/** Lower-cases and strips combining accents, so `café`/`cafe` compare equal. */
function foldDiacritics(word: string): string {
  return word.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
}

/** Strips parenthesised/bracketed qualifiers and applies language normalization. */
export function normalizeWord(word: string, language?: string): string {
  const normalized = word.replace(/\s*(\([^)]*\)|\[[^\]]*\])\s*/g, ' ').trim();
  const normalize = language ? NORMALIZATION_FUNCTIONS[language] : undefined;
  return normalize ? normalize(normalized) : normalized;
}

/**
 * Builds the lookup tables `cardDistance` needs from a deck's cards and its
 * `language:lemma` → IPA map.
 */
export function createDistanceContext(
  cards: CardWords[],
  pronunciations: Record<string, string[]> | undefined,
  languageFront?: string,
  languageBack?: string,
): DistanceContext {
  const normalizedFront: Record<string, string> = {};
  const normalizedBack: Record<string, string> = {};
  const ipaFront: Record<string, string[]> = {};
  const ipaBack: Record<string, string[]> = {};

  for (const [key, ipa] of Object.entries(pronunciations ?? {})) {
    const separator = key.indexOf(':');
    const language = key.slice(0, separator);
    const lemma = key.slice(separator + 1);
    if (language === languageFront) ipaFront[lemma] = ipa;
    if (language === languageBack) ipaBack[lemma] = ipa;
  }

  for (const card of cards) {
    normalizedFront[card.front] ??= normalizeWord(card.front, languageFront);
    normalizedBack[card.back] ??= normalizeWord(card.back, languageBack);
  }

  return { normalizedFront, normalizedBack, ipaFront, ipaBack };
}

export function mappedCardsConflict(
  card1: CardWords,
  card2: CardWords,
  mappings: Record<string, string[]>,
): boolean {
  return card1.front === card2.front
    || card1.back === card2.back
    || (mappings[card1.front]?.indexOf(card2.back) ?? -1) >= 0
    || (mappings[card2.front]?.indexOf(card1.back) ?? -1) >= 0;
}

/**
 * Distance used to rank alternative cards against the group's first card, where
 * smaller is a more confusable prompt/answer. It is the minimum of four signals:
 * same-script orthographic similarity on either language, and IPA similarity on
 * either language. The cross-language IPA terms are what surface sound-alike
 * false friends (`магазин`/`magazine`); they only become competitive because
 * `ipaDistance` compares segments phonologically instead of by characters.
 */
export function cardDistance(
  candidate: CardWords,
  card: CardWords,
  context: DistanceContext,
): number {
  const { normalizedFront, normalizedBack, ipaFront, ipaBack } = context;
  const normalizedCardFront = normalizedFront[card.front];
  const normalizedCandidateFront = normalizedFront[candidate.front];
  const normalizedCandidateBack = normalizedBack[candidate.back];
  let distanceFront = levenshtein(normalizedCandidateFront, normalizedCardFront);

  distanceFront *= 1 - 0.10 * commonPrefixLength(normalizedCandidateFront, normalizedCardFront, 5);
  distanceFront *= 1 - 0.05 * commonSuffixLength(normalizedCandidateFront, normalizedCardFront, 6);

  const distance = Math.min(
    distanceFront,
    levenshtein(normalizedCandidateBack, normalizedCardFront),
    ipaDistance(ipaFront[candidate.front], ipaFront[card.front]) ?? Infinity,
    ipaDistance(ipaBack[candidate.back], ipaFront[card.front]) ?? Infinity,
  );
  return Math.round(100 * distance) / 100;
}

function commonPrefixLength(word1: string, word2: string, maxLength: number): number {
  const end = Math.min(maxLength, word1.length, word2.length);
  let i = 0;
  while (i < end && word1[i] === word2[i]) i++;
  return i;
}

function commonSuffixLength(word1: string, word2: string, maxLength: number): number {
  const end = Math.min(maxLength, word1.length, word2.length);
  let i = 0;
  while (i < end && word1.substr(-1 - i, 1) === word2.substr(-1 - i, 1)) i++;
  return i;
}

function levenshtein(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}
