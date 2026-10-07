# MnemoJewels

Vocabulary matching game. Vite + TypeScript, no framework; DOM rendering in `src/display.ts`.

## Commands

- `npm run check` — typecheck (`tsc --noEmit`) then `vitest run`. Run this before claiming a change works.
- `npm start` — dev server. `npm run build` / `npm run preview`.
- Tests live in `tests/*.spec.ts`. Data/triage tooling lives in `tools/` (see `tools/russian/README.md`,
  `tools/jev/README.md`) and runs with `node --experimental-strip-types`.

## PWA / offline

`vite-plugin-pwa` (Workbox, `registerType: 'autoUpdate'`) emits `manifest.webmanifest`, `sw.js` and
`registerSW.js` at build time from `vite.config.ts`. The precache globs `js/css/html/ico/png/svg/jpg/
woff/woff2/ttf`, so the app shell, background, jewel and fonts are available offline; `public/decks/
*.json` is deliberately *not* precached (each is >1 MB, and the imported cards already live in
localStorage under `mj.deck.<id>`). Deck JSON is cached at runtime instead, `NetworkFirst` in
`mnemojewels-decks` — so a version bump is picked up on the next update while a deck downloaded while
online can still be re-imported offline. Once a deck is selected, a mismatch-free game is fully
playable offline.

Deck updates never block startup: `storageReady` loads the stored decks and kicks `updateDecks()` off
in the background, so the app opens and plays immediately and the version check simply finds nothing
to do when offline. A background update is only applied when it is safe — an updated *non-selected*
deck is written straight away, while an updated *selected* deck is deferred (not persisted) if a run
is in progress or the app is shutting down, because the live cards are held in memory by `cards.ts`
and persisting new storage under them would desync storage from memory. The `version` lives in the
bundled `available-decks.json`, so the "is there a newer deck?" check costs no network and ships with
the app build rather than being fetched at runtime.

The app icon is `assets/icons/jewel-mj.svg`, regenerated and shipped in one step with
`npm run icons:generate` (dev dependency `@vite-pwa/assets-generator`, config in `pwa-assets.config.mjs`):

```
npm run icons:generate
```

That writes `favicon.ico`, `pwa-{64,192,512}.png`, `maskable-icon-512x512.png` and
`apple-touch-icon-180x180.png`. The maskable/Apple variants pad onto the app's dark navy (`#0c0f18`)
rather than the generator's default white. The icon is a blue jewel + gold **MJ** mark built from
`public/images/jewel.svg` and the Russo One logo font. `jewel.svg` is authored wide (610x140, 30px end-caps),
so the icon **nine-slices** it to a square: the caps keep the bevel/facet geometry (scaled uniformly) and only
the repeating gloss band between them stretches — the game's own `background-size: 100% 100%` stretch would
squash the caps, so that is not reproduced. The square's four corners are **clipped on the jewel's own bevel
line** (the gem chamfers (24,0)→(0,24) in its 610x140 space; the caps scale uniformly by 480/140, so the line
sits at ~82 units and the cut is placed at 86 to sit fully on the facet) — the blue edge lands on the jewel's
existing facet rather than a shallower angle that reads as a second edge. The jewel's own sparkle (an 8-point
star near its bottom-right) is scaled up about its centre rather than replaced by a second star, and floats
over the monogram. The jewel sits on the game's tile blue `#0000ff`, and the monogram reproduces the logo's
**full eight-layer `text-shadow`** (`stylesheet/logo.css`) — each layer a `drop-shadow()` filter on its own copy
of the glyphs, so the two dark-gold layers between the black rim and the gold fill survive. The M and J stay
separate paths (merging them would overpaint the gold shadow between the letters), placed at the logo's own
size/position; the J's x is `M advance + space − 79`, because the markup puts the two spans on separate lines
and the newline collapses to a space. The MJ is emitted as vector outlines, not `<text>`, so standalone SVGs
keep the font. The full rationale lives in `assets/icons/README.md`.

`src/install.ts` handles `beforeinstallprompt`/`appinstalled` and unhides the main-menu "Install app"
button (`button.install`, hidden by default) on Chromium; other browsers just don't show it.

## Performance: alternative selection (the hot path)

`cards.createNewGroup` → `chooseAlternatives` ranks deck cards by `cardDistance` against the group's
first card. `game.getScopeSize()` only grows: `startGame` seeds `ffScopeSize = saturate(30, 0.1 * deckSize, 100)`
(so 100 for any large deck) and `onMatch` adds `increment` (capped at 10) per matched card; only
`onMismatch` reduces it (10%). So a mismatch-free game climbs steadily — measured: a no-mismatch game
on the Russian deck (`top-ru-en`, 6243 cards) reaches scope ~2500 before the board overflows at level 10,
and the scan runs synchronously inside each spawn, blocking the tile-drop animation. Before the
optimizations below, `createNewGroup` cost ~97 ms p50 / ~398 ms max at that scope; after, ~6 ms p50 /
~20 ms max.

Cost is dominated by `phonetics.ipaSequenceDistance` (a graded Needleman–Wunsch over interned IPA
segments), not by the Levenshtein on normalized words. The fix is memoization entirely inside
`src/phonetics.ts`:

- `ipaSegments` caches the segmentation per string (97%+ hit rate).
- `segmentDistance` interns segments and caches the `id x id` substitution cost in a lazily-filled
  flat matrix.
- `ipaSequenceDistance` caches the distance per transcription-array pair, keyed by identity; the
  arrays are owned by the loaded deck. This is where most of the win comes from (~60-70% hit rate).
- `segmentSequenceDistance` uses interned ids and a reused flat `Float64Array`, so the DP allocates
  nothing per call.

Do **not** bother caching `cards.cardDistance` (the per-pair distance): measured over a full game the
`(firstCard, candidate)` pair essentially never repeats — a `Map` keyed by the pair had a **0% hit
rate** and no speedup over the original. The redundancy that matters is the *intermediate* stages
above, which recur constantly across different pairs. That is why the earlier per-first-card row cache
(`pairDistanceRows`) was removed as dead weight.

When touching this path, benchmark `cards.createNewGroup` at realistic scopes (a few hundred to a few
thousand) rather than microbenchmarking `cardDistance` in isolation. The phonetics caches are keyed by
value (segmentation) and object identity (transcription arrays), so they need no per-deck invalidation:
the identity-keyed `WeakMap` is collected with the deck, and the bounded value-keyed cache is
deck-independent. A worker would not help here: `createNewGroup` moves cards between the live indexes
and `cardsInGame`, so it is stateful and must stay on the main thread.

## Jev deck triage: do NOT hoist `learnerContext` into `state`

`tools/jev/prompts.ts` repeats the ~542-char `learnerContext()` inside every question's `instructions`,
which is ~59% of a full-deck request's input characters. Hoisting it once into `state` and having each
question say "Given the learner context in state, ..." cuts input tokens **-31.8%** (measured on a
200-lemma `top-es-en` sample: 294,397 → 200,707 tokens; ~$0.178 → ~$0.121 projected for the full deck).
It is a real cost win and tempting — **do not adopt it.** It materially degrades the classifier:

- Pure run-to-run noise (same old-shape request run twice) is 8 flips / 654 verdicts (1.2%), max
  `misleading` delta 0.07, 0 decisive flips.
- The hoisted-context shape produced 46 flips (7.0%), 39 of them keep→drop, one decisive flip
  (`partido→party` 0.38→0.80), 5 exact-cognate false drops (`general`, `final`, `embargo`, `favor`,
  `social`), 14 lemmas whose baseline *best* candidate got dropped, and 10 emptied lemmas vs 6.
  `favor` lost both spellings.
- The mechanism is content loss, not noise: the context paragraph is what tells Jev that an exact
  cognate / the obvious everyday translation is NOT misleading. Referencing it from `state` weakens
  that signal, so the per-candidate `misleading` Noul drifts toward drop.

Both arms billed the official endpoint (`https://api.typesafe.ai/v1/systemone`, $0.042/Mtok input,
output free). Never set `TYPESAFE_API_BASE` — it defaults to the official URL in `client.ts`, and
pointing it at the `jevtypesafeai.com` reseller is the 10x-markup mistake. When evaluating any prompt
change here, always run an old-shape control on the same slice to separate signal from run-to-run noise.

## Jev triage policy: `--protect-best` + `--min-lemma-length`, not the raw 0.5 default

The first Portuguese pass used the bare default (`misleading >= 0.5`, `protectBest` off), the same
policy the Spanish/French decks shipped with. That was wrong: it emptied 246 / 405 lemmas on
`top-pt-en` / `top-en-pt`, including words whose translation is hand-curated as correct in
`tools/romance/englishCuration.ts` and `portugueseCuration.ts` (`me -> me`, `on -> em`,
`her -> dela`, `will -> vontade`, `give`, `must`, `away`, `stand`, `draw`). The cause is that Jev's
per-candidate `misleading` Noul conflates two things: "this is not the *primary* translation" and
"this is a false association". A word's one obvious gloss can therefore score 0.5–0.9 and be dropped.

The fix is to let the hand curation own the short, high-frequency words and have Jev curate only the
long tail. The policy that does this, and the one the Portuguese decks now ship with:

- `--protect-best` (guard): never drop a lemma's own top-ranked candidate, so every lemma keeps at
  least one card. The `best` pick has median `misleading` 0.12 and p90 0.42 — it is the one Jev is
  confident about, so the guard has a sound basis. With it on, all 3,000 lemmas survive on both decks.
- `--min-lemma-length 5` for `top-pt-en`, `4` for `top-en-pt`. Below that the pipeline's short-word
  curation (`ENGLISH_SHORT_WORD_GLOSSES`, `PORTUGUESE_SHORT_WORD_GLOSSES`) is authoritative and is not
  second-guessed. Russian uses the same split at `5`; English-front lemmas run shorter, so `4` keeps
  the same idea without leaving real words (`open`, `give`, `will`) to Jev.
- `--misleading-threshold 0.8` (up from 0.5). The noise rate per score band, read off stratified
  samples of the secondary candidates, is roughly 7% at 0.5–0.7, 12% at 0.7–0.8, 45% at 0.8–0.9 and
  75% at 0.9–1.0 — the kept tail flips from majority-genuine to majority-noise at 0.8. Both decks'
  histograms are flat to 0.7 and rise sharply only above 0.85, so 0.8 sits on the knee.

Net effect versus the default: `top-pt-en` 4,711 → 7,266 cards and `top-en-pt` 3,614 → 5,165, both
back to the full 3,000 lemmas, with all 1,431 / 229 curated glosses preserved. Re-deciding is free —
the raw probabilities are in `.cache/jev/<deck>/triage-report.json`, so `data:jev:policy` re-applies a
new threshold offline without re-billing. When changing the threshold, restore the pre-triage deck
(`git checkout HEAD~1 -- public/decks/<deck>.json`) before re-applying, because `apply.ts` mutates the
deck in place.
