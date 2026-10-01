// Spanish and French vocabulary deck generator.
//
// Both decks use the same pipeline as the Russian one (Kelly frequency +
// Kaikki Wiktextract + a curated short-word map); only the language codes and
// source URLs differ, so the work is a thin configuration around
// `tools/decks/generate.ts`.
//
//   # download the source snapshots (~5 GB into .cache/romance-deck)
//   node --experimental-strip-types tools/romance/generate.ts --download
//
//   # generate one deck from already downloaded files
//   node --experimental-strip-types tools/romance/generate.ts --language es

import { resolve } from 'node:path';
import { generateDeck, download, writeGeneration, type DeckGenerationOptions } from '../decks/generate.ts';
import { SPANISH_SHORT_WORD_GLOSSES, SPANISH_SHORT_WORD_MAX_LENGTH } from './spanishCuration.ts';
import { FRENCH_SHORT_WORD_GLOSSES, FRENCH_SHORT_WORD_MAX_LENGTH } from './frenchCuration.ts';

const CACHE = resolve('.cache/romance-deck');

interface LanguageConfig {
  uid: string;
  displayName: string;
  languageFront: string;
  /** Letters beyond A-Z that may appear inside a lemma, plus internal punctuation. */
  extraCharacters: string;
  shortWordMaxLength: number;
  shortWordGlosses: ReadonlyMap<string, readonly string[]>;
  requiredCard: [string, string];
  kellyUrl: string;
  frontKaikkiUrl: string;
  /** File name the download is cached under in `.cache/romance-deck`. */
  frontKaikkiFile: string;
}

const LANGUAGES: Record<string, LanguageConfig> = {
  es: {
    uid: 'top-es-en',
    displayName: 'Spanish / English',
    languageFront: 'es',
    extraCharacters: "áéíóúüñ'",
    shortWordMaxLength: SPANISH_SHORT_WORD_MAX_LENGTH,
    shortWordGlosses: SPANISH_SHORT_WORD_GLOSSES,
    requiredCard: ['problema', 'problem'],
    kellyUrl: 'https://raw.githubusercontent.com/kotoshu/frequency-list-kelly/main/data/es.json',
    frontKaikkiUrl: 'https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl',
    frontKaikkiFile: 'kaikki-spanish.jsonl',
  },
  fr: {
    uid: 'top-fr-en',
    displayName: 'French / English',
    languageFront: 'fr',
    extraCharacters: "àâçéèêëîïôûùüÿœæ'",
    shortWordMaxLength: FRENCH_SHORT_WORD_MAX_LENGTH,
    shortWordGlosses: FRENCH_SHORT_WORD_GLOSSES,
    requiredCard: ['problème', 'problem'],
    kellyUrl: 'https://raw.githubusercontent.com/kotoshu/frequency-list-kelly/main/data/fr.json',
    frontKaikkiUrl: 'https://kaikki.org/dictionary/French/kaikki.org-dictionary-French.jsonl',
    frontKaikkiFile: 'kaikki-french.jsonl',
  },
};

const ENGLISH_KAIKKI_URL = 'https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl';
const ENGLISH_KAIKKI = resolve(CACHE, 'kaikki-english.jsonl');

interface Arguments {
  languages: string[];
  download: boolean;
  front?: string;
  english?: string;
  out?: string;
}

function parseArguments(argv: string[]): Arguments {
  const parsed: Arguments = { languages: [], download: false };
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--download') parsed.download = true;
    else if (argument === '--language') parsed.languages.push(argv[++index]);
    else if (argument === '--front') parsed.front = resolve(argv[++index]);
    else if (argument === '--english') parsed.english = resolve(argv[++index]);
    else if (argument === '--out') parsed.out = resolve(argv[++index]);
    else if (!argument.startsWith('--')) parsed.languages.push(argument);
  }
  if (!parsed.languages.length) parsed.languages = Object.keys(LANGUAGES);
  return parsed;
}

const args = parseArguments(process.argv.slice(2));

if (args.download) {
  for (const language of args.languages) {
    const config = LANGUAGES[language];
    if (!config) throw new Error(`Unknown language "${language}"`);
    await download(config.kellyUrl, resolve(CACHE, `kelly-${language}.json`));
    await download(config.frontKaikkiUrl, resolve(CACHE, config.frontKaikkiFile));
  }
  await download(ENGLISH_KAIKKI_URL, ENGLISH_KAIKKI);
  process.exit(0);
}

for (const language of args.languages) {
  const config = LANGUAGES[language];
  if (!config) throw new Error(`Unknown language "${language}"`);
  const options: DeckGenerationOptions = {
    uid: config.uid,
    displayName: config.displayName,
    languageFront: config.languageFront,
    languageBack: 'en',
    version: 1,
    kelly: resolve(CACHE, `kelly-${language}.json`),
    frontKaikki: args.front ?? resolve(CACHE, config.frontKaikkiFile),
    englishKaikki: args.english ?? ENGLISH_KAIKKI,
    output: args.out ?? resolve(`public/decks/${config.uid}.json`),
    report: resolve(`tools/romance/${config.uid}-validation-report.json`),
    candidateLimit: 6000,
    lemmaTarget: 3000,
    extraCharacters: config.extraCharacters,
    shortWordMaxLength: config.shortWordMaxLength,
    shortWordGlosses: config.shortWordGlosses,
    requiredCard: config.requiredCard,
  };
  const result = await generateDeck(options);
  await writeGeneration(result, options.output, options.report);
  console.log(`Wrote ${options.output}`);
  console.log(JSON.stringify(result.report, null, 2));
}
