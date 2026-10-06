// Language-agnostic vocabulary deck generator.
//
// Mirrors the Russian deck pipeline for any language pair that has a Kelly
// frequency list and Kaikki (Wiktextract) Wiktionary dumps:
//
//   1. take the most frequent standalone lemmas from the Kelly list;
//   2. join them to the front-language Wiktionary entries and collect IPA plus
//      the English targets linked from each sense;
//   3. load English IPA for every target that will appear on a card;
//   4. emit `cards` ([front, back] pairs) and card-scoped `pronunciations`
//      (`language:lemma` -> IPA), optionally applying a curated short-word map;
//   5. validate structure, coverage and a required example card.
//
// Everything language-specific is passed in as options, so the same code drives
// every deck. See tools/romance for the Spanish and French decks.

import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { DeckData } from '../../src/types.ts';
import type { KaikkiEntry, KellyFile } from './kaikki.ts';
import { ipaFromSounds, isInflectionSense } from './kaikki.ts';
import { forEachJsonLine } from './jsonl.ts';
import { countDuplicateRows, selectCandidateLemmas } from './frequency.ts';
import { shouldRejectTranslation, translationsForEntry, translationsForSense } from './translationQuality.ts';
import { curateCards, missingCuratedLemmas } from './curation.ts';

export interface DeckGenerationOptions {
  uid: string;
  displayName: string;
  /** ISO 639-1 code of the card front (the language being learned). */
  languageFront: string;
  languageBack: string;
  version: number;
  kelly: string;
  frontKaikki: string;
  /** Back-language Wiktionary dump. Defaults to `englishKaikki` for the
   *  language-to-English decks; an English-front deck points it at the
   *  target language instead. */
  backKaikki?: string;
  englishKaikki: string;
  output: string;
  report: string;
  /** How many frequent lemmas to consider before coverage filtering. */
  candidateLimit: number;
  /** How many usable lemmas to keep in the deck. */
  lemmaTarget: number;
  /** True when the front-language Wiktionary entries record their translations
   *  as sense links that point at the back language (the language-to-English
   *  case). When false the front entries carry no usable cross-reference and the
   *  back words are read from the back-language Wiktionary instead. */
  translationsFromFrontSenses?: boolean;
  /** Extra characters allowed inside a lemma (apostrophes, hyphens, …). */
  extraCharacters?: string;
  /** A language-to-`languageBack` deck whose cards are inverted to widen the
   *  back-word set. The English Wiktionary records few translations for a given
   *  language, so an English-front deck also reads the reverse of the forward
   *  deck's own cards. */
  augmentFrom?: string;
  shortWordMaxLength?: number;
  shortWordGlosses?: ReadonlyMap<string, readonly string[]>;
  /** A card the pipeline must produce, used as an end-to-end smoke test. */
  requiredCard?: [string, string];
  /** Minimum number of usable lemmas; generation fails below this. */
  minimumLemmas?: number;
}

export interface GenerationReport {
  frontLemmas: number;
  cards: number;
  frontWithIpa: number;
  frontWithoutIpa: number;
  backLemmas: number;
  backWithIpa: number;
  backWithoutIpa: number;
  pronunciationEntries: number;
  frequencyDuplicateRows: number;
  duplicateCards: number;
  malformedEntries: number;
  missingCurated: string[];
}

export interface GenerationResult {
  deck: DeckData;
  report: GenerationReport;
}

interface LemmaData {
  ipa: string[];
  translations: string[];
}

/** True when a lemma is deliberately dropped by the deck's curation table. */
function isDropped(lemma: string, options: DeckGenerationOptions): boolean {
  const { shortWordGlosses, shortWordMaxLength } = options;
  if (!shortWordGlosses || shortWordMaxLength === undefined) return false;
  if ([...lemma].length > shortWordMaxLength) return false;
  return shortWordGlosses.get(lemma)?.length === 0;
}

/** True when a lemma still yields at least one card after gloss rejection. */
function hasUsableCard(lemma: string, data: LemmaData | undefined, options: DeckGenerationOptions): boolean {
  if (!data) return false;
  if (options.shortWordGlosses?.get(lemma)?.length) return true;
  return data.translations.some(english => !shouldRejectTranslation(lemma, english));
}

export async function generateDeck(options: DeckGenerationOptions): Promise<GenerationResult> {
  const { languageFront, languageBack } = options;
  const translationsFromFrontSenses = options.translationsFromFrontSenses ?? languageBack === 'en';
  const backKaikki = options.backKaikki ?? options.englishKaikki;
  const frequency = JSON.parse(await readFile(options.kelly, 'utf8')) as KellyFile;
  const frequencyDuplicateRows = countDuplicateRows(frequency);

  const candidates = selectCandidateLemmas(frequency, {
    limit: options.candidateLimit,
    extraCharacters: options.extraCharacters,
  });
  const candidateSet = new Set(candidates);

  let malformedEntries = 0;
  const backHeadwords = await loadHeadwords(backKaikki, languageBack, () => malformedEntries++);

  const wiktionaryByWord = new Map<string, LemmaData>();
  await forEachJsonLine<KaikkiEntry>(options.frontKaikki, entry => {
    if (entry.lang_code !== languageFront || !entry.word || !candidateSet.has(entry.word)) return;
    const current = wiktionaryByWord.get(entry.word) ?? { ipa: [], translations: [] };
    for (const ipa of ipaFromSounds(entry)) {
      if (!current.ipa.includes(ipa)) current.ipa.push(ipa);
    }
    if (translationsFromFrontSenses) {
      for (const sense of entry.senses ?? []) {
        if (isInflectionSense(sense)) continue;
        for (const record of translationsForSense(sense, {
          frontLemma: entry.word,
          englishHeadwords: backHeadwords,
        })) {
          if (!current.translations.includes(record.value)) current.translations.push(record.value);
        }
      }
    } else {
      for (const value of translationsForEntry(entry, languageBack)) {
        if (!current.translations.includes(value)) current.translations.push(value);
      }
    }
    wiktionaryByWord.set(entry.word, current);
  }, () => malformedEntries++);

  // The English Wiktionary records translations for only a fraction of English
  // words, so a reverse deck also reads the inverted forward deck. Entry
  // translations stay first because they are sense-aligned; inverted cards only
  // widen the back-word set, which the coverage checks then re-filter.
  if (options.augmentFrom) {
    const forward = JSON.parse(await readFile(options.augmentFrom, 'utf8')) as DeckData;
    for (const [front, back] of forward.cards) {
      if (!candidateSet.has(back)) continue;
      const current = wiktionaryByWord.get(back) ?? { ipa: [], translations: [] };
      if (!current.translations.includes(front)) current.translations.push(front);
      wiktionaryByWord.set(back, current);
    }
  }

  const selected = candidates
    .filter(entry => wiktionaryByWord.get(entry)?.translations.length)
    .filter(entry => !isDropped(entry, options))
    .filter(entry => hasUsableCard(entry, wiktionaryByWord.get(entry), options))
    .slice(0, options.lemmaTarget);
  const minimum = options.minimumLemmas ?? Math.floor(options.lemmaTarget * 0.8);
  if (selected.length < minimum) {
    throw new Error(`Only ${selected.length} usable ${languageFront} lemmas were found; expected at least ${minimum}.`);
  }

  const backWords = new Set<string>();
  for (const lemma of selected) {
    for (const translation of wiktionaryByWord.get(lemma)?.translations ?? []) backWords.add(translation);
  }
  for (const glosses of options.shortWordGlosses?.values() ?? []) {
    for (const gloss of glosses) backWords.add(gloss);
  }

  const backIpa = new Map<string, string[]>();
  await forEachJsonLine<KaikkiEntry>(backKaikki, entry => {
    const word = typeof entry.word === 'string' ? entry.word.toLowerCase() : '';
    if (entry.lang_code !== languageBack || !backWords.has(word)) return;
    const pronunciations = backIpa.get(word) ?? [];
    for (const ipa of ipaFromSounds(entry, 4)) {
      if (!pronunciations.includes(ipa)) pronunciations.push(ipa);
    }
    backIpa.set(word, pronunciations);
  }, () => malformedEntries++);

  const pronunciations: Record<string, string[]> = {};
  const cards: [string, string][] = [];

  for (const lemma of selected) {
    const data = wiktionaryByWord.get(lemma);
    if (!data) continue;
    const frontKey = `${languageFront}:${lemma}`;
    if (data.ipa.length && !pronunciations[frontKey]) pronunciations[frontKey] = data.ipa.slice(0, 3);

    for (const backLemma of data.translations.slice(0, 8)) {
      if (shouldRejectTranslation(lemma, backLemma)) continue;
      cards.push([lemma, backLemma]);

      const backKey = `${languageBack}:${backLemma}`;
      if (!pronunciations[backKey]) {
        const ipa = backIpa.get(backLemma);
        if (ipa?.length) pronunciations[backKey] = ipa;
      }
    }
  }

  const curatedCards = options.shortWordGlosses && options.shortWordMaxLength !== undefined
    ? curateCards(cards, options.shortWordGlosses, options.shortWordMaxLength)
    : cards;
  const missingCurated = options.shortWordGlosses && options.shortWordMaxLength !== undefined
    ? missingCuratedLemmas(curatedCards, options.shortWordGlosses, options.shortWordMaxLength)
    : [];

  const deck: DeckData = {
    uid: options.uid,
    version: options.version,
    displayName: options.displayName,
    languageFront,
    languageBack,
    cards: curatedCards,
    pronunciations: trimPronunciationsForCards(curatedCards, pronunciations, languageFront, languageBack),
  };

  validate(deck, languageFront, languageBack, options.requiredCard);

  const frontLemmas = new Set(curatedCards.map(card => card[0]));
  const backLemmas = new Set(curatedCards.map(card => card[1]));
  const report: GenerationReport = {
    frontLemmas: frontLemmas.size,
    cards: curatedCards.length,
    frontWithIpa: [...frontLemmas].filter(lemma => deck.pronunciations?.[`${languageFront}:${lemma}`]?.length).length,
    frontWithoutIpa: [...frontLemmas].filter(lemma => !deck.pronunciations?.[`${languageFront}:${lemma}`]?.length).length,
    backLemmas: backLemmas.size,
    backWithIpa: [...backLemmas].filter(lemma => deck.pronunciations?.[`${languageBack}:${lemma}`]?.length).length,
    backWithoutIpa: [...backLemmas].filter(lemma => !deck.pronunciations?.[`${languageBack}:${lemma}`]?.length).length,
    pronunciationEntries: Object.keys(deck.pronunciations ?? {}).length,
    frequencyDuplicateRows,
    duplicateCards: curatedCards.length - new Set(curatedCards.map(card => JSON.stringify(card))).size,
    malformedEntries,
    missingCurated,
  };

  return { deck, report };
}

function trimPronunciationsForCards(
  cards: [string, string][],
  pronunciations: Record<string, string[]>,
  languageFront: string,
  languageBack: string,
): Record<string, string[]> {
  const trimmed: Record<string, string[]> = {};
  for (const [front, back] of cards) {
    const frontKey = `${languageFront}:${front}`;
    const backKey = `${languageBack}:${back}`;
    if (pronunciations[frontKey]?.length) trimmed[frontKey] = pronunciations[frontKey];
    if (pronunciations[backKey]?.length) trimmed[backKey] = pronunciations[backKey];
  }
  return trimmed;
}

export function validate(
  deck: DeckData,
  languageFront: string,
  languageBack: string,
  requiredCard?: [string, string],
): void {
  if (!deck.cards.length) throw new Error('Deck has no cards.');
  if (new Set(deck.cards.map(card => JSON.stringify(card))).size !== deck.cards.length) {
    throw new Error('Duplicate cards were generated.');
  }
  if (!deck.pronunciations || !Object.keys(deck.pronunciations).length) {
    throw new Error('Deck is missing pronunciations.');
  }
  if (requiredCard) {
    const [front, back] = requiredCard;
    if (!deck.cards.some(([f, b]) => f === front && b === back)) {
      throw new Error(`Required ${front}/${back} card is missing.`);
    }
    if (!deck.pronunciations[`${languageFront}:${front}`]?.length
      || !deck.pronunciations[`${languageBack}:${back}`]?.length) {
      throw new Error(`Required ${front}/${back} IPA is missing.`);
    }
  }
  const trimmed = trimPronunciationsForCards(deck.cards, deck.pronunciations, languageFront, languageBack);
  if (JSON.stringify(trimmed) !== JSON.stringify(deck.pronunciations)) {
    throw new Error('Pronunciations include entries not referenced by cards.');
  }
}

export async function writeGeneration(
  result: GenerationResult,
  output: string,
  reportPath: string,
): Promise<void> {
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(result.deck, null, 4)}\n`);
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(result.report, null, 2)}\n`);
}

export async function download(url: string, destination: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Download failed: ${url} (${response.status})`);
  await mkdir(dirname(destination), { recursive: true });
  console.log(`Downloading ${url}`);
  await pipeline(
    Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
    createWriteStream(destination),
  );
}

/** All lowercase headwords of a Wiktionary dump for one language, used to keep
 *  only real translation targets. */
async function loadHeadwords(
  path: string,
  language: string,
  onMalformed: () => void,
): Promise<Set<string>> {
  const headwords = new Set<string>();
  await forEachJsonLine<KaikkiEntry>(path, entry => {
    if (entry.lang_code !== language || typeof entry.word !== 'string') return;
    headwords.add(entry.word.toLowerCase());
  }, onMalformed);
  return headwords;
}
