# Handoff — Adaptive spawn pacing (MnemoJewels) + deploy preview

**For the new agent session: read this whole document into your context before doing
anything else.** It is the complete state of an in-progress experiment. Your job is to
(1) pick up the pacing work where it left off, and (2) deploy a durable preview of the
branch using the `deploy-static-preview` skill, which requires the secret
`CLOUDFLARE_API_TOKEN` that the previous session did not have.

**This document and the implementation were published to GitHub (`eduter/MnemoJewels`) so
a fresh sandbox can see them.** Both live on branch `adaptive-pacing`: the implementation
in `src/pacing.ts` / `src/constants.ts` and this handoff at
`HANDOFF-adaptive-pacing.md`. If you are starting from a fresh clone, clone the repo, read
this file, then (or first) `git checkout adaptive-pacing`. `master` is kept clean and
unprotected-by-design; do not commit to it.

---

## 0. TL;DR / what to do first

1. Read this document fully.
2. Clone `https://github.com/eduter/MnemoJewels` (or use the existing checkout), then
   `cd MnemoJewels && git checkout adaptive-pacing`. That branch holds **both** the
   implementation and this handoff file; see §5 for exact tips.
3. `npm ci && npm run check && npm run build` to confirm green.
4. Deploy the preview with the skill (see §7). The repo's working tree must be on the
   `adaptive-pacing` branch so the script picks that branch name.
5. Report the `*.pages.dev` link to the user and note the isolated-origin caveat.
6. Optionally tune `TARGET_ROWS_LAST_LEVEL` first (§6 open questions) before deploying.

Do **not** push the branch or open a PR unless the user asks.

---

## 1. The user's original complaint

The user remembered a mechanic: "if the player is very slow, the game reduces the speed to
be friendlier to beginners." They tested by **letting the game sit idle without interacting**
and saw no speed reduction. They wanted slow players to still have a chance — "the goal is
for people to learn, not for the game to be hard" — while keeping difficulty rising with
level. They explicitly asked to **think it through, not implement yet**, but after
discussion approved a concrete direction (§3) and the implementation now exists on the
branch.

## 2. What we found (git history + current code)

- There **was** a literal deadbeat-style controller in 2014: commit `d46f58d`
  (`updateGameSpeed`, pivot = 4 rows, asymmetric factors 0.03 up / 0.01 down).
  Related: `7d95e53` (2014 thinking-time formula), `3c03c21` ("increased speed when
  clearing screen").
- The current adaptive pacing was introduced by `8867095` ("make spawn pacing forgiving").
- So the logic was not fully "lost", but it had drifted into a **thinking-time heuristic**
  with only a weak idle response:
  - `getAverageThinkingTime` was seeded from thinking times and updated **only on
    match/mismatch**; sitting idle recorded nothing.
  - Idle time only fed a `pressure` term: as the board filled 3→10 rows the interval went
    ~7000ms → ~9450ms, capped at 10000. Small and easy to miss. **This is why the user saw
    "no speed change".**
- Dead constant in `src/constants.ts`: `INTERVAL_REDUCTION_FACTOR = 0.9`, unused.
- `src/board.ts` calls `game.getIntervalBetweenGroups(getNumCards())` at the spawn-bar
  boundary, i.e. **after** the group has landed but **before** the next interval is
  scheduled. That is what makes the post-spawn occupancy measurement correct.

## 3. The agreed design (target-occupancy / deadbeat controller)

User's own description of the feedback law, which we implemented literally:

> When a group spawns, compute post-spawn screen occupancy (rows). If the result, counting
> that group, is target `T` rows, the interval was perfect; below `T`, speed up; above `T`,
> slow down. The board should **oscillate around `T`**, not just be capped at it.

Clarifications the user gave:

- `T` scales **linearly from 4 at level 1 to 8 at level 10** ("knife to your neck" at L10).
- Do **not** make the existing quadratic difficulty curve steeper — they think it is
  already steep.
- Average speed updates on match/mismatch, but the spawn interval only recomputes at the
  spawn-bar boundary.
- Lower the floor so early game isn't boring for experts; update `v` (the average) more
  slowly to tolerate variance; account for mistakes made under stress (a panicked slow
  decision after a mismatch should buy mercy).
- Deploy a preview when something is worth trying.

### Implemented formula

```
secondsPerPair = getAverageThinkingTime(state)          // ms per pair
target         = T(level) = 4 + (level-1)*(8-4)/9        // rows, linearly 4→8
interval       = (rowsAfterSpawn + DEFAULT_GROUP_SIZE - target) * secondsPerPair
interval       = clamp(MIN_INTERVAL, interval, levelMax(level))
```

- `rowsAfterSpawn` is measured just after the spawn (includes the group that just landed).
- If the board is fuller than `target`, the interval lengthens; if roomier, it shortens.
- Equilibrium places post-spawn occupancy at `T` (the next group brings you back to `T`),
  so occupancy oscillates **around** `T`.
- If no match has been observed yet, `getSpawnDelay` returns `INITIAL_INTERVAL` (friendly
  start), not the floor.

**Important correction made during the session:** the first implementation targeted
*pre-spawn* occupancy, which operated at `T + GROUP` rows and demanded 11 rows at L10
(impossible on a 10-row board) — experts died at level 8. Targeting *post-spawn*
occupancy (the formula above) is the correct interpretation of the user's wording and is
what the branch ships.

### Constants changed (`src/constants.ts`)

| constant | old | new | why |
|---|---|---|---|
| `MIN_INTERVAL` | 4500 | **3000** | floor low enough that fast players aren't pinned while the board still has room; also lets the full board drain |
| `MAX_INTERVAL` | 10000 | **18000** | level-1 backstop / max mercy interval for a player losing ground |
| `EXPERT_MAX_INTERVAL` | 5500 | **7500** | level-10 backstop; shrinking `MAX_INTERVAL` toward this is what makes late levels hard |

`getLevelMaximum` uses the existing quadratic `getDifficulty(level) = ((level-1)/(LAST-1))^2`
to interpolate `MAX_INTERVAL → EXPERT_MAX_INTERVAL`, so the tightening only bites at the top.

### Pacing state / smoothing (`src/pacing.ts`)

- `PacingState.averageThinkingTimes: [number, number, number, number]` (per remaining-pair
  bucket, index 0 = last pair). No more `graceFactor`.
- `MATCH_ADAPTATION_RATE = 0.15`, `MISMATCH_ADAPTATION_RATE = 0.25` (was 0.3/0.12 match,
  plus a 12% inflate + `graceFactor` on mismatch). Slower, so one unusual decision cannot
  whipsaw the pace; a mismatch pulls the estimate toward the observed (panicked, slow)
  decision, buying room.
- First observation in a bucket is **adopted** rather than eased from an arbitrary seed.
- `getAverageThinkingTime` averages only buckets that have been observed; returns
  `INITIAL_INTERVAL/3` (~2333ms) if none.
- New exports: `getTargetRows(level)`, `getLevelMaximum(level)`; `getDifficulty` kept.
- `DEFAULT_GROUP_SIZE = 3`, `NUM_ROWS = 10` (unchanged).

## 4. Validation done (and the tooling caveat)

- `npm run check` = `tsc --noEmit` + `vitest run`: **167 tests pass** (rewrote
  `tests/pacing.spec.ts` for the new contract).
- `npm run build` succeeds (Vite + PWA).
- We drove the **real module** through seeded games. Sim harness pattern that works:
  a **temporary Vitest spec** (`tests/pacingSim.spec.ts`) importing from `../src/pacing`,
  which `writeFileSync`s results to `/tmp/pacing_sim_out.txt` (Vitest swallows
  `console.log`, so writing to a file is the reliable way to read results). Delete the
  temp spec afterwards.
  - A standalone `.mjs` run with `node --experimental-strip-types` **fails** because the
    project uses extensionless imports (`from './constants'`) which Node's ESM resolver
    rejects. Use Vitest, or add extensions.
- Archetype results (40 seeds, 19-min window, mismatch rate as noted, `T_LAST = 8`):

  | player | think | dies | survives to |
  |---|---|---|---|
  | expert | 1.1s | 0% | L10 |
  | fast | 1.7s | 0% | L10 |
  | typical | 2.6s | **73%** | L10 |
  | slow | 4.0s | 0% | ~L8 |
  | struggling | 6.0s | **88%** | ~L6 |

- Sensitivity to `TARGET_ROWS_LAST_LEVEL` (post-spawn formula):

  | `T_LAST` | typical dies | slow survives to |
  |---|---|---|
  | 8 (shipped) | 73% | ~L8 |
  | 7 | 50% | ~L8 |
  | 6.5 | 35% | ~L8 |
  | 6 | 23% | ~L8 |

- **Dominant killer is the mismatch rate, not pacing.** With ~48% mismatch probability
  (random spread of a large deck vs. stored cards) a typical player mismatches a lot and a
  full board kills them; near-struggling players die from the level cap shrinking. Keep
  this in mind when interpreting "typical dies 73%" — it may be realistic difficulty, or
  the top-level target may be too tight. The lever is `TARGET_ROWS_LAST_LEVEL`, **not** a
  steeper quadratic (user explicitly said don't steepen it).

## 5. Exact git state

- Repo: `https://github.com/eduter/MnemoJewels` (`eduter/MnemoJewels`).
- Branch: **`adaptive-pacing`**, HEAD = `e6cf47e` ("Make spawn pacing a target-occupancy
  (deadbeat) controller"). This branch is **pushed to origin** so a fresh sandbox can
  fetch it.
- Branch base: `ef09875` = `origin/master` (merge of PR #40, tap-drift fix; on top of the
  Portuguese decks PR #39). Clean pre-experiment tip: `ef09875`.
- Files changed on the branch: `src/pacing.ts`, `src/constants.ts`, `tests/pacing.spec.ts`
  (commit `e6cf47e`), plus this handoff file added on top. Working tree clean.
- `node_modules/` is not committed; run `npm ci`. `.nvmrc` pins Node v24.14.1
  (v24.21.0 present works).

Verify before starting:

```bash
cd MnemoJewels
git fetch origin
git --no-pager log --oneline -4            # e6cf47e (pacing) + the handoff commit, on top of ef09875
git status --short
```

### 5a. Note on branch layout

Both the implementation and this handoff live on **`adaptive-pacing`**. `master` is kept
clean (its tip is `ef09875`, the tap-drift merge) and is expected to gain branch protection
that forbids direct pushes, so all experimental work belongs on the branch. If you later
open a PR, base it on `master`; the handoff file will be part of the branch diff and can be
removed from the PR if it is not wanted there.

## 6. Open questions / tuning knobs (for the user's call before or after preview)

- `TARGET_ROWS_LAST_LEVEL` (currently 8): lower it if typical players dying at 73% feels
  too harsh. 7 → 50%, 6.5 → 35%, 6 → 23%.
- `TARGET_ROWS_FIRST_LEVEL` (currently 4): raising it makes early game busier for experts.
- `MIN_INTERVAL` (3000): lower for a faster early game, higher for a calmer one.
- `MAX_INTERVAL` (18000) / `EXPERT_MAX_INTERVAL` (7500): the mercy backstop and its L10
  value.
- Adaptation rates 0.15 / 0.25: how quickly the pace follows the player.
- Consider whether the game should treat a *sustained idle* player specially (e.g. an
  explicit "player is overwhelmed" signal when occupancy stays above target for a while),
  rather than only reacting through occupancy. Not implemented; discussed as an option.

## 7. Deploy the preview (with the skill)

The skill lives at:
`/home/openhands/.openhands/cache/plugins/my-skills-85a48ef70cfc02ed/skills/deploy-static-preview/SKILL.md`
(scripts at `.../scripts/deploy-preview.sh`). Read the SKILL.md for the full rationale.

Requirements / caveats:

- Needs secret **`CLOUDFLARE_API_TOKEN`** (account-scoped, **Pages: Edit**). If absent, stop
  and ask the user to register it; do not invent one or fall back to production hosting.
- Cloudflare Pages **direct upload** via `npx wrangler@latest`; project derived as
  `<repo>-preview` → **`mnemojewels-preview`**; branch alias
  `adaptive-pacing.mnemojewels-preview.pages.dev`.
- Run it **from the repo root**, on the `adaptive-pacing` branch, with the **root build
  base** (`PREVIEW_BASE=/`, the script's default). Do not change `vite.config.ts`; the
  override is on the build command line only. A non-root base serves assets as HTML through
  the SPA fallback and the page loads blank (the script smoke-checks this).
- The preview is on a `*.pages.dev` origin, **isolated from production** (`*.github.io`),
  so it will not touch the user's real localStorage/IndexedDB. Mention that in the
  hand-off; suggest incognito for belt-and-braces.
- Command (adjust the repo path to wherever you cloned it):

  ```bash
  cd /path/to/MnemoJewels
  git checkout adaptive-pacing
  bash /home/openhands/.openhands/cache/plugins/my-skills-85a48ef70cfc02ed/skills/deploy-static-preview/scripts/deploy-preview.sh adaptive-pacing
  ```

- Then report the `Preview:` and `Stable branch alias:` URLs. If a PR exists, post the link
  as a comment per the skill (there is **no PR** yet, so skip unless one is opened).
- Cleanup is optional: `--list`, then `--delete <id>`.

## 8. Design rationale worth preserving (why it adapts but still gets hard)

- **The `T` ramp is the difficulty governor.** Occupancy oscillates around `T`, and `T`
  rises 4→8, so the board is busier at higher levels *by construction*, independent of the
  player's pace. No need to steepen the quadratic.
- **The backstop cap is the "knife."** Lowering `EXPERT_MAX_INTERVAL` toward 7500 at L10
  means a player who cannot keep up is no longer given enough time to recover; their board
  creeps up and they eventually overflow. That is the intended failure mode and it only
  reaches "knife" strength at the top levels (quadratic).
- **Mercy is emergent, not a special case.** A slow player's `secondsPerPair` is large, so
  the projected interval is large; a panicked decision after a mismatch pulls the estimate
  up further. The controller hands them room automatically while occupancy is above target.
- **Consistency/statelessness:** pace depends only on current occupancy and the measured
  per-pair speed, so it is smooth and explainable, and a fresh run resets cleanly
  (`createPacingState` is called per `startGame` in `src/game.ts`).

## 9. Files touched / useful references

- `src/pacing.ts` — the controller (main change).
- `src/constants.ts` — `MIN_INTERVAL`, `MAX_INTERVAL`, `EXPERT_MAX_INTERVAL`,
  `LAST_LEVEL`, `INITIAL_INTERVAL`, `DEFAULT_GROUP_SIZE`, `NUM_ROWS`.
- `src/game.ts` — calls `recordMatch`/`recordMismatch`, `getSpawnDelay`; resets pacing per
  game; `POINTS_PER_LEVEL = 1000`.
- `src/board.ts` — `getIntervalBetweenGroups()` → `game.getIntervalBetweenGroups(getNumCards())`
  at the spawn-bar boundary (why post-spawn occupancy is measurable).
- `src/utils.ts` — `DynamicIntervalSchedule` / `setDynamicInterval` scheduler.
- `src/cards.ts` — `chooseAlternatives` / `cardDistance` hot path (see `AGENTS.md`); not
  touched here, but relevant if pacing changes the number of live cards.
- `tests/pacing.spec.ts` — rewritten unit tests for the new contract.
- `AGENTS.md` — repo conventions (run `npm run check` before claiming a change works).

---

*Generated by an AI agent (OpenHands) on behalf of the user as a handoff artifact. Both
the implementation (commit `e6cf47e`) and this document live on branch `adaptive-pacing`,
pushed to `https://github.com/eduter/MnemoJewels`.*
