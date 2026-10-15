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
import { ipaFromSounds, isInflectionSense, isRedirectSense, hasCompetingWordSense, hasRealNounSense } from './kaikki.ts';
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
  /** Match front-language Wiktionary entries case-insensitively, keying every
   *  lemma by its lowercase form. Needed for German, whose frequency lists are
   *  lowercase (`haus`, `problem`) while the nouns are capitalized in Wiktionary
   *  (`Haus`, `Problem`); lowercasing keeps `haus`/`Haus` on one card and lets a
   *  lowercase noun form still match. */
  matchFrontCaseInsensitively?: boolean;
  /** Fold `ß` to `ss` when keying front entries, in addition to lowercasing.
   *  The German frequency list spells `ß` as `ss` (`strasse`, `gross`), while
   *  Wiktionary records the standard spelling with `ß` (`Straße`, `groß`) and
   *  keeps the `ss` spelling only as a Switzerland/Liechtenstein regional
   *  variant. Folding lets the standard entry match, so the card gets the real
   *  translation and the canonical `ß` spelling. */
  foldFrontEszett?: boolean;
  /** Collect proper-noun (`pos: "name"`) translations and IPA in a separate map
   *  that is only used for a lemma with no common-word entry. A geographic name
   *  or surname that shares a spelling with a common word is a different lemma
   *  (`Essen` the city vs `essen` "to eat"), so its links ("city", "surname")
   *  must not become glosses for the common word; a name-only lemma
   *  (`München` -> "munich") keeps them. */
  separateProperNounEntries?: boolean;
  /** Restore each front lemma's canonical Wiktionary capitalization (German
   *  nouns are capitalized, so the card front should read `Haus`, not `haus`).
   *  Only applies with `matchFrontCaseInsensitively`. A lemma is left lowercase
   *  when a lowercase Wiktionary entry for the same spelling is itself a current
   *  real word, because capitalizing then would merge two distinct words (`arm`
   *  "poor" vs `Arm` "arm"). Inflected-only lowercase entries (imperatives,
   *  preterites) and obsolete/rare variants do not block capitalization. */
  capitalizeFrontLemmas?: boolean;
  /** Give a case-homograph its own capitalized card instead of folding both
   *  words onto one lowercase card. German nouns are capitalized, so a lowercase
   *  lemma and its capitalized spelling can be two different words: the adjective
   *  `arm` "poor" versus the noun `Arm` "arm", the adverb `morgen` "tomorrow"
   *  versus the noun `Morgen` "morning". Without this the pipeline keys both
   *  spellings by the lowercase form and merges their glosses onto one card,
   *  hiding the contrast the learner needs. Only applies with
   *  `capitalizeFrontLemmas`. A partner is emitted only when the lowercase
   *  spelling is a current non-noun word and the capitalized spelling is a real
   *  noun of its own (`hasRealNounSense`), so nominalized infinitives (`essen` ->
   *  `Essen` "eating"), capitalized abbreviations (`AM`) and capitalization
   *  redirects (`Du` "letter-case form of du") stay merged. */
  splitCapitalizedHomographs?: boolean;
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

/** True when two gloss lists name at least one different thing, so the
 *  capitalized noun is a distinct word rather than a nominalized repeat of the
 *  lowercase one (`Ja` "a yes" repeats `ja` "yes"; `Gut` "estate, property"
 *  does not repeat `gut` "good"). */
function hasDistinctGloss(lowerGlosses: readonly string[], upperGlosses: readonly string[]): boolean {
  const lower = new Set(lowerGlosses.map(gloss => gloss.toLowerCase()));
  return upperGlosses.some(gloss => !lower.has(gloss.toLowerCase()));
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
  const frontKeyOf = options.matchFrontCaseInsensitively
    ? (word: string) => options.foldFrontEszett
      ? word.toLowerCase().replace(/ß/g, 'ss')
      : word.toLowerCase()
    : (word: string) => word;
  const candidateSet = new Set(candidates.map(frontKeyOf));

  let malformedEntries = 0;
  const backHeadwords = await loadHeadwords(backKaikki, languageBack, () => malformedEntries++);

  const wiktionaryByWord = new Map<string, LemmaData>();
  // Canonical capitalization per lemma (the surface form to show on a card).
  // Only meaningful with `capitalizeFrontLemmas`; the two flags together turn
  // the lowercase frequency spelling into the Wiktionary spelling.
  const canonicalForms = new Map<string, string>();
  const lowercaseWordLemmas = new Set<string>();
  // `ß`-less regional spellings (`Strasse`) redirect to the standard spelling
  // (`Straße`); such a lemma must show the `ß` form, and must not borrow the
  // `ss` spelling's display when the `ss` spelling is itself a real word
  // (`Masse` "mass" must stay `Masse`, not become `Maße`).
  const ssRealSense = new Set<string>();
  // Capitalized proper-noun spellings, applied only to a lemma with no
  // common-word entry. A frequent common word must not be capitalized onto a
  // name homograph: `seine` (possessive) must stay `seine`, not become `Seine`
  // (the river), whereas a name-only lemma (`berlin`) does capitalize.
  const nameCanonical = new Map<string, string>();
  // Proper-noun entries are collected here and only consulted for a lemma with
  // no *non-noun* common-word entry, so a place name never pollutes its
  // homograph. A non-noun entry (`seine`, an inflection of `sein`; `kamen`, a
  // preterite of `kommen`) blocks the fallback even when it yields no
  // translation, because the name homograph (`Seine` the river) is a different
  // word. A noun-only homograph (`Bayern` the state next to the inflected
  // `Bayern` of `Bayer`) still falls back to the name, so real toponyms survive.
  const properNounByWord = new Map<string, LemmaData>();
  const nonNounWordByWord = new Set<string>();
  // A capitalized spelling that is a real noun of its own (`Morgen` "morning")
  // and the lowercase spelling it shares its form with, which is a current
  // non-noun word (`morgen` "tomorrow"). The pair is emitted as a separate
  // capitalized card; see `splitCapitalizedHomographs`.
  const capitalizedNounWords = new Map<string, LemmaData>();
  const lowercaseNonNounLemmas = new Set<string>();
  // The lowercase-only data for a lemma, used for the lowercase card of a split
  // case-homograph so it does not inherit the capitalized noun's glosses. For
  // every other lemma `wiktionaryByWord` (which merges both spellings) is used.
  const lowercaseOnlyByWord = new Map<string, LemmaData>();
  const collectTranslations = (entry: KaikkiEntry, current: LemmaData, key: string): void => {
    for (const ipa of ipaFromSounds(entry)) {
      if (!current.ipa.includes(ipa)) current.ipa.push(ipa);
    }
    if (translationsFromFrontSenses) {
      for (const sense of entry.senses ?? []) {
        if (isInflectionSense(sense)) continue;
        for (const record of translationsForSense(sense, {
          frontLemma: key,
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
  };
  await forEachJsonLine<KaikkiEntry>(options.frontKaikki, entry => {
    if (entry.lang_code !== languageFront || !entry.word) return;
    const key = frontKeyOf(entry.word);
    if (!candidateSet.has(key)) return;
    const isProperNoun = options.separateProperNounEntries && entry.pos === 'name';
    const isLetterCaseRedirect = isProperNoun
      && (entry.senses ?? []).some(sense => isRedirectSense(sense));
    if (isLetterCaseRedirect) return;
    if (isProperNoun) {
      // A name entry's capitalization is a fallback: it must not capitalize a
      // common word onto a name homograph, but it should capitalize a name-only
      // lemma. Deferred to the post-scan resolution below.
      if (options.capitalizeFrontLemmas && entry.word !== key) nameCanonical.set(key, entry.word);
    } else if (options.capitalizeFrontLemmas) {
      if (entry.word === key) {
        // A lowercase entry that is a real word blocks capitalization; an
        // inflected-only one (imperative/preterite) does not.
        if (hasCompetingWordSense(entry)) lowercaseWordLemmas.add(key);
      } else if (hasCompetingWordSense(entry)) {
        const current = canonicalForms.get(key);
        if (!current || entry.word.length < current.length) canonicalForms.set(key, entry.word);
      }
    }
    if (!isProperNoun && options.foldFrontEszett && !entry.word.includes('ß') && hasCompetingWordSense(entry)) {
      ssRealSense.add(key);
    }
    if (
      !isProperNoun
      && options.capitalizeFrontLemmas
      && options.splitCapitalizedHomographs
      && entry.word === key
      && entry.pos !== 'noun'
      && hasCompetingWordSense(entry)
    ) {
      // The lowercase spelling is a current word that is not a noun, so a
      // capitalized noun of the same spelling is a distinct word rather than its
      // capitalized form (`morgen` "tomorrow" vs `Morgen` "morning").
      lowercaseNonNounLemmas.add(key);
    }
    if (
      !isProperNoun
      && options.capitalizeFrontLemmas
      && options.splitCapitalizedHomographs
      && entry.word !== key
      && entry.pos === 'noun'
      && hasCompetingWordSense(entry)
      && hasRealNounSense(entry)
    ) {
      // Collect the capitalized noun's own glosses and IPA separately: the
      // lowercase card must not inherit them, and this map is only merged into
      // the card list for a lemma whose lowercase spelling is a real non-noun.
      const current = capitalizedNounWords.get(key) ?? { ipa: [], translations: [] };
      collectTranslations(entry, current, key);
      capitalizedNounWords.set(key, current);
    }
    if (isProperNoun) {
      const current = properNounByWord.get(key) ?? { ipa: [], translations: [] };
      collectTranslations(entry, current, key);
      properNounByWord.set(key, current);
    } else {
      if (entry.pos !== 'noun') nonNounWordByWord.add(key);
      const current = wiktionaryByWord.get(key) ?? { ipa: [], translations: [] };
      collectTranslations(entry, current, key);
      wiktionaryByWord.set(key, current);
      if (entry.word === key) {
        const lower = lowercaseOnlyByWord.get(key) ?? { ipa: [], translations: [] };
        collectTranslations(entry, lower, key);
        lowercaseOnlyByWord.set(key, lower);
      }
    }
  }, () => malformedEntries++);

  // A lemma whose lowercase spelling is a current non-noun word and whose
  // capitalized spelling is a real noun is two words, not one. Its lowercase
  // card uses the lowercase-only data, and the capitalized noun is emitted as a
  // separate card, so neither card carries the other's glosses. `wiktionaryByWord`
  // keeps both spellings merged for lemma selection, so the split does not move
  // the 3,000-lemma boundary. A single letter is excluded: `A` is the letter's
  // own name, not a distinct word from the interjection `a`. A short lemma (one
  // the short-word curation covers) splits only when its capitalized partner has
  // its own curated entry, because the raw noun links there are mostly rare or
  // figurative senses a beginner should not meet (`All` "cosmos", `Wohl`
  // "wealthy"); the curation is what makes the extra card worth showing.
  const splitLemmas = new Set<string>();
  if (options.capitalizeFrontLemmas && options.splitCapitalizedHomographs) {
    const { shortWordGlosses, shortWordMaxLength } = options;
    for (const key of lowercaseNonNounLemmas) {
      if ([...key].length < 2) continue;
      const upper = capitalizedNounWords.get(key);
      const lower = lowercaseOnlyByWord.get(key);
      // Both spellings need their own entry with a usable translation: a lemma
      // with no lowercase entry (`Uni`) is only the noun and does not split, and
      // one whose lowercase entry has no usable translation keeps the merged card.
      if (!upper || !lower || !lower.translations.length || !upper.translations.length) continue;
      if (!hasDistinctGloss(lower.translations, upper.translations)) continue;
      if (shortWordGlosses && shortWordMaxLength !== undefined && [...key].length <= shortWordMaxLength) {
        const display = key[0].toUpperCase() + key.slice(1);
        if (!shortWordGlosses.has(display)) continue;
      }
      splitLemmas.add(key);
    }
  }

  // A lemma falls back to its name entry only when it has no usable common-word
  // entry: no non-noun entry (`seine`, an inflection of `sein`; `kamen`, a
  // preterite of `kommen`) and no translated common entry (`hütte` "hut" must
  // stay the noun, not become the Eisenhüttenstadt synonym). The fallback then
  // lets real toponyms survive (`bayern`, `schweden`) and adopts the name's
  // capitalization only for such a lemma.
  for (const [key, data] of properNounByWord) {
    if (nonNounWordByWord.has(key)) continue;
    if (wiktionaryByWord.get(key)?.translations.length) continue;
    wiktionaryByWord.set(key, data);
    const name = nameCanonical.get(key);
    if (name && !canonicalForms.has(key)) canonicalForms.set(key, name);
  }

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

  // A split lemma's capitalized noun becomes its own card. A lemma the
  // short-word curation drops (an empty gloss list) stays dropped, so its
  // lowercase card is removed while the capitalized partner still ships.
  const partnerLemmas: string[] = [];
  for (const lemma of selected) {
    if (!splitLemmas.has(lemma)) continue;
    if (isDropped(lemma, options)) continue;
    partnerLemmas.push(lemma);
  }
  const partnerSet = new Set(partnerLemmas);
  const buildLemmas = [...selected, ...partnerLemmas];

  const backWords = new Set<string>();
  for (const lemma of buildLemmas) {
    const data = partnerSet.has(lemma) ? capitalizedNounWords.get(lemma) : wiktionaryByWord.get(lemma);
    for (const translation of data?.translations ?? []) backWords.add(translation);
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
    // A split lemma's lowercase card uses its lowercase-only data so it does not
    // repeat the capitalized noun's glosses. When the lowercase word has no
    // usable translation of its own (an obscure pronoun or numeral entry), the
    // merged data is kept, so the lemma still produces a card and the curation
    // below still applies to it.
    const lowerOnly = splitLemmas.has(lemma) ? lowercaseOnlyByWord.get(lemma) : undefined;
    const data = lowerOnly?.translations.some(back => !shouldRejectTranslation(lemma, back))
      ? lowerOnly
      : wiktionaryByWord.get(lemma);
    if (!data) continue;
    // `lemma` is the lowercase frequency spelling; `display` is the canonical
    // Wiktionary spelling shown on the card (`Haus`, not `haus`). They differ
    // only when capitalization is on and the lemma is safe to capitalize. With
    // `foldFrontEszett`, the same lookup also yields the standard `ß` spelling
    // (`Straße` for `strasse`), since the `ß` entry is the one that competes.
    const display = options.capitalizeFrontLemmas && !lowercaseWordLemmas.has(lemma)
      ? canonicalForms.get(lemma) ?? lemma
      : lemma;
    const frontKey = `${languageFront}:${display}`;
    if (data.ipa.length && !pronunciations[frontKey]) pronunciations[frontKey] = data.ipa.slice(0, 3);

    for (const backLemma of data.translations.slice(0, 8)) {
      if (shouldRejectTranslation(lemma, backLemma)) continue;
      cards.push([display, backLemma]);

      const backKey = `${languageBack}:${backLemma}`;
      if (!pronunciations[backKey]) {
        const ipa = backIpa.get(backLemma);
        if (ipa?.length) pronunciations[backKey] = ipa;
      }
    }
  }

  // The capitalized half of each split case-homograph. Its front is the
  // capitalized spelling; its glosses and IPA come from the noun entry, not from
  // the lowercase word. It joins the card list before curation so a hand-curated
  // entry for the capitalized spelling (keyed exactly, `Ei` not `ei`) applies to
  // it.
  const partnerCards: [string, string][] = [];
  for (const lemma of partnerLemmas) {
    const data = capitalizedNounWords.get(lemma);
    if (!data) continue;
    const display = lemma[0].toUpperCase() + lemma.slice(1);
    const frontKey = `${languageFront}:${display}`;
    if (data.ipa.length && !pronunciations[frontKey]) pronunciations[frontKey] = data.ipa.slice(0, 3);

    for (const backLemma of data.translations.slice(0, 8)) {
      if (shouldRejectTranslation(lemma, backLemma)) continue;
      partnerCards.push([display, backLemma]);

      const backKey = `${languageBack}:${backLemma}`;
      if (!pronunciations[backKey]) {
        const ipa = backIpa.get(backLemma);
        if (ipa?.length) pronunciations[backKey] = ipa;
      }
    }
  }

  const curatedCards = options.shortWordGlosses && options.shortWordMaxLength !== undefined
    ? curateCards([...cards, ...partnerCards], options.shortWordGlosses, options.shortWordMaxLength)
    : [...cards, ...partnerCards];

  // A split lemma whose lowercase spelling the curation drops (an empty gloss
  // list) keeps only its capitalized noun, so the stray lowercase card is
  // removed while the partner card survives.
  const droppedSplits = new Set([...splitLemmas].filter(lemma => isDropped(lemma, options)));
  const finalCards = droppedSplits.size
    ? curatedCards.filter(([front]) => !droppedSplits.has(front))
    : curatedCards;

  const missingCurated = options.shortWordGlosses && options.shortWordMaxLength !== undefined
    ? missingCuratedLemmas(finalCards, options.shortWordGlosses, options.shortWordMaxLength)
    : [];

  const deck: DeckData = {
    uid: options.uid,
    version: options.version,
    displayName: options.displayName,
    languageFront,
    languageBack,
    cards: finalCards,
    pronunciations: trimPronunciationsForCards(finalCards, pronunciations, languageFront, languageBack),
  };

  validate(deck, languageFront, languageBack, options.requiredCard);

  const frontLemmas = new Set(finalCards.map(card => card[0]));
  const backLemmas = new Set(finalCards.map(card => card[1]));
  const report: GenerationReport = {
    frontLemmas: frontLemmas.size,
    cards: finalCards.length,
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
