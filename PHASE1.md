# Phase 1 — Modernize the toolchain (no framework)

Execute this plan only. Do not add a UI framework, do not rewrite game/SRS logic, and do not start product features.

**Goal:** Make the repo pleasant to work in (Vite, TypeScript, plain CSS, Vitest, no jQuery) while keeping the current architecture: one `index.html` with screens, custom event bus, module-level state, 6fps board redraw.

**Done when:**

- `npm start` (or `npm run dev`) serves the game with Vite
- `npm run build` produces a static `dist/`
- `npm test` runs the existing unit tests under Vitest
- Splash → settings/menu → play → stats/scores still work
- No Webpack, Babel, Karma, jQuery, Sass, or ES6 polyfills remain
- `.npmrc` enforces a 24h package-release cooldown

---

## 0. Constraints for the implementer

- Keep the screen-in-one-HTML navigation and the custom event bus.
- Keep `localStorage` and the storage migrations in `src/storage.js`.
- Keep vendored `lib/donut-chart.js` (side-effect IIFE that sets `window.DonutChart`). Do not rewrite it.
- Leave `tools/` and `test/debug.js` alone (old leftover, not part of the app bundle).
- Prefer existing `npm run` scripts over raw `npx`.
- Do not commit secrets. There should be none.
- Node **24+** is required so the bundled npm is **≥ 11.10.0** (`min-release-age` does not exist before that). Add `"engines": { "node": ">=24", "npm": ">=11.10.0" }` to `package.json`. If the environment is older, upgrade Node first.

---

## 1. npm 24h cooldown — do this before any install

npm’s setting is **`min-release-age`**, unit **days**. `1` means 24 hours.

Put it in a **project** `.npmrc` (not user-level config). User-level `npm config set` would not travel to a cloud session.

```ini
min-release-age=1
```

Do **not** set `before` in the same file; it conflicts with `min-release-age` within one source.

Then replace `package.json` dependencies (step 2) and only then run `npm install`. Every new package version, including transitives, must be at least 24h old.

If `npm audit fix` is later blocked by a too-new patch, either wait or add that package to `min-release-age-exclude` — do not silently drop the cooldown.

---

## 2. Replace package.json

**Remove all current `devDependencies`.** None of them survive:

Webpack 1, webpack-dev-server, babel-core/loader/preset-es2015, extract-text-webpack-plugin, css-loader, style-loader, sass-loader, node-sass, json-loader, karma*, jasmine-core, jquery, core-js, es6-promise.

**Add only:**

| Package      | Role                         |
|--------------|------------------------------|
| `vite`       | Dev server + production build |
| `typescript` | Typecheck; Vite uses it      |
| `vitest`     | Unit tests                   |

There are no runtime npm dependencies after this. jQuery, polyfills, and Sass all go away. Donut chart and (until replaced) spinner stay as local files, not packages.

**Scripts** (keep the old names where they still make sense):

```json
{
  "scripts": {
    "start": "vite",
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test-watch": "vitest"
  }
}
```

Then `npm install` so Vite / TypeScript / Vitest resolve to current versions that pass the 24h gate. That **is** the “update remaining deps” step: after the cull, these three are the remaining deps, installed at latest-eligible.

Commit `package-lock.json`.

---

## 3. Vite scaffolding

Add `vite.config.ts`:

- `root` stays the repo root (`index.html` already lives there).
- `build.outDir`: `dist` (replace the old `target/` output).
- No need for a React/Vue plugin.
- Tests: `test: { environment: 'node' }` via Vitest’s Vite integration (or a tiny `vitest.config.ts` that merges with Vite). Current tests do not need jsdom.

Update `.gitignore`: add `dist`, `.vite`. Optional: `target` (legacy output). Keep `node_modules`.

Change `index.html`:

- Drop `<link rel="stylesheet" href="target/bundle.css" />` (CSS will be imported from JS).
- Replace `<script src="target/bundle.js">` with `<script type="module" src="/src/initial.js">` (or `.ts` if that file is renamed in step 6).
- Keep the existing DOM (all screens). Do not componentize it.

**Static files that are fetched by URL at runtime** must be served from `public/`:

| Current path        | Why                                      | Move to              |
|---------------------|------------------------------------------|----------------------|
| `decks/*.json`      | `downloadDeck` GETs `./decks/${uid}.json` | `public/decks/`      |
| `images/jewel.svg`  | `imageLoader` uses the string URL         | `public/images/`     |
| `images/bg.jpg`     | referenced from CSS (file may be missing) | `public/images/` if present |
| `fonts/*`           | `@font-face` urls (files may be missing except `LICENSE.txt`) | `public/fonts/` if present |

After the move, `downloadDeck` should use `fetch(`/decks/${uid}.json`)` instead of `$.ajax`.

**Deck metadata vs full JSON:** the old Webpack loader inlined only `{uid, displayName, version}` so the bundle did not contain thousands of cards. Preserve that:

- In `src/decks.js`, replace `require('../decks/....json')` with a small in-source (or `src/available-decks.json`) list of metadata only. Do **not** `import` the full deck JSON into the bundle.
- Full files live in `public/decks/` for runtime fetch, same as today.

**Code splitting:** in `src/initial.js`, replace `require(["./additional"], …)` with `import("./additional.js")` so the splash screen still loads before the rest of the app.

Delete: `webpack.config.js`, `karma.config.js`, `src/loaders/deck-data-loader.js`.

---

## 4. CSS: Sass → plain CSS

Sass is unused in any meaningful way (no variables, mixins, functions, loops). Convert rather than keep a Sass compiler.

- Rename `stylesheet/*.scss` → `stylesheet/*.css`. Partials can drop the `_` prefix (`main.css`, `buttons.css`, …).
- Replace Sass `@import "foo"` with CSS `@import "./foo.css"` **or** (preferred with Vite) import each file from JS the same way `initial.js` / `additional.js` already split styles.
- Expand nested **properties** to longhands. This is the only Sass-only syntax:

  ```scss
  font: { size: 20em; family: default-font; weight: bold; }
  background: { color: #C5CADF; image: url("..."); }
  border: { style: solid; width: 0.1em; color: ...; radius: 0.5em; }
  ```

  → `font-size`, `font-family`, `font-weight`, `background-color`, `background-image`, `border-radius`, etc.

- Keep **selector nesting** (`&.active`, `#board td`, `button:hover`). Native CSS nesting is fine.
- Delete `.no-textshadow .logo { filter: dropshadow(...) }` in the logo stylesheet (obsolete fallback).
- Fix `@font-face` urls so they point at `/fonts/...` after the public-dir move. Today `_default-font.scss` uses `./fonts/...` (wrong relative to `stylesheet/`) and `_logo-font.scss` uses `../fonts/...`.
- Keep `stylesheet/donut-chart.css`; import it from the deck-stats screen module or from `additional` CSS.
- If `images/bg.jpg` or font binaries are missing from the repo, do not block the migration — note the 404 and continue.

Keep the two-entry split: splash styles from `initial`, the rest from `additional`.

---

## 5. Drop jQuery (vanilla DOM)

jQuery is only selectors, delegated clicks, show/hide, and one `$.ajax`. Replace in place; do not introduce a helper library.

| File                    | Replace with |
|-------------------------|--------------|
| `src/navigation.js`     | `document.body.addEventListener` + `e.target.closest('button.nav')` / `button.back`; `classList.add/remove('active')`; `document.getElementById` |
| `src/additional.js`     | `touchmove` / `pagehide` or `beforeunload` on `window`/`document`; splash click + `hidden` class / `display` |
| `src/screen.settings.js`| `HTMLSelectElement`, `change`, `innerHTML` / `replaceChildren` for options |
| `src/screen.top-scores.js` | `document.createElement('tr')` + `replaceChildren` |
| `src/screen.deck-stats.js` | `getElementById` / `querySelector`; `classList.add('too-small')` |
| `src/display.js`        | `document.getElementById('board')` / `('stats')` (already unwraps `[0]`) |
| `src/input.js`          | `board.addEventListener('mousedown'/'mouseup', …)` |
| `src/board.js`          | overlay `style.display` instead of `$overlay.show()/hide()` |
| `src/decks.js`          | `fetch` (see step 3) |

Touch handling in `input.js` is already commented out — leave it commented; do not “fix” it in this phase.

`additional.js` currently calls `$(document).on('touchmove', e => e.preventDefault())` to stop mobile overscroll. Keep that behavior with `touchmove` `{ passive: false }`.

---

## 6. TypeScript (incremental, same architecture)

Add `tsconfig.json`:

- `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "bundler"`
- `"strict": false` for this phase (JSDoc types exist but the code will not pass `strict` without a real cleanup)
- `"allowJs": true`, `"checkJs": false`, `"noEmit": true`, `"skipLibCheck": true`, `"isolatedModules": true`
- `"include": ["src", "tests", "vite.config.ts"]`

Do **not** require renaming every file to `.ts` in this phase. Convert as you touch a file, or convert `src/` if it stays mechanical. Either is fine as long as Vite + `allowJs` work.

Add a small ambient declaration for the donut chart global (e.g. `src/types/donut-chart.d.ts`: `declare const DonutChart: …`) so `Object.create(DonutChart)` typechecks if that screen becomes `.ts`.

Leave circular imports (`board` ↔ `game` ↔ `cards`) as they are. Vite ESM will tolerate them the same way Webpack did, as long as modules do not use each other’s exports at top-level evaluation time (they mostly register event handlers in IIFEs).

Delete `core-js` / `es6-promise` usage in `additional.js`. `Array.prototype.find` and `Promise` are native.

---

## 7. Spinner: delete `lib/spin.min.js`

Replace `src/spinner.js` with start/stop that toggle a CSS class (or `display`) on `#splash-screen .spinner`. Add a CSS keyframe spinner in the splash stylesheet. Delete `lib/spin.min.js`.

Keep the splash flow: spinner runs until `Promise.all([storage.setup(), imageLoader.loadImages(...)])`, then show “Click to continue”.

---

## 8. Tests: Karma/Jasmine → Vitest

- Point Vitest at `tests/**/*.spec.js`.
- `describe` / `it` / `expect` can stay; Vitest is Jest-compatible.
- Replace `jasmine.clock().install()` / `mockDate` / `tick` / `uninstall` in `tests/Card.spec.js` with `vi.useFakeTimers()`, `vi.setSystemTime()`, `vi.advanceTimersByTime()`, `vi.useRealTimers()`.
- Import `vi` from `vitest` (or enable globals — pick one and be consistent).
- `tests/events.spec.js` should work as-is besides ESM imports.

Do not set up Karma, Chrome launchers, or a browser test runner.

---

## 9. Verify

Run, in order:

1. `npm test` — Card + events specs pass.
2. `npm start` — splash, pick a deck if needed, main menu, play (match/mismatch), Learning Stats, Top Scores, Settings, About, Back.
3. `npm run build` then `npm run preview` — decks still load from `/decks/*.json`, fonts/images resolve, no requests to `target/`.

If browser tools are available, click through those screens. If not, say what was not verified.

Manual checks that often break in this migration:

- First-run: no selected deck → Settings with Continue disabled until a language is chosen.
- Deck import: choosing a language fetches `/decks/top-*.json` and stores cards.
- Returning user: splash → main menu, selected deck remembered.
- Game over alert still returns to main menu.
- Stats donut + legend render.

---

## 10. Files expected to be added / deleted

**Add:** `.npmrc`, `vite.config.ts`, `tsconfig.json`, `PHASE1.md` (this file; leave it), converted `stylesheet/*.css`, `public/decks|images|fonts` as needed, optional `src/available-decks.json`, optional `src/types/donut-chart.d.ts`.

**Delete:** `webpack.config.js`, `karma.config.js`, `src/loaders/`, `lib/spin.min.js`, all `.scss` after conversion, old `target/` artifacts if any.

**Do not delete:** `lib/donut-chart.js`, `decks` content (moved to `public`), `src/events.js`, storage migrations, screen modules.

---

## Out of scope (later, not this PR)

- React / Vue / Svelte / routers / state libraries
- `strict: true` TypeScript
- PWA, Tailwind, IndexedDB
- Re-enabling touch input on the board
- Rewriting `lib/donut-chart.js`
- Product changes (SRS, scoring, UI copy)
