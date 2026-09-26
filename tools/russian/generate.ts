import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { DeckData, DeckLexicon } from '../../src/types.ts';
import type { KaikkiEntry, KellyFile } from './kaikki.ts';
import { forEachJsonLine } from './jsonl.ts';
import { shouldRejectTranslation, translationsForSense } from './translationQuality.ts';

const KELLY_URL = 'https://raw.githubusercontent.com/kotoshu/frequency-list-kelly/main/data/ru.json';
const RUSSIAN_URL = 'https://kaikki.org/dictionary/Russian/kaikki.org-dictionary-Russian.jsonl';
const ENGLISH_URL = 'https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl';
const DEFAULT_CACHE = resolve('.cache/russian-deck');

interface GeneratorOptions {
  download: boolean;
  sanitize: boolean;
  kelly: string;
  russian: string;
  english: string;
  output: string;
  report: string;
}

interface LemmaData {
  ipa: Set<string>;
  translations: Map<string, true>;
}

const options = parseArguments(process.argv.slice(2));

if (options.sanitize) {
  const deck = JSON.parse(await readFile(options.output, 'utf8')) as DeckData;
  const englishHeadwords = await loadEnglishHeadwords(options.english);
  sanitizeDeck(deck, englishHeadwords);
  compactDeck(deck);
  deck.version = Math.max(deck.version ?? 1, 3);
  validate(deck);
  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(deck, null, 4)}\n`);
  console.log(`Sanitized ${deck.cards.length} cards -> ${options.output}`);
  process.exit(0);
}

if (options.download) {
  await mkdir(DEFAULT_CACHE, { recursive: true });
  await download(KELLY_URL, options.kelly);
  await download(RUSSIAN_URL, options.russian);
  await download(ENGLISH_URL, options.english);
}

const englishHeadwords = await loadEnglishHeadwords(options.english);

const kelly = JSON.parse(await readFile(options.kelly, 'utf8')) as KellyFile;
const frequencyDuplicates = countDuplicates(kelly.full_list.map(entry => entry.word));
const candidates = uniqueUsefulFrequencyEntries(kelly.full_list).slice(0, 4500);
const candidateWords = new Set(candidates.map(entry => entry.word));
const wiktionaryByWord = new Map<string, LemmaData>();
let malformedEntries = 0;

await forEachJsonLine<KaikkiEntry>(options.russian, entry => {
  if (entry.lang_code !== 'ru' || !entry.word || !candidateWords.has(entry.word)) return;
  const current = wiktionaryByWord.get(entry.word) ?? {
    ipa: new Set<string>(),
    translations: new Map<string, true>(),
  };
  for (const sound of entry.sounds ?? []) {
    if (typeof sound.ipa === 'string') current.ipa.add(sound.ipa);
  }
  for (const sense of entry.senses ?? []) {
    for (const record of translationsForSense(sense, { russianLemma: entry.word, englishHeadwords })) {
      current.translations.set(record.value, true);
    }
  }
  wiktionaryByWord.set(entry.word, current);
}, () => malformedEntries++);

const selected = candidates
  .filter(entry => wiktionaryByWord.get(entry.word)?.translations.size)
  .slice(0, 3000);
if (selected.length !== 3000) {
  throw new Error(`Only ${selected.length} usable Russian lemmas were found; expected 3000.`);
}

const englishWords = new Set<string>();
for (const entry of selected) {
  const data = wiktionaryByWord.get(entry.word);
  if (!data) continue;
  for (const translation of data.translations.keys()) {
    englishWords.add(translation);
  }
}

const englishIpa = new Map<string, Set<string>>();
await forEachJsonLine<KaikkiEntry>(options.english, entry => {
  const word = typeof entry.word === 'string' ? entry.word.toLowerCase() : '';
  if (entry.lang_code !== 'en' || !englishWords.has(word)) return;
  const pronunciations = englishIpa.get(word) ?? new Set<string>();
  for (const sound of entry.sounds ?? []) {
    if (typeof sound.ipa === 'string' && pronunciations.size < 4) pronunciations.add(sound.ipa);
  }
  englishIpa.set(word, pronunciations);
}, () => malformedEntries++);

const pronunciations: Record<string, string[]> = {};
const cards: [string, string][] = [];

for (const frequencyEntry of selected) {
  const data = wiktionaryByWord.get(frequencyEntry.word);
  if (!data) continue;
  const russianKey = `ru:${frequencyEntry.word}`;
  if (data.ipa.size && !pronunciations[russianKey]) {
    pronunciations[russianKey] = [...data.ipa].slice(0, 3);
  }

  for (const [englishLemma] of [...data.translations].slice(0, 8)) {
    if (shouldRejectTranslation(frequencyEntry.word, englishLemma)) continue;
    cards.push([frequencyEntry.word, englishLemma]);

    const englishKey = `en:${englishLemma}`;
    if (!pronunciations[englishKey]) {
      const ipa = englishIpa.get(englishLemma);
      if (ipa?.size) pronunciations[englishKey] = [...ipa];
    }
  }
}

const deck: DeckData = {
  uid: 'top-ru-en',
  version: 3,
  displayName: 'Russian / English',
  languageFront: 'ru',
  languageBack: 'en',
  cards,
  pronunciations: trimPronunciationsForCards(cards, pronunciations),
};

validate(deck);
const russianLemmas = new Set(cards.map(card => card[0]));
const englishLemmas = new Set(cards.map(card => card[1]));
const duplicateCards = cards.length - new Set(cards.map(card => JSON.stringify(card))).size;
const report = {
  russianLemmas: russianLemmas.size,
  cards: cards.length,
  russianWithIpa: [...russianLemmas].filter(lemma => pronunciations[`ru:${lemma}`]?.length).length,
  russianWithoutIpa: [...russianLemmas].filter(lemma => !pronunciations[`ru:${lemma}`]?.length).length,
  englishLemmas: englishLemmas.size,
  englishWithIpa: [...englishLemmas].filter(lemma => pronunciations[`en:${lemma}`]?.length).length,
  englishWithoutIpa: [...englishLemmas].filter(lemma => !pronunciations[`en:${lemma}`]?.length).length,
  pronunciationEntries: Object.keys(deck.pronunciations ?? {}).length,
  frequencyDuplicateRows: frequencyDuplicates,
  duplicateCards,
  malformedEntries,
};

await mkdir(dirname(options.output), { recursive: true });
await writeFile(options.output, `${JSON.stringify(deck, null, 4)}\n`);
await mkdir(dirname(options.report), { recursive: true });
await writeFile(options.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

function sanitizeDeck(deck: DeckData, englishHeadwords: Set<string>): void {
  if (deck.lexicon?.items && deck.lexicon?.translations) {
    const items = deck.lexicon.items;
    deck.cards = deck.lexicon.translations
      .filter(relation => !shouldRejectTranslation(
        items[relation.source].lemma,
        items[relation.target].lemma,
      ))
      .map(relation => [items[relation.source].lemma, items[relation.target].lemma]);
    return;
  }
  deck.cards = deck.cards.filter(([russianLemma, englishLemma]) => {
    if (shouldRejectTranslation(russianLemma, englishLemma)) return false;
    return englishHeadwords.has(englishLemma.toLowerCase());
  });
}

function compactDeck(deck: DeckData): void {
  if (!deck.pronunciations && deck.lexicon?.items) {
    deck.pronunciations = pronunciationsFromLexicon(deck.lexicon);
  }
  deck.pronunciations = trimPronunciationsForCards(deck.cards, deck.pronunciations ?? {});
  delete deck.lexicon;
}

function pronunciationsFromLexicon(lexicon: DeckLexicon): Record<string, string[]> {
  const pronunciations: Record<string, string[]> = {};
  for (const item of Object.values(lexicon.items)) {
    if (item.ipa?.length) {
      pronunciations[`${item.language}:${item.lemma}`] = item.ipa;
    }
  }
  return pronunciations;
}

function trimPronunciationsForCards(
  cards: [string, string][],
  pronunciations: Record<string, string[]>,
): Record<string, string[]> {
  const trimmed: Record<string, string[]> = {};
  for (const [russianLemma, englishLemma] of cards) {
    const russianKey = `ru:${russianLemma}`;
    const englishKey = `en:${englishLemma}`;
    if (pronunciations[russianKey]?.length) trimmed[russianKey] = pronunciations[russianKey];
    if (pronunciations[englishKey]?.length) trimmed[englishKey] = pronunciations[englishKey];
  }
  return trimmed;
}

async function loadEnglishHeadwords(path: string): Promise<Set<string>> {
  const headwords = new Set<string>();
  await forEachJsonLine<KaikkiEntry>(path, entry => {
    if (entry.lang_code !== 'en' || typeof entry.word !== 'string') return;
    headwords.add(entry.word.toLowerCase());
  });
  return headwords;
}

function parseArguments(args: string[]): GeneratorOptions {
  const values: GeneratorOptions = {
    download: false,
    sanitize: false,
    kelly: resolve(DEFAULT_CACHE, 'kelly-ru.json'),
    russian: resolve(DEFAULT_CACHE, 'kaikki-russian.jsonl'),
    english: resolve(DEFAULT_CACHE, 'kaikki-english.jsonl'),
    output: resolve('public/decks/top-ru-en.json'),
    report: resolve('tools/russian/validation-report.json'),
  };
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--download') values.download = true;
    else if (args[index] === '--sanitize') values.sanitize = true;
    else if (args[index] === '--kelly') values.kelly = resolve(args[++index]);
    else if (args[index] === '--russian') values.russian = resolve(args[++index]);
    else if (args[index] === '--english') values.english = resolve(args[++index]);
    else if (args[index] === '--output') values.output = resolve(args[++index]);
    else if (args[index] === '--report') values.report = resolve(args[++index]);
  }
  return values;
}

async function download(url: string, destination: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Download failed: ${url} (${response.status})`);
  await mkdir(dirname(destination), { recursive: true });
  console.log(`Downloading ${url}`);
  await pipeline(
    Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
    createWriteStream(destination),
  );
}

function uniqueUsefulFrequencyEntries(entries: KellyFile['full_list']): KellyFile['full_list'] {
  const seen = new Set<string>();
  return entries.filter(entry => {
    if (
      seen.has(entry.word)
      || typeof entry.word !== 'string'
      || !/^[а-яё-]+$/iu.test(entry.word)
      || entry.word.startsWith('-')
      || entry.word.endsWith('-')
    ) return false;
    seen.add(entry.word);
    return true;
  });
}

function countDuplicates(values: string[]): number {
  return values.length - new Set(values).size;
}

function validate(deck: DeckData): void {
  if (!deck.cards.length) {
    throw new Error('Deck has no cards.');
  }
  if (new Set(deck.cards.map(card => JSON.stringify(card))).size !== deck.cards.length) {
    throw new Error('Duplicate cards were generated.');
  }
  if (!deck.pronunciations || !Object.keys(deck.pronunciations).length) {
    throw new Error('Deck is missing pronunciations.');
  }
  const hasProblemCard = deck.cards.some(([russianLemma, englishLemma]) =>
    russianLemma === 'проблема' && englishLemma === 'problem');
  if (!hasProblemCard) {
    throw new Error('Required проблема/problem card is missing.');
  }
  if (!deck.pronunciations['ru:проблема']?.length || !deck.pronunciations['en:problem']?.length) {
    throw new Error('Required проблема/problem IPA is missing.');
  }
  const trimmed = trimPronunciationsForCards(deck.cards, deck.pronunciations);
  if (JSON.stringify(trimmed) !== JSON.stringify(deck.pronunciations)) {
    throw new Error('Pronunciations include entries not referenced by cards.');
  }
}
