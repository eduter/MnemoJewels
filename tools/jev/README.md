# Jev deck triage

Optional harness that asks [Jev](https://docs.typesafe.ai) — TypeSafe AI's
non-generative System One classifier — to score how useful each `[front, back]`
translation pair is for a beginner, so the whole deck can be filtered instead of
only the short words.

Jev is not an LLM: you send application state plus a map of typed questions and
get back bounded answers with probabilities. It cannot hallucinate a label
outside the options you define, which is what makes it safe to run over
thousands of pairs.

## What it asks

Grouping by front word (one Jev request per lemma, not per pair), each request
carries the learner context once plus:

- **`best`** (Choice) — the single most useful primary translation, judged
  against all candidates together.
- **`worst`** (Choice) — the single most harmful candidate.
- **`usefulness`** (Score) — how well the candidate set serves a beginner.
- **`misleading_<n>`** (Noul) — one per candidate: would this pair create a
  false association?

`best`/`worst` are skipped for lemmas with a single candidate. The keep/drop
decision uses the per-candidate Noul: `misleading >= 0.5` drops the card, and
the Score is used to flag low-value lemmas for review. Thresholds live in
`DEFAULT_BAND_THRESHOLDS` and can be overridden on the CLI.

Jev evaluates the questions in a request independently and in parallel, so the
`best`/`worst` choices give a genuine set-level judgment while `misleading_<n>`
gives per-candidate screening.

## Usage

Without a key you can still inspect the exact request that will be sent:

```sh
npm run data:jev -- --print-request и
```

Calibrate the thresholds against a hand-labeled sample before trusting a full
pass. `calibration-sample.json` is a starting set (labels from the pre-curation
deck):

```sh
TYPESAFE_API_KEY=... npm run data:jev:calibrate
# writes .cache/jev/run/calibration.json and prints accuracy / recall
```

Then run the deck (start with short words to keep the spend tiny):

```sh
TYPESAFE_API_KEY=... npm run data:jev -- \
  --input public/decks/top-ru-en.json \
  --out .cache/jev/top-ru-en \
  --only-short 4 \
  --verbose
```

Outputs:

- `<out>/triage-report.json` — per-lemma best/worst picks and keep/drop lists.
- `<out>/drop.json` — cards to drop with the reason and confidence.

`--start` / `--limit` make partial, re-startable runs; `--delay` paces requests.

## Configuration

There are two Jev providers with the same request/response contract but
different keys and URLs. A key minted at `console.typesafe.ai` works only at the
official endpoint; a `jv_live_…` key minted at `jevtypesafeai.com` works only at
the hosted proxy. Point `TYPESAFE_API_BASE` at the one that matches your key.

| Variable | Default | Purpose |
| --- | --- | --- |
| `TYPESAFE_API_KEY` | — | Bearer key; required for live runs. |
| `TYPESAFE_API_BASE` | `https://api.typesafe.ai/v1/systemone` | Endpoint. Use `https://jevtypesafeai.com/api/v1/decide` for a hosted `jv_live_` key. |
| `TYPESAFE_MODEL` | `jev-latest` | Model alias. |

A 401 with a key you did not revoke almost always means the key and the endpoint
belong to different providers; the usage history on the issuing dashboard will
show no calls because the request never reached it.

## Reviewing the results

The triage policy is a single threshold, so the interesting calls are the ones
near the line. `analyze` reads a triage report and splits the settled cards from
the ones worth a human look:

```sh
npm run data:jev:analyze -- \
  --report .cache/jev/full/triage-report.json \
  --out    .cache/jev/full/review
```

It writes `review.json` (machine-readable) and `review.md` (to read), bucketing
cards by reason: kept-but-near-the-line, dropped-but-near-the-line, ambiguous
best picks, low-usefulness lemmas, and lemmas a drop would empty entirely. It is
deck-agnostic — it only reads the report.

## Scoring against a hand-curated list

If a deck has an authoritative curated gloss map, that map is ground truth and
the classifier can be scored against it before it is trusted on the uncurated
rest. `compare` takes any module exporting `SHORT_WORD_GLOSSES` (a `Map` from
lemma to the glosses a learner should associate with it) and, optionally,
`SHORT_WORD_MAX_LENGTH`:

```sh
npm run data:jev:compare -- \
  --report   analysis/jev/top-ru-en/triage-report.json \
  --curation tools/russian/shortWordCuration.ts \
  --out      analysis/jev/top-ru-en/short-words-vs-curation.json
```

It reports how many cards agree, how many curated senses Jev would drop (the
damaging class — each removes a sense a beginner needs), and how many uncurated
senses it would keep. Deck-agnostic; only reads the report and the map.

## Re-deciding without re-billing

The classifier's probabilities are stored in the report, so thresholds can be
re-applied offline. `policy` re-decides keep/drop from a stored report, protects
a lemma's `best` pick from being dropped as the only candidate, and can be
scoped to lemmas of a minimum length:

```sh
npm run data:jev:policy -- \
  --report     analysis/jev/top-ru-en/triage-report.json \
  --out        analysis/jev/top-ru-en/drop-long-lemmas-0.6.json \
  --misleading-threshold 0.6 \
  --min-lemma-length 5
```

`--min-lemma-length 5` leaves the ≤4-character lemmas to the curated list, which
should win there. Feed the output to `data:jev:apply` like any other drop file.

## Applying the drops

Once you have reviewed `drop.json`, apply it:

```sh
# preview first
npm run data:jev:apply -- \
  --input public/decks/top-ru-en.json \
  --drops .cache/jev/top-ru-en/drop.json --dry-run

# then apply and bump the deck version so clients refresh
npm run data:jev:apply -- \
  --input public/decks/top-ru-en.json \
  --drops .cache/jev/top-ru-en/drop.json --version 5
```

Then update the matching `version` in `src/available-decks.json`.

## Cost

Input is billed (~$0.04–0.42 per million tokens depending on route) and output
is free. One request per lemma for ~3,000 lemmas is well under a dollar of input
for the full Russian deck, and a short-word-only pass is a few cents.

## Relationship to the curated short-word list

The ≤4-character words already ship with a hand-curated list
(`tools/russian/shortWordCuration.ts`) that is authoritative for the shipped
deck. This harness is for the long tail: run it on 5+ character lemmas, review
`drop.json`, and feed accepted drops into the generator. It can also be pointed
at the other decks (`top-no-en`, `top-sv-en`, `top_pt_BR-en`) unchanged, since
everything here is deck-agnostic.
