# Icon candidates

A blue jewel with a gold **MJ** monogram, reusing two things straight from the game:

- **the jewel face is `public/images/jewel.svg`** — the same bevel/gloss/facet overlay
  the game paints over a coloured button or tile, here tinted blue;
- **the monogram is the app's logo font (Russo One)**, cut to outlines and given the
  same thick black shadow the on-screen logo uses (`text-shadow` in `stylesheet/logo.css`).

The monogram is emitted as **vector outlines** rather than `<text>` with a `@font-face`:
standalone SVGs (launcher icons, `raw.githubusercontent.com` images in a README or PR,
and `@vite-pwa/assets-generator`) don't fetch webfonts, so `<text>` would silently fall
back to a default face. `generate-icons.mjs` regenerates the outlines from the font, so
they still track the logo.

Each option is shown at 48 / 96 / 192 px, then a circular crop to check maskable behaviour.

---

## 01 — blue jewel + gold MJ (default)

<img src="01-blue-gem-mj.svg" width="48" alt=""> <img src="01-blue-gem-mj.svg" width="96" alt=""> <img src="01-blue-gem-mj.svg" width="192" alt="">

<img src="01-blue-gem-mj.svg" width="192" alt="" style="border-radius:50%">

The J sits down and left of the M so its hook tucks under the M's right leg. Thick black
shadow behind the gold, per the game logo.

---

## 02 — larger monogram

<img src="02-blue-gem-mj-large.svg" width="48" alt=""> <img src="02-blue-gem-mj-large.svg" width="96" alt=""> <img src="02-blue-gem-mj-large.svg" width="192" alt="">

<img src="02-blue-gem-mj-large.svg" width="192" alt="" style="border-radius:50%">

Same as 01 but the MJ fills more of the jewel.

---

## 03 — octagonal face

<img src="03-blue-gem-mj-octagon.svg" width="48" alt=""> <img src="03-blue-gem-mj-octagon.svg" width="96" alt=""> <img src="03-blue-gem-mj-octagon.svg" width="192" alt="">

<img src="03-blue-gem-mj-octagon.svg" width="192" alt="" style="border-radius:50%">

Clips the same jewel overlay to the emerald-cut octagon, so the "jewel" silhouette reads.

---

## 04 — tighter set

<img src="04-blue-gem-mj-tight.svg" width="48" alt=""> <img src="04-blue-gem-mj-tight.svg" width="96" alt=""> <img src="04-blue-gem-mj-tight.svg" width="192" alt="">

<img src="04-blue-gem-mj-tight.svg" width="192" alt="" style="border-radius:50%">

J tucked further under the M for a narrower, squarer mark.

---

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
