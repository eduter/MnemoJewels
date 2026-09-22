# Russian deck data

`top-ru-en.json` is generated data. Normal gameplay is entirely offline; the
large source files are needed only when regenerating the deck.

## Shipped deck shape

The committed file matches other decks (metadata + `cards`) plus one extra
field the app actually reads:

- `cards` — `[russian, english]` pairs used for gameplay and import.
- `pronunciations` — `language:lemma` → IPA string arrays (e.g. `ru:проблема`,
  `en:problem`). On import this is copied onto the user's deck for mnemonic
  distance in `cardDistance()`.

No `lexicon`, sense graph, or precomputed similarity edges are shipped; IPA
ranking is computed at runtime from the pronunciation map.

## Sources and licensing

Frequency comes from the Russian Kelly list:

- Serge Sharoff et al., Kelly Project Russian list (`ru_m3.xls`)
- https://ssharoff.github.io/kelly/
- CC BY-NC-SA 2.0
- The generator consumes the machine-readable mirror at
  https://github.com/kotoshu/frequency-list-kelly (processed 2026-02-06).

Lexical data and IPA come from Kaikki's Wiktextract output for English Wiktionary:

- https://kaikki.org/dictionary/Russian/
- https://kaikki.org/dictionary/English/
- English Wiktionary dump dated 2026-09-02, extracted 2026-09-16
- CC BY-SA 4.0; Wiktextract itself is MIT-licensed

Attribution and license terms apply to the underlying sources; the generated
deck is not relicensed by the application's ISC code license.

## Regeneration

Node.js is the only tooling dependency. The committed deck is pretty-printed
like the other `public/decks/*.json` files. To compact a legacy lexicon-based
`top-ru-en.json` (filter bad glosses, strip unused fields) without
re-downloading sources:

```sh
npm run data:russian:sanitize
```

To download current source snapshots and regenerate:

```sh
npm run data:russian:download
```

The uncompressed Kaikki inputs currently require about 4.2 GB in
`.cache/russian-deck/`. To use already downloaded files:

```sh
npm run data:russian -- \
  --kelly /path/to/kelly-ru.json \
  --russian /path/to/kaikki-russian.jsonl \
  --english /path/to/kaikki-english.jsonl
```

The pipeline:

1. de-duplicates and validates Kelly's ranked lemma rows;
2. filters punctuation, malformed tokens, and non-standalone entries;
3. joins the first 3,000 usable lemmas to Russian Wiktionary entries;
4. keeps English backs only when Kaikki metadata supports them (English
   Wiktionary headword, non-`w:` link targets, gloss fallback only when the
   gloss is itself a headword), then applies a small heuristic pass for
   leftover usage-note glosses;
5. emits `cards` and card-scoped `pronunciations` (Russian and English IPA);
6. validates duplicate cards, coverage, and the `проблема`/`problem` example.

Sources live under `tools/russian/*.ts` (TypeScript run via
`node --experimental-strip-types`, see `package.json`).

`validation-report.json` records coverage and anomalies. Serious structural
errors make generation fail. Missing IPA is retained as missing and reported.

## Runtime behavior

Legacy `[front, back]` cards remain the gameplay representation, preserving
learning history and existing decks. IPA distance augments the existing
orthographic Levenshtein distance when pronunciations exist for the lemmas on
the candidate cards.

## Known limitations

- Wiktionary coverage and sense-link quality vary by lemma.
- English IPA may include multiple dialects without selecting a learner's
  preferred dialect.
- Kelly contains homographs with multiple POS rows; the generator consolidates
  those rows into one lemma while merging Wiktionary translation links.
- Updating source snapshots can change coverage and therefore must be reviewed
  together with the validation report.
