import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import readline from 'node:readline';

const KELLY_URL = 'https://raw.githubusercontent.com/kotoshu/frequency-list-kelly/main/data/ru.json';
const RUSSIAN_URL = 'https://kaikki.org/dictionary/Russian/kaikki.org-dictionary-Russian.jsonl';
const ENGLISH_URL = 'https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl';
const DEFAULT_CACHE = resolve('.cache/russian-deck');

const VOCABULARY_POS_TRANSLATIONS = new Map([
  ['глагол', 'verb'],
  ['предлог', 'preposition'],
  ['прилагательное', 'adjective'],
  ['наречие', 'adverb'],
  ['существительное', 'noun'],
  ['местоимение', 'pronoun'],
  ['союз', 'conjunction'],
  ['междометие', 'interjection'],
  ['числительное', 'numeral'],
  ['алфавит', 'alphabet'],
  ['азбука', 'alphabet'],
  ['буква', 'letter'],
]);

const options = parseArguments(process.argv.slice(2));

if (options.sanitize) {
  const deck = JSON.parse(await readFile(options.output, 'utf8'));
  sanitizeDeck(deck);
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

const kelly = JSON.parse(await readFile(options.kelly, 'utf8'));
const frequencyDuplicates = countDuplicates(kelly.full_list.map(entry => entry.word));
const candidates = uniqueUsefulFrequencyEntries(kelly.full_list).slice(0, 4500);
const candidateWords = new Set(candidates.map(entry => entry.word));
const wiktionaryByWord = new Map();
let malformedEntries = 0;

await forEachJsonLine(options.russian, entry => {
  if (entry.lang_code !== 'ru' || !candidateWords.has(entry.word)) return;
  const current = wiktionaryByWord.get(entry.word) ?? {
    ipa: new Set(),
    translations: new Map(),
  };
  for (const sound of entry.sounds ?? []) {
    if (typeof sound.ipa === 'string') current.ipa.add(sound.ipa);
  }
  for (const sense of entry.senses ?? []) {
    for (const translation of translationsForSense(sense)) {
      current.translations.set(translation, true);
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

const englishWords = new Set();
for (const entry of selected) {
  for (const translation of wiktionaryByWord.get(entry.word).translations.keys()) {
    englishWords.add(translation);
  }
}

const englishIpa = new Map();
await forEachJsonLine(options.english, entry => {
  const word = typeof entry.word === 'string' ? entry.word.toLowerCase() : '';
  if (entry.lang_code !== 'en' || !englishWords.has(word)) return;
  const pronunciations = englishIpa.get(word) ?? new Set();
  for (const sound of entry.sounds ?? []) {
    if (typeof sound.ipa === 'string' && pronunciations.size < 4) pronunciations.add(sound.ipa);
  }
  englishIpa.set(word, pronunciations);
}, () => malformedEntries++);

const pronunciations = {};
const cards = [];

for (const frequencyEntry of selected) {
  const data = wiktionaryByWord.get(frequencyEntry.word);
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

const deck = {
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
  pronunciationEntries: Object.keys(deck.pronunciations).length,
  frequencyDuplicateRows: frequencyDuplicates,
  duplicateCards,
  malformedEntries,
};

await mkdir(dirname(options.output), { recursive: true });
await writeFile(options.output, `${JSON.stringify(deck, null, 4)}\n`);
await mkdir(dirname(options.report), { recursive: true });
await writeFile(options.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

function sanitizeDeck(deck) {
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
  deck.cards = deck.cards.filter(([russianLemma, englishLemma]) =>
    !shouldRejectTranslation(russianLemma, englishLemma));
}

function compactDeck(deck) {
  if (!deck.pronunciations && deck.lexicon?.items) {
    deck.pronunciations = pronunciationsFromLexicon(deck.lexicon);
  }
  deck.pronunciations = trimPronunciationsForCards(deck.cards, deck.pronunciations ?? {});
  delete deck.lexicon;
  delete deck.provenance;
}

function pronunciationsFromLexicon(lexicon) {
  const pronunciations = {};
  for (const item of Object.values(lexicon.items)) {
    if (item.ipa?.length) {
      pronunciations[`${item.language}:${item.lemma}`] = item.ipa;
    }
  }
  return pronunciations;
}

function trimPronunciationsForCards(cards, pronunciations) {
  const trimmed = {};
  for (const [russianLemma, englishLemma] of cards) {
    const russianKey = `ru:${russianLemma}`;
    const englishKey = `en:${englishLemma}`;
    if (pronunciations[russianKey]?.length) trimmed[russianKey] = pronunciations[russianKey];
    if (pronunciations[englishKey]?.length) trimmed[englishKey] = pronunciations[englishKey];
  }
  return trimmed;
}

function parseArguments(args) {
  const values = {
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
    else if (args[index].startsWith('--')) values[args[index].slice(2)] = resolve(args[++index]);
  }
  return values;
}

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Download failed: ${url} (${response.status})`);
  await mkdir(dirname(destination), { recursive: true });
  console.log(`Downloading ${url}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
}

async function forEachJsonLine(path, callback, onMalformed) {
  const lines = readline.createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of lines) {
    try {
      callback(JSON.parse(line));
    } catch {
      onMalformed();
    }
  }
}

function uniqueUsefulFrequencyEntries(entries) {
  const seen = new Set();
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

function translationsForSense(sense) {
  const translations = new Set();
  for (const link of sense.links ?? []) {
    const value = Array.isArray(link) ? link[0] : undefined;
    if (isEnglishTranslation(value)) translations.add(normalizeTranslation(value));
  }
  if (!translations.size && typeof sense.glosses?.[0] === 'string') {
    const fallback = sense.glosses[0].split(/[;,([]/, 1)[0].trim();
    if (isEnglishTranslation(fallback)) translations.add(normalizeTranslation(fallback));
  }
  return [...translations].filter(Boolean).slice(0, 4);
}

function isEnglishTranslation(value) {
  return typeof value === 'string'
    && value.length <= 45
    && /^[A-Za-z][A-Za-z '-]*$/.test(value)
    && !/^(Appendix|Category|Thesaurus|Wiktionary)$/i.test(value)
    && !shouldRejectTranslation('', normalizeTranslation(value));
}

/** Wiktionary glosses and letter-name senses that are not learner-facing translations. */
function shouldRejectTranslation(russianLemma, englishLemma) {
  const english = englishLemma.toLowerCase();
  const allowedPos = VOCABULARY_POS_TRANSLATIONS.get(russianLemma.toLowerCase());
  if (allowedPos === english) return false;

  if (russianLemma.length === 1 && (english === 'letter' || english === 'alphabet')) {
    return true;
  }
  if (/^demonstrative\b/.test(english) || english === 'personal pronoun') {
    return true;
  }
  if (/\bidiomatic\b/.test(english)) {
    return true;
  }
  if (/^(pronoun|determiner|noun|verb|adjective|adverb|conjunction|interjection|particle|numeral|article|prefix|suffix)$/.test(english)) {
    return true;
  }
  return false;
}

function normalizeTranslation(value) {
  return value.trim().toLowerCase().replace(/^to\s+/, '');
}

function countDuplicates(values) {
  return values.length - new Set(values).size;
}

function validate(deck) {
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
