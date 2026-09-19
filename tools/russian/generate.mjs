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
const options = parseArguments(process.argv.slice(2));

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
    displays: new Set(),
    partsOfSpeech: new Set(),
    translations: new Map(),
    borrowed: false,
  };
  for (const sound of entry.sounds ?? []) {
    if (typeof sound.ipa === 'string') current.ipa.add(sound.ipa);
  }
  for (const form of entry.forms ?? []) {
    if (form.tags?.includes('canonical') && typeof form.form === 'string') current.displays.add(form.form);
  }
  if (typeof entry.pos === 'string') current.partsOfSpeech.add(entry.pos);
  if (typeof entry.etymology_text === 'string' && /borrowed from/i.test(entry.etymology_text)) {
    current.borrowed = true;
  }
  for (const sense of entry.senses ?? []) {
    for (const translation of translationsForSense(sense)) {
      const senses = current.translations.get(translation) ?? new Set();
      for (const gloss of sense.glosses ?? []) {
        if (typeof gloss === 'string') senses.add(gloss);
      }
      current.translations.set(translation, senses);
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

const items = {};
const translations = [];
const similarities = [];
const cards = [];
const englishIds = new Map();

for (const frequencyEntry of selected) {
  const data = wiktionaryByWord.get(frequencyEntry.word);
  const russianId = `ru:${frequencyEntry.rank}`;
  items[russianId] = {
    id: russianId,
    language: 'ru',
    lemma: frequencyEntry.word,
    ...(first(data.displays) && first(data.displays) !== frequencyEntry.word
      ? { display: first(data.displays) }
      : {}),
    ...(data.ipa.size ? { ipa: [...data.ipa].slice(0, 3) } : {}),
    partOfSpeech: [...data.partsOfSpeech].join('/'),
    ...(data.borrowed
      ? { etymology: { source: 'wiktionary', text: 'Wiktionary identifies this lemma as borrowed.' } }
      : {}),
    frequency: {
      rank: frequencyEntry.rank,
      ipm: frequencyEntry.ipm,
      cefr: frequencyEntry.cefr,
    },
  };

  for (const [englishLemma, senses] of [...data.translations].slice(0, 8)) {
    let englishId = englishIds.get(englishLemma);
    if (!englishId) {
      englishId = `en:${englishIds.size + 1}`;
      englishIds.set(englishLemma, englishId);
      const ipa = englishIpa.get(englishLemma);
      items[englishId] = {
        id: englishId,
        language: 'en',
        lemma: englishLemma,
        ...(ipa?.size ? { ipa: [...ipa] } : {}),
      };
    }
    translations.push({
      source: russianId,
      target: englishId,
      ...(senses.size ? { senses: [...senses].slice(0, 4) } : {}),
    });
    cards.push([frequencyEntry.word, englishLemma]);

    const scores = lexicalSimilarity(items[russianId], items[englishId]);
    if (scores.score >= 0.58) {
      similarities.push({
        source: russianId,
        target: englishId,
        relationship: (scores.phonologicalScore ?? 0) >= scores.orthographicScore
          ? 'phonologically_similar'
          : 'orthographically_similar',
        sourceType: 'computed',
        confidence: scores.score,
        score: scores.score,
        ...(scores.phonologicalScore === undefined ? {} : { phonologicalScore: scores.phonologicalScore }),
        orthographicScore: scores.orthographicScore,
      });
    }
  }
}

const deck = {
  uid: 'top-ru-en',
  version: 1,
  displayName: 'Russian / English',
  languageFront: 'ru',
  languageBack: 'en',
  cards,
  lexicon: { items, translations, similarities },
  provenance: {
    frequency: {
      source: 'Kelly Russian frequency list',
      url: 'https://ssharoff.github.io/kelly/ru_m3.xls',
      processedMirror: KELLY_URL,
      license: 'CC BY-NC-SA 2.0',
    },
    lexical: {
      source: 'Kaikki/Wiktextract extraction of English Wiktionary',
      url: 'https://kaikki.org/dictionary/',
      wiktionaryDump: '2026-09-02',
      extracted: '2026-09-16',
      license: 'CC BY-SA 4.0',
    },
  },
};

validate(deck);
const russianItems = Object.values(items).filter(item => item.language === 'ru');
const englishItems = Object.values(items).filter(item => item.language === 'en');
const duplicateCards = cards.length - new Set(cards.map(card => JSON.stringify(card))).size;
const report = {
  russianLemmas: russianItems.length,
  frequencyRankRange: [
    Math.min(...russianItems.map(item => item.frequency.rank)),
    Math.max(...russianItems.map(item => item.frequency.rank)),
  ],
  russianWithIpa: russianItems.filter(item => item.ipa?.length).length,
  russianWithoutIpa: russianItems.filter(item => !item.ipa?.length).length,
  russianWithTranslation: new Set(translations.map(relation => relation.source)).size,
  russianWithoutTranslation: russianItems.length - new Set(translations.map(relation => relation.source)).size,
  englishLexicalItems: englishItems.length,
  englishWithIpa: englishItems.filter(item => item.ipa?.length).length,
  englishWithoutIpa: englishItems.filter(item => !item.ipa?.length).length,
  translationRelationships: translations.length,
  similarityAnnotations: similarities.length,
  frequencyDuplicateRows: frequencyDuplicates,
  duplicateCards,
  malformedEntries,
};

await mkdir(dirname(options.output), { recursive: true });
await writeFile(options.output, `${JSON.stringify(deck)}\n`);
await mkdir(dirname(options.report), { recursive: true });
await writeFile(options.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

function parseArguments(args) {
  const values = {
    download: false,
    kelly: resolve(DEFAULT_CACHE, 'kelly-ru.json'),
    russian: resolve(DEFAULT_CACHE, 'kaikki-russian.jsonl'),
    english: resolve(DEFAULT_CACHE, 'kaikki-english.jsonl'),
    output: resolve('public/decks/top-ru-en.json'),
    report: resolve('tools/russian/validation-report.json'),
  };
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--download') values.download = true;
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
    && !/^(Appendix|Category|Thesaurus|Wiktionary)$/i.test(value);
}

function normalizeTranslation(value) {
  return value.trim().toLowerCase().replace(/^to\s+/, '');
}

function countDuplicates(values) {
  return values.length - new Set(values).size;
}

function first(set) {
  return set.values().next().value;
}

function validate(deck) {
  const itemIds = new Set(Object.keys(deck.lexicon.items));
  if (deck.cards.length !== deck.lexicon.translations.length) {
    throw new Error('Every card must have exactly one translation relationship.');
  }
  if (new Set(deck.cards.map(card => JSON.stringify(card))).size !== deck.cards.length) {
    throw new Error('Duplicate cards were generated.');
  }
  for (const relation of deck.lexicon.translations) {
    if (!itemIds.has(relation.source) || !itemIds.has(relation.target)) {
      throw new Error(`Translation references an unknown lexical item: ${JSON.stringify(relation)}`);
    }
  }
  const problem = deck.lexicon.translations.find(relation =>
    deck.lexicon.items[relation.source].lemma === 'проблема'
      && deck.lexicon.items[relation.target].lemma === 'problem');
  if (!problem) throw new Error('Required проблема/problem relationship is missing.');
}

function lexicalSimilarity(left, right) {
  const leftOrthographic = transliterate(left.lemma);
  const rightOrthographic = transliterate(right.lemma);
  const orthographicScore = normalizedSimilarity(leftOrthographic, rightOrthographic);
  let phonologicalScore;
  for (const leftIpa of left.ipa ?? []) {
    for (const rightIpa of right.ipa ?? []) {
      phonologicalScore = Math.max(
        phonologicalScore ?? 0,
        normalizedSimilarity(normalizeIpa(leftIpa), normalizeIpa(rightIpa)),
      );
    }
  }
  const score = phonologicalScore === undefined
    ? orthographicScore
    : 0.65 * phonologicalScore + 0.35 * orthographicScore;
  return {
    score: round(score),
    phonologicalScore: phonologicalScore === undefined ? undefined : round(phonologicalScore),
    orthographicScore: round(orthographicScore),
  };
}

function normalizeIpa(ipa) {
  return ipa.normalize('NFD').toLowerCase()
    .replace(/[\/[\]().‿\sˈˌ._-]/gu, '')
    .replace(/[̩̯͜͡]/gu, '')
    .normalize('NFC');
}

function transliterate(value) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
    з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
    п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
    ч: 'ch', ш: 'sh', щ: 'shch', ы: 'y', э: 'e', ю: 'yu', я: 'ya',
    ь: '', ъ: '',
  };
  return [...value.normalize('NFD').toLowerCase()]
    .map(character => map[character] ?? character).join('').replace(/\p{M}|\W/gu, '');
}

function normalizedSimilarity(left, right) {
  if (left === right) return 1;
  if (!left.length || !right.length) return 0;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array(right.length + 1);
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
  return 1 - previous[right.length] / Math.max(left.length, right.length);
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
