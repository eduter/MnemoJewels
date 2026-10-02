// Generates the blue-jewel + gold "MJ" icon candidates.
//
// Everything is matched to the game rather than invented:
//   * the jewel is public/images/jewel.svg, the same overlay the game paints over
//     a coloured tile. The tile colour is CSS `blue` (#0000ff), used verbatim.
//   * the jewel is kept at its true 610:140 aspect and scaled uniformly. The game
//     stretches it over the whole tile (`background-size:100% 100%`), which would
//     squash the end facets on a square icon; that stretch is not reproduced here.
//   * the monogram is the app's logo font (Russo One) with the logo's own shadow:
//     a black rim of ~0.05em (the four hard corner offsets in stylesheet/logo.css)
//     plus a soft lower shadow. The rim is stroked in path space so it scales with
//     the letters, which keeps it at a constant fraction of the cap height.
//   * the sparkle from the jewel is re-drawn overflowing the top-right, so the
//     shine escapes the jewel instead of being clipped inside it.
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

function gameJewel(prefix) {
  const rename = {
    radialGradient5940: `${prefix}-gloss`,
    radialGradient5900: `${prefix}-spark`,
    filter5910: `${prefix}-blur`,
    feGaussianBlur5912: `${prefix}-blurfe`,
    linearGradient5934: `${prefix}-w1`,
    linearGradient5894: `${prefix}-w2`,
    linearGradient5201: `${prefix}-w3`,
  };
  const scrub = (s) =>
    Object.entries(rename)
      .reduce((acc, [from, to]) => acc.replaceAll(from, to), s)
      .replace(/\s(?:inkscape|sodipodi|osb):[a-zA-Z0-9-]+="[^"]*"/g, '')
      .replaceAll('xlink:href', 'href');
  return { defs: scrub(JEWEL_DEFS), body: scrub(JEWEL_BODY) };
}

// jewel.svg is authored on 610x140 (a wide gem, ~4.36:1) and the game stretches
// it to the tile. The icon keeps that true aspect: the whole jewel is scaled
// uniformly, never distorted, so the end facets and the gloss band keep their
// real proportions.
const JEWEL_W = 610;
const JEWEL_H = 140;
const LAYER_Y = 912.36217;

function wideJewel(prefix, body, { cx, cy, w }) {
  const h = (w * JEWEL_H) / JEWEL_W;
  const s = w / JEWEL_W;
  const x = cx - w / 2;
  const y = cy - h / 2;
  return `  <g>
    <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(h * 0.14).toFixed(1)}" fill="${TILE_BLUE}"/>
    <clipPath id="${prefix}-jclip"><rect x="0" y="${LAYER_Y}" width="${JEWEL_W}" height="${JEWEL_H}"/></clipPath>
    <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(5)}) translate(0 ${-LAYER_Y})">
      <g clip-path="url(#${prefix}-jclip)">
${body}
      </g>
    </g>
  </g>`;
}

// --- the MJ monogram --------------------------------------------------------
// Letter-spacing and cap height are quoted as fractions of the em (the font
// size) so the settings read the same way the CSS does. `layout` decides how the
// J sits against the M: `row` puts it beside the M, `tuck` pulls it in so it
// overlaps the M's right leg, and `stack` drops it below the M.
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
  const w = (bb.x2 - bb.x1) * s;
  const h = (bb.y2 - bb.y1) * s;
  return {
    d: combined.toPathData(2),
    transform: `translate(${cx} ${cy}) scale(${s.toFixed(5)}) translate(${-((bb.x1 + bb.x2) / 2).toFixed(2)} ${-((bb.y1 + bb.y2) / 2).toFixed(2)})`,
    s,
    w,
    h,
    // One em in output pixels. The cap is 0.7em, so this must not be derived
    // from the M+J bounding box: the J's drop would inflate it.
    em: EM * s,
  };
}

// The logo's rim is a 0.05em black text-shadow on the four diagonals (logo.css).
// A stroke of twice that, centred on the outline, leaves 0.05em of black outside
// the gold. The two extra shadows are the soft lower pair, 0.05/0.07em by 0.06em.
// All offsets are quoted in em (the font size), not cap height: em = cap/0.7.
function mj(prefix, opts, { rim = 0.05, soft = true } = {}) {
  const m = monogram(opts);
  const emPx = m.em;
  const stroke = (2 * rim * emPx) / m.s;
  const softStroke = (2 * 0.03 * emPx) / m.s;
  const dx = (0.05 * emPx) / m.s;
  const dy = (0.07 * emPx) / m.s;
  const parts = [];
  if (soft) {
    parts.push(
      `  <path d="${m.d}" transform="${m.transform} translate(${dx.toFixed(1)} ${dy.toFixed(1)})" fill="none" stroke="#000000" stroke-width="${softStroke.toFixed(1)}" stroke-linejoin="round"/>`,
      `  <path d="${m.d}" transform="${m.transform} translate(${(-dx).toFixed(1)} ${dy.toFixed(1)})" fill="none" stroke="#000000" stroke-width="${softStroke.toFixed(1)}" stroke-linejoin="round"/>`,
    );
  }
  parts.push(
    `  <path d="${m.d}" transform="${m.transform}" fill="none" stroke="#000000" stroke-width="${stroke.toFixed(1)}" stroke-linejoin="round"/>`,
    `  <path d="${m.d}" transform="${m.transform}" fill="url(#${prefix}-gold)"/>`,
  );
  return parts.join('\n');
}

// A four-point shine (concave star) with a soft bloom behind it. Placed at the
// jewel's top-right corner so it spills over the tile edge into the dark border.
const STAR = (r) =>
  `M 0 ${-r} C ${r * 0.09} ${-r * 0.09} ${r * 0.09} ${-r * 0.09} ${r} 0 ` +
  `C ${r * 0.09} ${r * 0.09} ${r * 0.09} ${r * 0.09} 0 ${r} ` +
  `C ${-r * 0.09} ${r * 0.09} ${-r * 0.09} ${r * 0.09} ${-r} 0 ` +
  `C ${-r * 0.09} ${-r * 0.09} ${-r * 0.09} ${-r * 0.09} 0 ${-r} Z`;

function sparkle(prefix, x, y, r, { bloom = 1.9, opacity = 1 } = {}) {
  return `  <g transform="translate(${x} ${y})" opacity="${opacity}">
    <path d="${STAR(r * bloom)}" fill="url(#${prefix}-sparkle)" filter="url(#${prefix}-sparkblur)" opacity="0.7"/>
    <path d="${STAR(r)}" fill="#ffffff"/>
    <path d="${STAR(r * 0.42)}" fill="#fff7d6"/>
  </g>`;
}

function svg(label, prefix, body, { jewelW = 480 } = {}) {
  const jewel = gameJewel(prefix);
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
    <radialGradient id="${prefix}-sparkle" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="45%" stop-color="#fff7d6"/>
      <stop offset="100%" stop-color="#fff7d6" stop-opacity="0"/>
    </radialGradient>
    <filter id="${prefix}-sparkblur" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
    <clipPath id="${prefix}-frame"><rect width="512" height="512" rx="112"/></clipPath>
${jewel.defs}
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#${prefix}-bg)"/>
  <g clip-path="url(#${prefix}-frame)">
${wideJewel(prefix, jewel.body, { cx: 256, cy: 256, w: jewelW })}
${body}
  </g>
</svg>
`;
}

// --- candidates -------------------------------------------------------------
// The wide jewel's face is only ~110px tall (140/610 * 480), so the monogram is
// sized to it. `jDrop` is a fraction of the em; the J sits slightly lower than
// the M in every layout, matching the logo's baseline feel.
const CAP = 0.19 * 512;
const BASE = { cap: CAP, cx: 256, cy: 256 };
const SPARK = [478, 196, 48];

writeFileSync(join(here, '01-blue-gem-mj.svg'), svg(
  'Blue jewel with gold MJ monogram',
  'a',
  `${mj('a', { ...BASE, track: 0.03, jDrop: 0.02 })}
${sparkle('a', ...SPARK)}`,
));

writeFileSync(join(here, '02-blue-gem-mj-lower-j.svg'), svg(
  'Blue jewel with gold MJ monogram, J dropped',
  'b',
  `${mj('b', { ...BASE, track: 0.03, jDrop: 0.07 })}
${sparkle('b', ...SPARK)}`,
));

writeFileSync(join(here, '03-blue-gem-mj-tuck.svg'), svg(
  'Blue jewel with gold MJ monogram, J tucked under the M leg',
  'c',
  `${mj('c', { ...BASE, layout: 'tuck', jDrop: 0.04 })}
${sparkle('c', ...SPARK)}`,
));

writeFileSync(join(here, '04-blue-gem-mj-stack.svg'), svg(
  'Blue jewel with gold M over J monogram',
  'd',
  `${mj('d', { cap: 0.12 * 512, cx: 256, cy: 256, layout: 'stack', jDrop: 0 })}
${sparkle('d', ...SPARK)}`,
));

console.log('Wrote 4 blue-jewel MJ candidates.');
