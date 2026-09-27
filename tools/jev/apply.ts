// Applies a drop.json produced by the Jev triage to a deck, removing the
// flagged `[front, back]` pairs and bumping the version so clients refresh.
//
//   node --experimental-strip-types tools/jev/apply.ts \
//     --input public/decks/top-ru-en.json \
//     --drops .cache/jev/top-ru-en/drop.json \
//     --version 5
//
// Run with --dry-run first to see what would change.

import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { readDeck, writeJson } from './triage.ts';
import { readFile } from 'node:fs/promises';
import type { DropFile } from './types.ts';

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
const dropKeys = new Set(drops.cards.map(card => `${card.front}\u0000${card.back}`));

const kept = deck.cards.filter(([front, back]) => !dropKeys.has(`${front}\u0000${back}`));
const removed = deck.cards.length - kept.length;

// Pronunciations are keyed by lemma, not by pair, so dropping cards can leave
// entries no surviving card references. Read them out or decks fail validation.
const frontLang = deck.languageFront ?? 'ru';
const backLang = deck.languageBack ?? 'en';
const allowed = new Set<string>();
for (const [front, back] of kept) {
  allowed.add(`${frontLang}:${front}`);
  allowed.add(`${backLang}:${back}`);
}
const pronunciations = Object.fromEntries(
  Object.entries(deck.pronunciations ?? {}).filter(([key]) => allowed.has(key)),
);
const prunedPronunciations = Object.keys(deck.pronunciations ?? {}).length
  - Object.keys(pronunciations).length;

if (values['dry-run']) {
  console.log(
    `Would remove ${removed} of ${deck.cards.length} cards and `
    + `${prunedPronunciations} orphaned pronunciation entries.`,
  );
  for (const [front, back] of deck.cards) {
    if (dropKeys.has(`${front}\u0000${back}`)) console.log(`  ${front} → ${back}`);
  }
  process.exit(0);
}

const version = values.version
  ? Number(values.version)
  : Math.max(deck.version ?? 1, 1) + 1;
const updated = { ...deck, version, cards: kept, pronunciations };
await writeJson(resolve(values.input!), updated);
console.log(
  `Removed ${removed} cards and ${prunedPronunciations} orphaned pronunciations; `
  + `${kept.length} cards remain. Deck version is now ${version}.`,
);
