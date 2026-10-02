# App icon

`jewel-mj.svg` is the PWA/app icon: a square blue jewel with a gold **MJ** monogram. It
reuses the game rather than inventing a style:

- **the jewel is `public/images/jewel.svg`** — the exact bevel/gloss/facet overlay the
  game paints over a coloured tile, drawn over the game's tile colour, CSS `blue`
  (`#0000ff`). Nothing is re-tinted or re-shaded.
- **the jewel is nine-sliced to a square.** The gem is authored wide (610×140) with 30px
  end-caps. The caps hold the bevel and facet geometry and are scaled uniformly, so they
  keep their shape; only the repeating gloss band between them stretches. The game
  stretches the whole gem over a tile (`background-size: 100% 100%`), which would squash
  the caps on a square icon — this keeps them.
- **the square is cut to an octagon along the jewel's own bevel.** `jewel.svg` already
  chamfers its corners: in the 610×140 gem the bevel runs from (24,0) to (0,24). The
  nine-slice scales the caps uniformly (480/140), so on the icon that bevel sits at
  ~82px; the cut is placed at 86 units so it sits fully on the facet. The blue edge then
  lands on the jewel's existing facet instead of a shallower angle that reads as a second,
  floating edge.
- **the sparkle is the jewel's own.** `jewel.svg` already carries an 8-point shine near its
  bottom-right; it is scaled up about its centre and floats over everything (monogram
  included), so it reads as a highlight sitting on the icon rather than inside the gem.
- **the monogram is the app's logo font (Russo One)**, tuned to reproduce the rendered logo
  (`stylesheet/logo.css`) at icon scale, with the logo's **full eight-layer `text-shadow`** reproduced in SVG.
  Each layer becomes a `drop-shadow()` filter on its own copy of the glyphs, so the two
  dark-gold layers between the black rim and the gold fill survive instead of being
  flattened into the black. The M and J stay separate paths — merging them into one would
  overpaint the gold shadow falling between the letters.

The monogram is emitted as **vector outlines** rather than `<text>` with a `@font-face`:
standalone SVGs (launcher icons, `raw.githubusercontent.com` images, and
`@vite-pwa/assets-generator`) don't fetch webfonts, so `<text>` would silently fall back to
a default face. `generate-icons.mjs` regenerates the outlines from the font, so they still
track the logo.

The J's position comes from the logo's own CSS: the two letters are inline spans, and the
markup puts them on separate lines, so the newline between them collapses to a space. The
generator therefore places the J at `M advance + space − 79`; dropping that space shifts it
left by ~69px.

## Regenerating

```sh
node assets/icons/generate-icons.mjs   # rewrites jewel-mj.svg (MJ outlines from the logo font)
```

## Shipping

```sh
cp assets/icons/jewel-mj.svg public/icon.svg
npx pwa-assets-generator --config pwa-assets.config.mjs public/icon.svg
```

That rewrites `favicon.ico`, `pwa-{64,192,512}.png`, `maskable-icon-512x512.png` and
`apple-touch-icon-180x180.png` in `public/`. `pwa-assets.config.mjs` pads the maskable and
Apple icons onto the app's near-black navy (`#0c0f18`) rather than white.
