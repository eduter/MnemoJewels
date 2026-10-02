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
localStorage under `mj.deck.<id>`). Deck JSON is cached at runtime instead, `CacheFirst` in
`mnemojewels-decks` — so a deck downloaded while online can be re-imported offline. Once a deck is
selected, a mismatch-free game is fully playable offline.

Icons live in `public/` and are generated from a single source SVG with `@vite-pwa/assets-generator`
(dev dependency, config in `pwa-assets.config.mjs`):

```
cp assets/icons/<chosen>.svg public/icon.svg
npx pwa-assets-generator --config pwa-assets.config.mjs public/icon.svg
```

That writes `favicon.ico`, `pwa-{64,192,512}.png`, `maskable-icon-512x512.png` and
`apple-touch-icon-180x180.png`. The maskable/Apple variants pad onto the app's dark navy (`#0c0f18`)
rather than the generator's default white. Icon candidates and a comparison gallery live in
`assets/icons/` (`node assets/icons/render-preview.mjs` regenerates `preview.html` + `contact-sheet.png`).
Candidates are blue-jewel + gold **MJ** marks built from `public/images/jewel.svg` and the Russo One logo
font. `jewel.svg` is authored wide (610x140, ~4.36:1), so the icon keeps that true aspect and scales the
whole jewel uniformly — the game's own `background-size: 100% 100%` stretch would squash the end facets
on a square icon, so it is deliberately not reproduced. The jewel sits on the game's tile blue `#0000ff`,
and the monogram carries the logo's own `0.05em` black rim. The MJ is emitted as vector outlines, not
`<text>`, so standalone SVGs keep the font.

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
