// Frequency-list helpers shared by the deck generators.
//
// The Kelly project publishes comparable ranked lists for many languages in the
// same shape (`{ full_list: [{ word, rank }, ...] }`), so the candidate
// selection is the same everywhere: de-duplicate, drop tokens that are not
// standalone words in the target language, and keep the most frequent `limit`.

import type { KellyFile } from './kaikki.ts';

export interface CandidateOptions {
  /** Maximum number of usable lemmas to keep, most frequent first. */
  limit: number;
  /** Characters accepted in addition to the letters of the language. */
  extraCharacters?: string;
}

/**
 * Returns the most frequent standalone lemmas from a Kelly list.
 *
 * Kelly mixes in punctuation, multi-word strings, affixes and Latin-script
 * noise; the generator only wants single alphabetic tokens. `extraCharacters`
 * lets a language keep its own letters (e.g. Spanish `ñ`, French `œ`) and its
 * internal apostrophes or hyphens.
 */
export function selectCandidateLemmas(
  frequency: KellyFile,
  { limit, extraCharacters = '' }: CandidateOptions,
): string[] {
  const allowed = new Set([...extraCharacters.toLowerCase()]);
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const entry of frequency.full_list) {
    const word = entry.word;
    if (typeof word !== 'string' || !word.length) continue;
    if (seen.has(word)) continue;
    if (word.startsWith('-') || word.endsWith('-')) continue;
    if (!isStandaloneToken(word, allowed)) continue;
    seen.add(word);
    candidates.push(word);
    if (candidates.length >= limit) break;
  }

  return candidates;
}

function isStandaloneToken(word: string, allowed: Set<string>): boolean {
  for (const character of word.toLowerCase()) {
    if (/\p{L}/u.test(character)) continue;
    if (allowed.has(character)) continue;
    return false;
  }
  return true;
}

export function countDuplicateRows(frequency: KellyFile): number {
  const words = frequency.full_list.map(entry => entry.word);
  return words.length - new Set(words).size;
}
