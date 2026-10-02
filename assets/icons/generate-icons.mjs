// Generates the blue-jewel + gold "MJ" icon candidates.
//
// Everything is matched to the game rather than invented:
//   * the jewel is public/images/jewel.svg, the same overlay the game paints over
//     a coloured tile. The tile colour is CSS `blue` (#0000ff), used verbatim.
//   * the jewel is nine-sliced to a square: the 30px end facets hold the bevel
//     geometry and are scaled uniformly (so they keep their shape), while the
//     repeating gloss band between them stretches to fill. That is how a square
//     icon can show the wide gem without squashing the facets — the game itself
//     stretches it (`background-size:100% 100%`), which would.
//   * the sparkle is the one already in jewel.svg (an 8-point star at its
//     bottom-right), scaled about its own centre — not a new star drawn elsewhere.
//   * the monogram is the app's logo font (Russo One) with the logo's own shadow:
//     a black rim of ~0.05em (the four hard corner offsets in stylesheet/logo.css)
//     plus a soft lower shadow. The rim is a dilated copy of the glyph so it wraps
//     the whole outline, including the J's right side.
//
// The monogram is emitted as outlines rather than <text> + @font-face: standalone
// SVGs (launcher icons, raw.githubusercontent.com, the asset generator) do not
// fetch webfonts and would fall back to a default face.
//
// Run with: node assets/icons/generate-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

const fontBuf = readFileSync(join(root, 'public', 'fonts', 'russo_one.ttf'));
const font = opentype.parse(
  fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength),
);
const EM = 1000;

// The game tints this overlay with the tile's background colour (CSS `blue`).
const TILE_BLUE = '#0000ff';

// --- the game's jewel, lifted from public/images/jewel.svg ------------------
const jewelSrc = readFileSync(join(root, 'public', 'images', 'jewel.svg'), 'utf8');
const JEWEL_DEFS = jewelSrc.match(/<defs[^>]*>([\s\S]*?)<\/defs>/)[1];
const JEWEL_BODY = jewelSrc.match(/<g\s+inkscape:label="Layer 1"[\s\S]*?>\n([\s\S]*?)\n  <\/g>/)[1];
// The sparkle is pulled out of the body so it can be re-drawn scaled, on its own.
const SPARK_EL = JEWEL_BODY.match(/<path\s+sodipodi:type="star"[\s\S]*?\/>/)[0];
const SPARK_D = SPARK_EL.match(/\sd="([^"]*)"/)[1];
const SPARK_MATRIX = SPARK_EL.match(/\stransform="([^"]*)"/)[1];
const JEWEL_BODY_NO_SPARK = JEWEL_BODY.replace(SPARK_EL, '');

// jewel.svg is authored on 610x140 with 30px end-caps and a 550px middle. The
// caps hold the facet geometry and scale uniformly; the middle is a repeating
// gloss band and stretches. `nineSlice` renders the three panels as one square.
const JEWEL_W = 610;
const JEWEL_H = 140;
const CAP_W = 30;
// jewel.svg's layer is shifted down by this much; the artwork spans y in
// [912.36217, 1052.36217] before the shift.
const LAYER_Y = 912.36217;

// A square jewel filling most of the 512px frame.
const JEWEL_SIZE = 480;
const JEWEL_X = (512 - JEWEL_SIZE) / 2;
const JEWEL_Y = (512 - JEWEL_SIZE) / 2;

// The sparkle's centre in jewel-local coordinates (after its own matrix):
// sodipodi (340, 1042.3622) through matrix(1.3240152 0 0 1.3240152 144.59788 -357.42777).
const SPARK_CX = 594.76;
const SPARK_CY = 1022.68;

// Strip Inkscape/Sodipodi attributes and give every id and reference a unique
// per-icon prefix (the preview inlines several SVGs in one document).
function scrub(s, prefix) {
  const rename = {
    radialGradient5940: `${prefix}-gloss`,
    radialGradient5900: `${prefix}-spark`,
    filter5910: `${prefix}-blur`,
    feGaussianBlur5912: `${prefix}-blurfe`,
    linearGradient5934: `${prefix}-w1`,
    linearGradient5894: `${prefix}-w2`,
    linearGradient5201: `${prefix}-w3`,
  };
  return Object.entries(rename)
    .reduce((acc, [from, to]) => acc.replaceAll(from, to), s)
    .replace(/\s(?:inkscape|sodipodi|osb):[a-zA-Z0-9-]+="[^"]*"/g, '')
    .replaceAll('xlink:href', 'href');
}

// One panel of the nine-slice: the source region [clipX, clipX+clipW] of the gem
// is mapped onto the frame rect [x, x+w]. `clip-path` is on the outer <g>, so the
// clip rect is in frame coordinates and keeps the rest of the gem from bleeding in.
function jewelPanel(prefix, clipId, clipX, clipW, x, y, w, h) {
  const sx = w / clipW;
  const sy = h / JEWEL_H;
  return `    <clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>
    <g clip-path="url(#${clipId})"><g transform="translate(${x} ${y}) scale(${sx.toFixed(5)} ${sy.toFixed(5)}) translate(${-clipX} -${LAYER_Y})">
${scrub(JEWEL_BODY_NO_SPARK, prefix)}
    </g></g>`;
}

function nineSlice(prefix, x, y, w, h) {
  const midW = JEWEL_W - 2 * CAP_W;
  const capW = CAP_W * (h / JEWEL_H);
  const mid = w - 2 * capW;
  return `  <g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${TILE_BLUE}"/>
${jewelPanel(prefix, `${prefix}-capL`, 0, CAP_W, x, y, capW, h)}
${jewelPanel(prefix, `${prefix}-mid`, CAP_W, midW, x + capW, y, mid, h)}
${jewelPanel(prefix, `${prefix}-capR`, JEWEL_W - CAP_W, CAP_W, x + w - capW, y, capW, h)}
  </g>`;
}

// The jewel's own sparkle, drawn at the same spot and scaled about its centre.
// It sits in the right end-cap, so it uses that cap's uniform scale — the jewel's
// own shine, enlarged, rather than a second star drawn somewhere else.
function sparkle(prefix, scale) {
  const capScale = JEWEL_SIZE / JEWEL_H;
  const x = JEWEL_X + JEWEL_SIZE - CAP_W * capScale;
  const t = `translate(${x.toFixed(2)} ${JEWEL_Y}) scale(${capScale.toFixed(5)}) translate(${-(JEWEL_W - CAP_W)} ${-LAYER_Y})`;
  const star = `translate(${SPARK_CX} ${SPARK_CY}) scale(${scale}) translate(${-SPARK_CX} ${-SPARK_CY}) ${SPARK_MATRIX}`;
  return `  <g transform="${t}"><path d="${SPARK_D}" transform="${star}" fill="url(#${prefix}-spark)" filter="url(#${prefix}-blur)"/></g>`;
}

// --- the MJ monogram --------------------------------------------------------
// Letter-spacing and cap height are fractions of the em (the font size) so the
// settings read the same way the CSS does. `layout` decides how the J sits
// against the M: `row` puts it beside the M, `tuck` pulls it in over the M's
// right leg, `stack` drops it below the M.
function monogram({ cap = 0.72, track = 0.035, jDrop = 0, cx, cy, layout = 'row' }) {
  const glyphs = font.getPath('M', 0, 0, EM).getBoundingBox();
  const advM = font.getAdvanceWidth('M', EM);
  const jBox = font.getPath('J', 0, 0, EM).getBoundingBox();
  const jCenter = (jBox.x1 + jBox.x2) / 2;
  const mCenter = (glyphs.x1 + glyphs.x2) / 2;
  // Font y grows downward, so a positive drop lowers the J.
  let jx = advM + track * EM;
  let jy = jDrop * EM;
  if (layout === 'tuck') {
    jx = advM - 0.25 * EM;
  } else if (layout === 'stack') {
    jx = mCenter - jCenter;
    jy = glyphs.y2 - glyphs.y1 + 0.16 * EM + jDrop * EM;
  }
  const combined = new opentype.Path();
  combined.extend(font.getPath('M', 0, 0, EM));
  combined.extend(font.getPath('J', jx, jy, EM));
  const bb = combined.getBoundingBox();
  const s = cap / (glyphs.y2 - glyphs.y1);
  return {
    d: combined.toPathData(2),
    transform: `translate(${cx} ${cy}) scale(${s.toFixed(5)}) translate(${-((bb.x1 + bb.x2) / 2).toFixed(2)} ${-((bb.y1 + bb.y2) / 2).toFixed(2)})`,
    s,
    // One em in output pixels. The cap is 0.7em, so this must not be derived
    // from the M+J bounding box: the J's drop would inflate it.
    em: EM * s,
  };
}

// The logo's rim is a 0.05em black text-shadow on the four diagonals (logo.css).
// A dilated black copy of the glyph, merged under the gold, leaves ~0.05em of
// black all round — including the J's right side, which a centred stroke misses
// because the glyph's outline has an open end there. The two soft shadows are
// the logo's lower pair, 0.05/0.07em by 0.06em.
function mj(prefix, opts) {
  const m = monogram(opts);
  const emPx = m.em;
  const dx = (0.05 * emPx) / m.s;
  const dy = (0.07 * emPx) / m.s;
  return [
    `  <path d="${m.d}" transform="${m.transform} translate(${dx.toFixed(1)} ${dy.toFixed(1)})" fill="#000000" filter="url(#${prefix}-soft)" opacity="0.9"/>`,
    `  <path d="${m.d}" transform="${m.transform} translate(${(-dx).toFixed(1)} ${dy.toFixed(1)})" fill="#000000" filter="url(#${prefix}-soft)" opacity="0.9"/>`,
    `  <path d="${m.d}" transform="${m.transform}" fill="url(#${prefix}-gold)" filter="url(#${prefix}-rim)"/>`,
  ].join('\n');
}

function svg(label, prefix, body, { emPx }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="${prefix}-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#171c2b"/>
      <stop offset="100%" stop-color="#0c0f18"/>
    </linearGradient>
    <linearGradient id="${prefix}-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe98a"/>
      <stop offset="55%" stop-color="#f1c101"/>
      <stop offset="100%" stop-color="#b69202"/>
    </linearGradient>
    <filter id="${prefix}-rim" x="-25%" y="-25%" width="150%" height="150%">
      <feMorphology operator="dilate" radius="${(0.05 * emPx).toFixed(2)}" in="SourceAlpha" result="d"/>
      <feFlood flood-color="#000000" result="black"/>
      <feComposite in="black" in2="d" operator="in" result="rim"/>
      <feMerge><feMergeNode in="rim"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${prefix}-soft" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="${(0.02 * emPx).toFixed(2)}"/>
    </filter>
    <clipPath id="${prefix}-frame"><rect width="512" height="512" rx="112"/></clipPath>
${scrub(JEWEL_DEFS, prefix)}
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#${prefix}-bg)"/>
  <g clip-path="url(#${prefix}-frame)">
${nineSlice(prefix, JEWEL_X, JEWEL_Y, JEWEL_SIZE, JEWEL_SIZE)}
${body}
  </g>
</svg>
`;
}

// --- candidates -------------------------------------------------------------
// The square jewel gives the monogram a tall face to sit on. `jDrop` is a
// fraction of the em; the J sits slightly lower than the M in every layout,
// matching the logo's baseline feel.
const CAP = 0.24 * 512;
const EM_PX = CAP / 0.7;
const BASE = { cap: CAP, cx: 256, cy: 256 };

writeFileSync(join(here, '01-blue-gem-mj.svg'), svg(
  'Blue jewel with gold MJ monogram',
  'a',
  `${mj('a', { ...BASE, track: 0.03, jDrop: 0.02 })}
${sparkle('a', 1.6)}`,
  { emPx: EM_PX },
));

writeFileSync(join(here, '02-blue-gem-mj-lower-j.svg'), svg(
  'Blue jewel with gold MJ monogram, J dropped',
  'b',
  `${mj('b', { ...BASE, track: 0.03, jDrop: 0.1 })}
${sparkle('b', 1.6)}`,
  { emPx: EM_PX },
));

writeFileSync(join(here, '03-blue-gem-mj-tuck.svg'), svg(
  'Blue jewel with gold MJ monogram, J tucked under the M leg',
  'c',
  `${mj('c', { ...BASE, layout: 'tuck', jDrop: 0.03 })}
${sparkle('c', 1.6)}`,
  { emPx: EM_PX },
));

console.log('Wrote 3 blue-jewel MJ candidates.');
