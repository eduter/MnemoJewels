// German vocabulary deck generator.
//
// Reuses the language-agnostic pipeline in `tools/decks/` that also drives the
// Russian, Spanish, French and Portuguese decks; only the language codes, source
// URLs and the curated short-word map differ, so the work is a thin
// configuration around `tools/decks/generate.ts`.
//
//   # download the source snapshots (~4.4 GB into .cache/german-deck)
//   node --experimental-strip-types tools/german/generate.ts --download
//
//   # generate the deck from already downloaded files
//   node --experimental-strip-types tools/german/generate.ts
//
// Only the German-to-English direction ships. The Jev triage pass runs as a
// separate step on the generated deck (see the README); this generator produces
// the full deck that the pass then filters.

import { resolve } from 'node:path';
import { generateDeck, download, writeGeneration, type DeckGenerationOptions } from '../decks/generate.ts';
import { GERMAN_SHORT_WORD_GLOSSES, GERMAN_SHORT_WORD_MAX_LENGTH } from './germanCuration.ts';

const CACHE = resolve('.cache/german-deck');
const ENGLISH_KAIKKI = resolve(CACHE, 'kaikki-english.jsonl');

const KELLY_URL = 'https://raw.githubusercontent.com/kotoshu/frequency-list-kelly/main/data/de.json';
const GERMAN_URL = 'https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl';
const ENGLISH_URL = 'https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl';

interface Arguments {
  download: boolean;
  kelly?: string;
  german?: string;
  english?: string;
  out?: string;
  report?: string;
}

function parseArguments(argv: string[]): Arguments {
  const parsed: Arguments = { download: false };
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--download') parsed.download = true;
    else if (argument === '--kelly') parsed.kelly = resolve(argv[++index]);
    else if (argument === '--german') parsed.german = resolve(argv[++index]);
    else if (argument === '--english') parsed.english = resolve(argv[++index]);
    else if (argument === '--out') parsed.out = resolve(argv[++index]);
    else if (argument === '--report') parsed.report = resolve(argv[++index]);
  }
  return parsed;
}

const args = parseArguments(process.argv.slice(2));

if (args.download) {
  await download(KELLY_URL, resolve(CACHE, 'kelly-de.json'));
  await download(GERMAN_URL, resolve(CACHE, 'kaikki-german.jsonl'));
  await download(ENGLISH_URL, ENGLISH_KAIKKI);
  process.exit(0);
}

const options: DeckGenerationOptions = {
  uid: 'top-de-en',
  displayName: 'German / English',
  languageFront: 'de',
  languageBack: 'en',
  version: 1,
  kelly: args.kelly ?? resolve(CACHE, 'kelly-de.json'),
  frontKaikki: args.german ?? resolve(CACHE, 'kaikki-german.jsonl'),
  englishKaikki: args.english ?? ENGLISH_KAIKKI,
  output: args.out ?? resolve('public/decks/top-de-en.json'),
  report: args.report ?? resolve('tools/german/top-de-en-validation-report.json'),
  candidateLimit: 6000,
  lemmaTarget: 3000,
  // German adds ä, ö, ü and ß to the Latin letters; the frequency list also
  // carries a few accented loanwords (à, é).
  extraCharacters: 'äöüßàé',
  matchFrontCaseInsensitively: true,
  foldFrontEszett: true,
  separateProperNounEntries: true,
  capitalizeFrontLemmas: true,
  shortWordMaxLength: GERMAN_SHORT_WORD_MAX_LENGTH,
  shortWordGlosses: GERMAN_SHORT_WORD_GLOSSES,
  requiredCard: ['Problem', 'problem'],
};

const result = await generateDeck(options);
await writeGeneration(result, options.output, options.report);
console.log(`Wrote ${options.output}`);
console.log(JSON.stringify(result.report, null, 2));
