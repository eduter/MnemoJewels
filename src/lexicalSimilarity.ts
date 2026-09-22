import type { LexicalItem } from './types';

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ы: 'y', э: 'e', ю: 'yu', я: 'ya',
  ь: '', ъ: '',
};

export interface SimilarityScores {
  score: number;
  phonologicalScore?: number;
  orthographicScore: number;
}

export function lexicalSimilarity(left: LexicalItem, right: LexicalItem): SimilarityScores {
  const orthographicScore = normalizedSimilarity(
    transliterate(left.lemma),
    transliterate(right.lemma),
  );
  const phonologicalScore = bestIpaSimilarity(left.ipa, right.ipa);
  const score = phonologicalScore === undefined
    ? orthographicScore
    : 0.65 * phonologicalScore + 0.35 * orthographicScore;

  return {
    score: round(score),
    phonologicalScore: phonologicalScore === undefined ? undefined : round(phonologicalScore),
    orthographicScore: round(orthographicScore),
  };
}

export function lexicalDistance(left: LexicalItem | undefined, right: LexicalItem | undefined): number | null {
  if (!left?.ipa?.length || !right?.ipa?.length) {
    return null;
  }
  const similarity = bestIpaSimilarity(left.ipa, right.ipa)!;
  const scale = Math.max(normalizeIpa(left.ipa[0]).length, normalizeIpa(right.ipa[0]).length, 1);
  return round((1 - similarity) * scale);
}

export function normalizedSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left.length || !right.length) return 0;
  return 1 - levenshtein(left, right) / Math.max(left.length, right.length);
}

export function normalizeIpa(ipa: string): string {
  return ipa
    .normalize('NFD')
    .toLowerCase()
    .replace(/[\/[\]().‿\sˈˌ._-]/gu, '')
    .replace(/[̩̯͜͡]/gu, '')
    .normalize('NFC');
}

function bestIpaSimilarity(left: string[] | undefined, right: string[] | undefined): number | undefined {
  if (!left?.length || !right?.length) return undefined;
  let best = 0;
  for (const leftIpa of left) {
    for (const rightIpa of right) {
      best = Math.max(best, normalizedSimilarity(normalizeIpa(leftIpa), normalizeIpa(rightIpa)));
    }
  }
  return best;
}

function transliterate(value: string): string {
  return [...value.normalize('NFD').toLowerCase()]
    .map(character => CYRILLIC_TO_LATIN[character] ?? character)
    .join('')
    .replace(/\p{M}|\W/gu, '');
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

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
