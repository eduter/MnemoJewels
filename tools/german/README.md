# German deck data

`top-de-en.json` is generated data. Normal gameplay is entirely offline; the
large source files are needed only when regenerating.

It reuses the language-agnostic pipeline in `tools/decks/` that also drives the
Russian, Spanish, French and Portuguese decks, so the shipped shape and the
regeneration steps are the same. Only the German-to-English direction ships.

## Shipped deck shape

- `cards` — `[german, english]` pairs used for gameplay and import.
- `pronunciations` — `language:lemma` → IPA string arrays (e.g. `de:problem`,
  `en:problem`). On import this is copied onto the user's deck for mnemonic
  distance in `cardDistance()`.

No `lexicon` or precomputed similarity edges are shipped; IPA ranking is computed
at runtime from the pronunciation map.

## German capitalization

The frequency list is lowercase throughout (`haus`, `problem`, `frau`), while
German Wiktionary capitalizes nouns (`Haus`, `Problem`, `Frau`). The generator
matches front entries case-insensitively, so `haus` and `Haus` land on one card,
and then restores each lemma's canonical Wiktionary spelling for the card front
(`capitalizeFrontLemmas`), so nouns read `Haus`, not `haus`. The two flags are
applied together: `matchFrontCaseInsensitively` finds the entry, the second flag
decides the spelling to show.

A lemma stays lowercase when the lowercase spelling is itself a current, real
word, because capitalizing then would merge two distinct words — `arm` "poor"
(the adjective) versus `Arm` "arm" (the noun). Inflected-only lowercase entries
(imperatives such as `haus` "haus[e]!", preterites such as `stand`) and
obsolete/rare variants do not block capitalization, so the rule recovers `Haus`,
`Frau` and `Abend` while keeping `arm`, `sie` and `mal` lowercase. The trade-off
is deliberate: when the lowercase spelling is a live word the lemma keeps that
spelling rather than risk a merge, which is why a few nouns (`Zeit`, `Kraft`)
still appear lowercase because Wiktionary also records a distinct lowercase
preposition for them.

## Short-word curation

`germanCuration.ts` holds the hand-curated gloss list for every lemma of four
characters or fewer — 563 lemmas in the shipped deck, covering both the
`missingCurated` report and the lemmas the raw links handled badly. Raw sense
links there drag in grammatical labels and stray senses (`das` → "who", `sie` →
"pedantic", `h` → "hour", `wo` → "whom"), proper nouns and given names
(`wien`, `jörg`), abbreviations (`dvd`, `cd`, `npd`) and internet slang (`web`,
`live`). Each curated entry replaces the Wiktionary glosses outright, and an
empty gloss list drops the lemma.

Coverage is enforced by the generator's `missingCurated` report: after curation
it is empty, so the tables cover every short lemma in the deck.

## Sources and licensing

Frequency comes from the wordfreq top-100k list (the same source the Spanish,
French and Portuguese decks use):

- wordfreq (`de.json`), MIT; underlying corpora CC BY-SA
- https://github.com/rspeer/wordfreq
- Machine-readable mirror: https://github.com/kotoshu/frequency-list-kelly

Lexical data and IPA come from Kaikki's Wiktextract output for English Wiktionary:

- https://kaikki.org/dictionary/German/
- https://kaikki.org/dictionary/English/
- CC BY-SA 4.0; Wiktextract itself is MIT-licensed

Attribution and license terms apply to the underlying sources; the generated
deck is not relicensed by the application's ISC code license.

## Regeneration

Node.js is the only tooling dependency. To download current source snapshots and
regenerate the deck:

```sh
npm run data:german:download
npm run data:german
```

The download is about 4.4 GB (German 1.0 GB, English 3.3 GB) into
`.cache/german-deck/`. To use already downloaded files:

```sh
node --experimental-strip-types tools/german/generate.ts \
  --kelly /path/to/kelly-de.json \
  --german /path/to/kaikki-german.jsonl \
  --english /path/to/kaikki-english.jsonl
```

The pipeline (shared with the other decks, see `tools/decks/generate.ts`):

1. de-duplicates and validates the ranked frequency rows;
2. filters punctuation, malformed tokens, and non-standalone entries;
3. joins the most frequent 3,000 usable lemmas to the German Wiktionary entries
   (case-insensitively), collecting IPA and the English sense-link targets;
4. keeps English backs only when Kaikki metadata supports them, then applies the
   curated short-word table;
5. emits `cards` and card-scoped `pronunciations` (German and English IPA);
6. validates duplicate cards, curation coverage, and the `problem`/`problem`
   example.

`top-de-en-validation-report.json` records coverage and anomalies. Serious
structural errors make generation fail. Missing IPA is retained as missing and
reported.

## Runtime behavior

`src/phonetics.ts` already carries articulatory features for every IPA symbol the
German deck uses (the uvular `ʁ`/`ʀ`, the vocalic `ɐ`, front rounded `ø`/`œ`/`ʏ`,
`ç`, `ŋ`, …), so mnemonic distance reflects real confusability rather than raw
character edits. `src/alternativeSelection.ts` folds German umlauts and `ß`
before orthographic comparison.

## Jev triage

German has been run through the Jev triage harness with the same guarded policy
as the Portuguese decks:

```sh
TYPESAFE_API_KEY=... npm run data:jev -- \
  --input public/decks/top-de-en.json \
  --out .cache/jev/top-de-en

npm run data:jev:policy -- \
  --report .cache/jev/top-de-en/triage-report.json \
  --out .cache/jev/top-de-en/drop.json \
  --misleading-threshold 0.8 --protect-best --min-lemma-length 5

npm run data:jev:apply -- \
  --input public/decks/top-de-en.json \
  --drops .cache/jev/top-de-en/drop.json --version 2
```

The bare 0.5 default over-drops: it would empty 376 lemmas and remove 211 senses
the short-word curation keeps (`der -> who`, `er -> it`, `a -> an`). `0.8` sits on
the noise knee (the long-lemma histogram is flat to 0.80, then rises sharply),
`--protect-best` keeps every lemma's own top-ranked candidate, and
`--min-lemma-length 5` leaves the ≤4-character lemmas to `germanCuration.ts`. At
0.8 all 3,000 lemmas survive and all 756 curated senses are preserved:
9,947 → 7,367 cards.

## Known limitations

- Wiktionary coverage and sense-link quality vary by lemma; some longer lemmas
  still carry a rare or archaic sense that the short-word curation does not
  reach.
- English IPA may include multiple dialects without selecting a learner's
  preferred dialect.
- Some short lemmas whose sense links were unusable were dropped rather than
  curated with an invented gloss.
- Updating source snapshots can change coverage and therefore must be reviewed
  together with the validation report.
