// Deterministic obsolete-sense filter for an existing deck.
//
// The generator drops senses Wiktionary marks obsolete/archaic/dated/rare/
// historical, but decks generated before that rule shipped still carry the
// resulting cards (`al` -> "other" on the Portuguese decks). Re-running the full
// pipeline would re-bill the Jev triage pass and lose its decisions, so this
// re-applies just the obsolete rule to a shipped deck, reading the same
// front-language Wiktionary dump the generator used.
//
//   node --experimental-strip-types tools/decks/obsolete.ts \
//     --input public/decks/top-pt-en.json \
//     --kaikki .cache/romance-deck/kaikki-portuguese.jsonl \
//     --language pt --side front
//
// Run with --dry-run first to see the cards that would go.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { DeckData } from '../../src/types.ts';
import type { KaikkiEntry } from './kaikki.ts';
import { isInflectionSense, isObsoleteSense, isRedirectSense, isWhollyObsolete } from './kaikki.ts';
import { englishFromSenseLink } from './translationQuality.ts';
import { forEachJsonLine } from './jsonl.ts';

/** English glosses a lemma produces, split by whether the producing sense is
 *  obsolete. Only senses that are neither inflections nor redirects count, which
 *  mirrors the generator's own sense handling. */
export interface LemmaRegisters {
  current: Set<string>;
  obsolete: Set<string>;
}

/**
 * Builds the per-lemma gloss sets for `words` from a Wiktionary dump.
 *
 * The split is on the sense's own register label (`isObsoleteSense`), so a word
 * whose *head template* is tagged obsolete (`mapa` "map", `juiz` "judge") keeps
 * its current glosses: only the sense's leading raw-gloss label counts. A lemma
 * with no real sense at all (only inflections or redirects) is absent, which the
 * callers treat as "not obsolete" — it is a form, not a stale word.
 */
export async function glossesByLemma(
  kaikkiPath: string,
  language: string,
  words: ReadonlySet<string>,
): Promise<Map<string, LemmaRegisters>> {
  const byLemma = new Map<string, LemmaRegisters>();
  await forEachJsonLine<KaikkiEntry>(kaikkiPath, entry => {
    if (entry.lang_code !== language || !entry.word || !words.has(entry.word)) return;
    const record = byLemma.get(entry.word) ?? { current: new Set<string>(), obsolete: new Set<string>() };
    const real = (entry.senses ?? []).filter(sense =>
      !isInflectionSense(sense) && !isRedirectSense(sense) && (sense.glosses?.length ?? 0) > 0);
    if (!real.length) return;
    // `isWhollyObsolete` is the same predicate the generator uses, so a lemma the
    // generator would drop is dropped here too and the two cannot drift.
    if (isWhollyObsolete(entry)) {
      for (const sense of real) {
        for (const link of sense.links ?? []) {
          const gloss = englishFromSenseLink(link);
          if (gloss) record.obsolete.add(gloss);
        }
      }
    } else {
      for (const sense of real) {
        const target = isObsoleteSense(sense) ? record.obsolete : record.current;
        for (const link of sense.links ?? []) {
          const gloss = englishFromSenseLink(link);
          if (gloss) target.add(gloss);
        }
      }
    }
    byLemma.set(entry.word, record);
  }, () => {});
  return byLemma;
}

/** Which side of a card is in the front (Wiktionary) language. */
export type ObsoleteSide = 'front' | 'back';

/**
 * The `front\0back` keys of cards that only a noncurrent sense justifies.
 *
 * For a `front`-language-front deck the back word is the gloss, so the card goes
 * when that gloss is produced only by obsolete senses. For a reverse deck the
 * front is English and the back is the front-language word itself, so the card
 * goes when the back lemma has no current sense at all — the signal that the
 * word (`al`, `vero`) is not part of current usage.
 */
export function obsoleteCardKeys(
  deck: DeckData,
  byLemma: Map<string, LemmaRegisters>,
  side: ObsoleteSide,
): string[] {
  const keys: string[] = [];
  for (const [front, back] of deck.cards) {
    const lemma = side === 'front' ? front : back;
    const record = byLemma.get(lemma);
    if (!record) continue;
    const obsoleteOnly = side === 'front'
      ? record.obsolete.has(back) && !record.current.has(back)
      : record.obsolete.size > 0 && record.current.size === 0;
    if (obsoleteOnly) keys.push(`${front}\u0000${back}`);
  }
  return keys;
}

export interface ObsoleteFilterResult {
  deck: DeckData;
  removed: string[][];
  prunedPronunciations: number;
}

/** Removes obsolete-only cards, prunes unreferenced pronunciations and bumps the
 *  deck version so installed clients refresh. */
export function filterObsoleteCards(
  deck: DeckData,
  byLemma: Map<string, LemmaRegisters>,
  side: ObsoleteSide,
  version?: number,
): ObsoleteFilterResult {
  const dropKeys = new Set(obsoleteCardKeys(deck, byLemma, side));
  const removed = deck.cards.filter(([front, back]) => dropKeys.has(`${front}\u0000${back}`));
  const kept = deck.cards.filter(([front, back]) => !dropKeys.has(`${front}\u0000${back}`));

  const frontLang = deck.languageFront ?? 'en';
  const backLang = deck.languageBack ?? 'en';
  const allowed = new Set<string>();
  for (const [front, back] of kept) {
    allowed.add(`${frontLang}:${front}`);
    allowed.add(`${backLang}:${back}`);
  }
  const existing = deck.pronunciations ?? {};
  const pronunciations = Object.fromEntries(
    Object.entries(existing).filter(([key]) => allowed.has(key)),
  );

  return {
    deck: {
      ...deck,
      version: version ?? Math.max(deck.version ?? 1, 1) + 1,
      cards: kept,
      pronunciations,
    },
    removed: removed.map(card => [...card]),
    prunedPronunciations: Object.keys(existing).length - Object.keys(pronunciations).length,
  };
}

interface Cli {
  input: string;
  kaikki: string;
  language: string;
  side: ObsoleteSide;
  version?: number;
  dryRun: boolean;
  out?: string;
}

function parseCli(argv: string[]): Cli {
  const cli: Cli = { input: '', kaikki: '', language: '', side: 'front', dryRun: false };
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--input') cli.input = argv[++index];
    else if (argument === '--kaikki') cli.kaikki = argv[++index];
    else if (argument === '--language') cli.language = argv[++index];
    else if (argument === '--side') cli.side = argv[++index] as ObsoleteSide;
    else if (argument === '--version') cli.version = Number(argv[++index]);
    else if (argument === '--out') cli.out = argv[++index];
    else if (argument === '--dry-run') cli.dryRun = true;
  }
  if (!cli.input || !cli.kaikki || !cli.language) {
    throw new Error('Usage: obsolete.ts --input <deck> --kaikki <dump> --language <code> [--side front|back]');
  }
  if (cli.side !== 'front' && cli.side !== 'back') throw new Error(`Unknown --side "${cli.side}"`);
  return cli;
}

async function main(): Promise<void> {
  const cli = parseCli(process.argv.slice(2));
  const deck = JSON.parse(await readFile(resolve(cli.input), 'utf8')) as DeckData;
  const words = new Set(deck.cards.map(card => (cli.side === 'front' ? card[0] : card[1])));
  const byLemma = await glossesByLemma(cli.kaikki, cli.language, words);
  const result = filterObsoleteCards(deck, byLemma, cli.side, cli.version);

  if (cli.dryRun) {
    console.log(`Would remove ${result.removed.length} of ${deck.cards.length} cards `
      + `and ${result.prunedPronunciations} orphaned pronunciations.`);
    for (const [front, back] of result.removed) console.log(`  ${front} → ${back}`);
    process.exit(0);
  }

  const output = resolve(cli.out ?? cli.input);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(result.deck, null, 2)}\n`);
  console.log(`Removed ${result.removed.length} cards and ${result.prunedPronunciations} `
    + `orphaned pronunciations; ${result.deck.cards.length} remain. `
    + `Deck version is now ${result.deck.version}.`);
}

if (process.argv[1] && import.meta.url === `file://${resolve(process.argv[1])}`) {
  await main();
}
