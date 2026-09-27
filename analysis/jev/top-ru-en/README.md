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
| `review.json`, `review.md` | `tools/jev/analyze.ts` output: cards needing a closer look (98 lemmas would be emptied entirely). |
| `calibration.json` | `tools/jev/cli.ts --calibrate` run over `tools/jev/calibration-sample.json`. |
| `short4-triage-report.json`, `short4-drop.json` | The `--only-short 4` pass (387 lemmas), predates the per-candidate report field. |

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
