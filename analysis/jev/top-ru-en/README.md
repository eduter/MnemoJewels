# Jev triage results — `top-ru-en`

Raw output of the Jev deck-triage harness, kept in the repo so the deck
decisions can be audited without re-running the API. Generated 2026-09-27.

- Provider: hosted Jev proxy at `https://jevtypesafeai.com/api/v1/decide`
  (the `jv_live_…` key from `jevtypesafeai.com`; the official
  `api.typesafe.ai` endpoint rejects it).
- Model: `jev-latest` (resolved to `jev-1.13.0`).
- Cost: ~5.0M input tokens, well under the prepaid balance.

## Files

| File | What it is |
| --- | --- |
| `triage-report.json` | Whole deck, 3000 lemmas / 11084 cards, with per-candidate `misleading` and `usefulness`. |
| `drop.json` | Default policy output (drop when `misleading >= 0.5`). 5382 cards. |
| `review.json`, `review.md` | `tools/jev/analyze.ts` output: 2796 cards across 1431 lemmas need a closer look. |
| `calibration.json` | `tools/jev/cli.ts --calibrate` run over `tools/jev/calibration-sample.json`. |
| `short-words-vs-curation.json` | `tools/jev/compare.ts` scoring of the 387 curated short lemmas against Jev. |
| `drop-long-lemmas-0.6.json`, `drop-long-lemmas-0.65.json` | Recommended drops: tuned threshold, long lemmas only, never-empty guard on. |
| `short4-triage-report.json`, `short4-drop.json` | The `--only-short 4` pass (387 lemmas). Predates the per-candidate report field, so `compare` cannot read it; the full report covers the same lemmas. |

## What the numbers say

Calibration against the hand-labeled sample:

| misleading threshold | accuracy | drop recall | keep recall |
| --- | --- | --- | --- |
| 0.5 (default) | 0.78 | 0.85 | 0.68 |
| 0.55 | 0.79 | 0.80 | 0.79 |
| 0.60 | 0.81 | 0.78 | 0.86 |
| 0.65 | 0.82 | 0.75 | 0.91 |

The default 0.5 is aggressive: it drops far more than a human would (keep recall
0.68). It also marks Jev's own `best` pick as misleading for 98 lemmas, emptying
them entirely — including clear misses such as `май → may` (0.60),
`китаец → chinese` (0.51) and `молчать → silent` (0.63). `best` and
`misleading_*` are asked independently, so this is a genuine disagreement, not a
derived one.

`tools/jev/policy.ts` re-decides keep/drop from this report at a chosen
threshold and protects a lemma's `best` pick from being dropped as the only
candidate, so a threshold change never has to be re-billed:

```sh
npm run data:jev:policy -- \
  --report analysis/jev/top-ru-en/triage-report.json \
  --out    .cache/jev/full/drop-tuned.json \
  --misleading-threshold 0.65
```

## Scoring against the short-word curation (PR #28)

PR #28 hand-curated the 387 lemmas of four characters or fewer. Treating that map
as ground truth, `tools/jev/compare.ts` scores Jev on the 1626 cards those lemmas
have:

```sh
npm run data:jev:compare -- \
  --report   analysis/jev/top-ru-en/triage-report.json \
  --curation analysis/jev/top-ru-en/shortWordCuration.pr28.ts \
  --out      analysis/jev/top-ru-en/short-words-vs-curation.json
```

`shortWordCuration.pr28.ts` is a snapshot of the PR #28 branch
(`cursor/russian-short-word-curation`); once that merges, point `--curation` at
`tools/russian/shortWordCuration.ts` instead. `compare` takes any module
exporting `SHORT_WORD_GLOSSES`, so the same check works for other decks.

Result: 1352 cards agree, Jev drops 46 curated senses and keeps 228 uncurated
ones (recall 0.91, precision 0.67 against the curated list).

The 46 false drops are the damaging class, because each deletes a sense a
beginner needs: `на → to`, `мой → mine`, `в → to`, `за → after`, `он → it`,
`май → may`, `цвет → flower`. The 228 false keeps are mostly legitimate
synonyms the curator trimmed for brevity (`папа → daddy`, `мама → mum`), so the
0.67 precision understates how often Jev is right.

## Recommendation

Short lemmas are PR #28's job; the curation should win there and Jev should not
touch them. For the 9458 long-lemma cards, run the classifier at 0.6 rather than
0.5 and keep the never-empty guard:

| | cards dropped | lemmas saved from being emptied |
| --- | --- | --- |
| default 0.5, all lemmas | 5382 | 98 |
| 0.6, long lemmas, guard | 3747 | 50 |
| 0.65, long lemmas, guard | 3468 | 34 |

0.6 is the balance: it removes obvious noise while keeping more of the marginal
synonyms a learner benefits from. The 0.65 variant is there if the goal is to
keep the deck larger. In all cases the `best` pick is protected, so no lemma can
be deleted outright.
