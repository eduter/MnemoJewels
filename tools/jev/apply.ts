// Applies a drop file produced by the Jev triage to a deck, removing the flagged
// `[front, back]` pairs, pruning pronunciation entries no card references, and
// bumping the version so clients refresh.
//
//   node --experimental-strip-types tools/jev/apply.ts \
//     --input public/decks/<deck>.json \
//     --drops .cache/jev/<deck>/drop.json \
//     --version 5
//
// Run with --dry-run first to see what would change.
//
// Deck-agnostic: the pronunciation key prefixes come from the deck's declared
// `languageFront` / `languageBack`, so an empty `pronunciations` map stays empty
// for decks (or legacy formats) that key entries differently.

import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { readDeck, writeJson } from './triage.ts';
import { readFile } from 'node:fs/promises';
import type { DeckData } from '../../src/types.ts';
import type { DropFile } from './types.ts';

export interface ApplyResult {
  deck: DeckData;
  removed: number;
  prunedPronunciations: number;
}

/**
 * Removes the dropped pairs from the deck's cards and prunes any pronunciation
 * entries no surviving card references.
 *
 * Pronunciations are keyed by lemma (`<language>:<lemma>`), not by pair, so
 * dropping cards can leave entries that nothing references; decks assert their
 * absence.
 */
export function applyDrops(deck: DeckData, drops: DropFile, version?: number): ApplyResult {
  const dropKeys = new Set(drops.cards.map(card => `${card.front}\u0000${card.back}`));
  const kept = deck.cards.filter(([front, back]) => !dropKeys.has(`${front}\u0000${back}`));

  const frontLang = deck.languageFront ?? 'ru';
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
    removed: deck.cards.length - kept.length,
    prunedPronunciations: Object.keys(existing).length - Object.keys(pronunciations).length,
  };
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      input: { type: 'string', required: true },
      drops: { type: 'string', required: true },
      version: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
    allowPositionals: false,
  });

  const deck = await readDeck(resolve(values.input!));
  const drops = JSON.parse(await readFile(resolve(values.drops!), 'utf8')) as DropFile;
  const version = values.version ? Number(values.version) : undefined;
  const result = applyDrops(deck, drops, version);

  if (values['dry-run']) {
    const dropKeys = new Set(drops.cards.map(card => `${card.front}\u0000${card.back}`));
    console.log(
      `Would remove ${result.removed} of ${deck.cards.length} cards and `
      + `${result.prunedPronunciations} orphaned pronunciation entries.`,
    );
    for (const [front, back] of deck.cards) {
      if (dropKeys.has(`${front}\u0000${back}`)) console.log(`  ${front} → ${back}`);
    }
    process.exit(0);
  }

  await writeJson(resolve(values.input!), result.deck);
  console.log(
    `Removed ${result.removed} cards and ${result.prunedPronunciations} orphaned pronunciations; `
    + `${result.deck.cards.length} remain. Deck version is now ${result.deck.version}.`,
  );
}

if (process.argv[1] && import.meta.url === `file://${resolve(process.argv[1])}`) {
  await main();
}
