# Russian deck data

`top-ru-en.json` is generated data. Normal gameplay is entirely offline; the
large source files are needed only when regenerating the deck.

## Sources and licensing

Frequency comes from the Russian Kelly list:

- Serge Sharoff et al., Kelly Project Russian list (`ru_m3.xls`)
- https://ssharoff.github.io/kelly/
- CC BY-NC-SA 2.0
- The generator consumes the machine-readable mirror at
  https://github.com/kotoshu/frequency-list-kelly (processed 2026-02-06).

Kelly was selected instead of Sharoff's otherwise suitable 5,000-lemma list
because the latter's download page does not grant a redistribution license.
Kelly is learner-oriented, lemma-based, frequency-ranked, and has an explicit
license. Its non-commercial/share-alike terms apply to the frequency-derived
fields in the generated deck.

Lexical data comes from Kaikki's Wiktextract output for English Wiktionary:

- https://kaikki.org/dictionary/Russian/
- https://kaikki.org/dictionary/English/
- English Wiktionary dump dated 2026-09-02, extracted 2026-09-16
- CC BY-SA 4.0; Wiktextract itself is MIT-licensed

The generated deck retains only the selected lemmas, canonical stressed forms,
parts of speech, short sense glosses/links, IPA strings, and a concise
etymology flag. Wiktionary attribution history remains available through the
source pages. The generated lexical data remains subject to the source
licenses above; it is not relicensed by the application's ISC code license.

## Regeneration

Node.js is the only tooling dependency. To download current source snapshots
and regenerate:

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
4. preserves normalized Russian and English lexical items plus sense-bearing
   n:n translation edges;
5. joins Russian and English IPA from Wiktionary;
6. computes a conservative similarity signal from transliterated orthography
   and normalized IPA (never semantic equivalence);
7. validates references, duplicate cards, coverage, and the
   `проблема`/`problem` example.

`validation-report.json` records coverage and anomalies. Serious structural
errors make generation fail. Missing IPA is retained as missing and reported.

## Runtime behavior

Legacy `[front, back]` cards remain the gameplay representation, preserving
learning history and existing decks. The normalized `lexicon` records the n:n
graph and sense metadata. On import, only a compact pronunciation index is
persisted with the user's deck, avoiding local-storage quota problems.
Candidate cards still pass the original ambiguity checks before ranking. IPA
distance only augments the existing orthographic distance for candidates that
are already valid.

Similarity annotations describe computed resemblance. They do not assert
historical cognacy and never add translation edges. The compact etymology flag
is source-derived and stored separately.

## Known limitations

- Wiktionary coverage and sense-link quality vary by lemma.
- English IPA may include multiple dialects without selecting a learner's
  preferred dialect.
- Kelly contains homographs with multiple POS rows; the generated vocabulary
  consolidates those rows into one lemma while preserving Wiktionary POS and
  sense relationships.
- Computed similarity is a ranking feature, not an etymological claim.
- Updating source snapshots can change coverage and therefore must be reviewed
  together with the validation report.
