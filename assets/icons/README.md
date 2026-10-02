# Icon candidates

Two takes on an app icon for MnemoJewels, each a square blue jewel with a gold
**MJ** monogram. They reuse the game rather than inventing a style:

- **the jewel is `public/images/jewel.svg`** — the exact bevel/gloss/facet overlay the
  game paints over a coloured tile, drawn over the game's tile colour, CSS `blue`
  (`#0000ff`). Nothing is re-tinted or re-shaded.
- **the jewel is nine-sliced to a square.** The gem is authored wide (610×140) with 30px
  end-caps. The caps hold the bevel and facet geometry and are scaled uniformly, so they
  keep their shape; only the repeating gloss band between them stretches. The game
  stretches the whole gem over a tile (`background-size: 100% 100%`), which would squash
  the caps on a square icon — this keeps them.
- **the square is cut to an octagon.** A plain square leaves four solid-blue corners where
  the wide gem has bevels; clipping each corner on the diagonal (40 units) makes the blue
  read as the game's faceted gem instead of a flat square.
- **the sparkle is the jewel's own.** `jewel.svg` already carries an 8-point shine near its
  bottom-right; it is scaled up about its centre, not replaced by a new star elsewhere.
- **the monogram is the app's logo font (Russo One)** at the reference's own size and
  position, with the logo's **full eight-layer `text-shadow`** reproduced in SVG
  (`stylesheet/logo.css`). Each layer becomes a `drop-shadow()` filter on its own copy of
  the glyphs, so the two dark-gold layers between the black rim and the gold fill survive
  instead of being flattened into the black. The M and J stay separate paths — merging
  them into one would overpaint the gold shadow falling between the letters.

The monogram is emitted as **vector outlines** rather than `<text>` with a `@font-face`:
standalone SVGs (launcher icons, `raw.githubusercontent.com` images in a README or PR, and
`@vite-pwa/assets-generator`) don't fetch webfonts, so `<text>` would silently fall back to
a default face. `generate-icons.mjs` regenerates the outlines from the font, so they still
track the logo.

## Reference

The in-game tile — CSS `blue` with `jewel.svg` stretched over it — is the shape every
candidate is matched against:

<img src="../../public/images/jewel.svg" width="240" alt="">

## Candidates

The two versions are identical apart from the jewel's corner sparkle, which sits in the
bottom-right where the octagon cuts the corner:

**01 — sparkle in the jewel (default)** — the shine is clipped to the octagon like the rest
of the gem, so the silhouette stays clean.

<img src="01-blue-gem-mj.svg" width="48" alt=""> <img src="01-blue-gem-mj.svg" width="96" alt=""> <img src="01-blue-gem-mj.svg" width="192" alt=""> <img src="01-blue-gem-mj.svg" width="96" alt="" style="border-radius:50%">

**02 — sparkle on top** — the shine floats above everything, so its points spill past the cut
corner. Reads as a highlight sitting on the icon rather than inside the gem.

<img src="02-blue-gem-mj-sparkle-top.svg" width="48" alt=""> <img src="02-blue-gem-mj-sparkle-top.svg" width="96" alt=""> <img src="02-blue-gem-mj-sparkle-top.svg" width="192" alt=""> <img src="02-blue-gem-mj-sparkle-top.svg" width="96" alt="" style="border-radius:50%">

The last image in each row is a circular crop, to check maskable behaviour.

`contact-sheet.png` is a rasterised comparison sheet (reference tile + both at 192px with a
96px circular crop), and `preview.html` is a self-contained gallery. Both are regenerated
by `render-preview.mjs`.

## Styling lab (`jewel-mj.html`)

`jewel-mj.html` is a standalone scratch pad for positioning the monogram: the square jewel
as inline SVG (`jewel-square.svg`, jewel only, no letters), with **M** and **J** as
absolutely-positioned spans on top. The letters use the real logo font and the exact
`text-shadow` from `stylesheet/logo.css`, so tuning is pure CSS — no path math.

The CSS variables at the top of the file are the knobs; every length is in the icon's
512-unit design space (so `--icon: 512px` means 1 unit = 1px, and changing `--icon` scales
the whole thing):

```css
.letters { top: 93px; left: 104px; font-size: 231px; }
.letter.j { top: 56px; left: -79px; }
```

Click the icon to toggle centre guides. These numbers are the source of truth: they are
baked into `generate-icons.mjs` (`M_ORIGIN`, `J_ORIGIN`, `FONT_SIZE`) so the candidates
match the lab exactly. Note `.letter.j { left }` is relative to the J's inline position
after the M, so the generator computes its origin as the M advance minus 79.

Open it via a local server so the webfont loads, e.g.:

```sh
python3 -m http.server 12000   # then visit /assets/icons/jewel-mj.html
```

## Regenerating

```sh
node assets/icons/generate-icons.mjs   # icon sources (MJ outlines from the logo font)
node assets/icons/render-preview.mjs   # preview.html + contact-sheet.png
```

To ship a favourite as the app icon:

```sh
cp assets/icons/<chosen>.svg public/icon.svg
npx pwa-assets-generator --config pwa-assets.config.mjs public/icon.svg
```

That rewrites `favicon.ico`, `pwa-{64,192,512}.png`, `maskable-icon-512x512.png` and
`apple-touch-icon-180x180.png` in `public/`.
