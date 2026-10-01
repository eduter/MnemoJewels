# Spanish and French deck data

`top-es-en.json` and `top-fr-en.json` are generated data. Normal gameplay is
entirely offline; the large source files are needed only when regenerating.

They reuse the language-agnostic pipeline in `tools/decks/` that also drives the
Russian deck, so the shipped shape and the regeneration steps are the same.

## Shipped deck shape

- `cards` — `[spanish|french, english]` pairs used for gameplay and import.
- `pronunciations` — `language:lemma` → IPA string arrays (e.g. `es:problema`,
  `fr:problème`, `en:problem`). On import this is copied onto the user's deck for
  mnemonic distance in `cardDistance()`.

No `lexicon` or precomputed similarity edges are shipped; IPA ranking is computed
at runtime from the pronunciation map.

## Short-word curation

`spanishCuration.ts` and `frenchCuration.ts` hold the hand-curated gloss list for
every lemma of four characters or fewer, the part of the Wiktionary-derived
pipeline that is weakest. Raw sense links there drag in stray letters
(`b` → `be`), abbreviations (`tv`, `pp`), proper nouns (`cuba`, `mali`),
English code-switches (`full`, `news`), vulgarities and conjugated forms
(`hace` → `ago`). Each curated entry replaces the Wiktionary glosses outright,
and an empty gloss list drops the lemma.

Coverage is enforced: generation fails if any short lemma in the deck has no
curated entry, so the tables always cover the shipped short words.

## Sources and licensing

Frequency comes from the Kelly project lists:

- Serge Sharoff et al., Kelly Project (`es.json`, `fr.json`)
- https://ssharoff.github.io/kelly/
- CC BY-NC-SA 2.0
- Machine-readable mirror: https://github.com/kotoshu/frequency-list-kelly

Lexical data and IPA come from Kaikki's Wiktextract output for English Wiktionary:

- https://kaikki.org/dictionary/Spanish/, https://kaikki.org/dictionary/French/
- https://kaikki.org/dictionary/English/
- CC BY-SA 4.0; Wiktextract itself is MIT-licensed

Attribution and license terms apply to the underlying sources; the generated
decks are not relicensed by the application's ISC code license.

## Regeneration

Node.js is the only tooling dependency. To download current source snapshots and
regenerate both decks:

```sh
npm run data:romance:download
npm run data:romance
```

To generate one deck from already downloaded files in `.cache/romance-deck/`:

```sh
node --experimental-strip-types tools/romance/generate.ts --language es
```

The pipeline (shared with the Russian deck, see `tools/decks/generate.ts`):

1. de-duplicates and validates Kelly's ranked lemma rows;
2. filters punctuation, malformed tokens, and non-standalone entries;
3. joins the most frequent lemmas to the front-language Wiktionary entries;
4. keeps English backs only when Kaikki metadata supports them, then applies the
   curated short-word table;
5. emits `cards` and card-scoped `pronunciations` (front-language and English IPA);
6. validates duplicate cards, curation coverage, and the
   `problema`/`problem` (Spanish) or `problème`/`problem` (French) example.

`top-es-en-validation-report.json` and `top-fr-en-validation-report.json` record
coverage and anomalies. Serious structural errors make generation fail.

## Runtime behavior

`src/phonetics.ts` carries articulatory features for the Spanish and French IPA
symbols the decks use — lenition allophones (`β`, `ð`, `ɣ`), the tap/trill pair,
the uvular French rhotic, front rounded vowels, the `ɥ` glide, and nasalized
vowels — so mnemonic distance reflects real confusability rather than raw
character edits. `src/alternativeSelection.ts` folds Spanish and French
diacritics before orthographic comparison.

## Known limitations

- Wiktionary coverage and sense-link quality vary by lemma. Some longer lemmas
  carry topic-label backs (`point` → `sports`, `match` → `games`) or rare senses
  that the short-word curation does not reach; the same trait exists in the
  Russian deck.
- English IPA may include multiple dialects without selecting a learner's
  preferred dialect.
- Updating source snapshots can change coverage and therefore must be reviewed
  together with the validation reports.
