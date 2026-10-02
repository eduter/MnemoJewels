// Generates the blue-jewel + gold "MJ" icon candidates.
//
// Everything is matched to the game rather than invented:
//   * the jewel is public/images/jewel.svg, the same overlay the game paints over
//     a coloured tile. The tile colour is CSS `blue` (#0000ff), used verbatim.
//   * the jewel is drawn with 9-slice: the game stretches it over the whole tile
//     (`background-size:100% 100%`), but for an icon that squashes the 30px end
//     facets, so the caps stay square and only the middle stretches.
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

// jewel.svg is authored on 610x140 with 30px end-caps and a 550px middle. The
// caps hold the facet geometry and must stay square; the middle is a repeating
// gloss band and may stretch. `squareCap` renders it to an aspect-true bitmap
// (also handy for previews); `nineSlice` emits it as SVG clipped to three panels.
const JEWEL_W = 610;
const JEWEL_H = 140;
const CAP = 30;
const LAYER_Y = 912.36217;

function jewelPanel(body, clipId, clipX, clipW, x, w, h) {
  const sx = w / clipW;
  const sy = h / JEWEL_H;
  return `    <clipPath id="${clipId}"><rect x="${clipX}" y="0" width="${clipW}" height="${JEWEL_H}"/></clipPath>
    <g clip-path="url(#${clipId})"><g transform="translate(${x} 0) scale(${sx.toFixed(5)} ${sy.toFixed(5)}) translate(${-clipX} -${LAYER_Y})">
${body}
    </g></g>`;
}

function nineSlice(prefix, x, y, w, h, body) {
  const midW = JEWEL_W - 2 * CAP;
  const capW = CAP * (h / JEWEL_H);
  const mid = w - 2 * capW;
  return `  <g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${TILE_BLUE}"/>
${jewelPanel(body, `${prefix}-capL`, 0, CAP, x, capW, h)}
${jewelPanel(body, `${prefix}-mid`, CAP, midW, x + capW, mid, h)}
${jewelPanel(body, `${prefix}-capR`, JEWEL_W - CAP, CAP, x + w - capW, capW, h)}
  </g>`;
}

// --- the MJ monogram --------------------------------------------------------
// Letter-spacing and cap height are quoted as fractions of the cap height (em)
// so the settings read the same way the CSS does.
function monogram({ cap = 0.72, track = 0.035, jDrop = 0, cx, cy }) {
  const glyphs = font.getPath('M', 0, 0, EM).getBoundingBox();
  const advM = font.getAdvanceWidth('M', EM);
  const advJ = font.getAdvanceWidth('J', EM);
  const jx = advM + track * EM;
  const jy = -jDrop * EM;
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
  };
}

// The logo's rim is 0.05em around the glyph; a stroke of half that sits centred
// on the outline, so 0.05em of black lands outside the letter. The soft lower
// shadow is the 0.05/0.07em 0.06em pair in logo.css.
function mj(prefix, opts, { rim = 0.10, soft = true } = {}) {
  const m = monogram(opts);
  const capPx = m.h; // cap height is the scale reference for the em fractions
  const stroke = (rim * capPx) / m.s;
  const softStroke = stroke * 1.4;
  const dy = (0.07 * capPx) / m.s;
  const parts = [];
  if (soft) {
    parts.push(
      `  <path d="${m.d}" transform="${m.transform} translate(${(0.05 * capPx) / m.s} ${dy})" fill="none" stroke="#000000" stroke-width="${softStroke.toFixed(1)}" stroke-linejoin="round" opacity="0.35"/>`,
      `  <path d="${m.d}" transform="${m.transform} translate(${(-0.05 * capPx) / m.s} ${dy})" fill="none" stroke="#000000" stroke-width="${softStroke.toFixed(1)}" stroke-linejoin="round" opacity="0.35"/>`,
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

function svg(label, prefix, body, { octagon = false } = {}) {
  const jewel = gameJewel(prefix);
  // The jewel fills most of the tile; the narrow margin is where the sparkle
  // overflows into, so it does not read as dead space.
  const tile = octagon
    ? { x: 48, y: 48, w: 416, h: 416 }
    : { x: 40, y: 40, w: 432, h: 432 };
  const cut = tile.w * 0.3;
  const octPoints = octagon
    ? [
        [tile.x + cut, tile.y], [tile.x + tile.w - cut, tile.y],
        [tile.x + tile.w, tile.y + cut], [tile.x + tile.w, tile.y + tile.h - cut],
        [tile.x + tile.w - cut, tile.y + tile.h], [tile.x + cut, tile.y + tile.h],
        [tile.x, tile.y + tile.h - cut], [tile.x, tile.y + cut],
      ].map((p) => p.join(',')).join(' ')
    : null;
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
    ${octPoints ? `<clipPath id="${prefix}-oct"><polygon points="${octPoints}"/></clipPath>` : ''}
${jewel.defs}
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#${prefix}-bg)"/>
  <g clip-path="url(#${prefix}-frame)">
    <g${octagon ? ` clip-path="url(#${prefix}-oct)"` : ''}>
${nineSlice(prefix, tile.x, tile.y, tile.w, tile.h, jewel.body)}
    </g>
${body}
  </g>
</svg>
`;
}

// --- candidates -------------------------------------------------------------
// Cap heights are fractions of the 512 tile; the jewel face inside the tile is
// about 0.78 of its height, so 0.30 reads as a large but not crowded monogram.
const SMALL = { cap: 0.30 * 512, track: 0.035, cx: 256, cy: 256 };

writeFileSync(join(here, '01-blue-gem-mj.svg'), svg(
  'Blue jewel with gold MJ monogram',
  'a',
  `${mj('a', SMALL)}
${sparkle('a', 430, 430, 74)}`,
));

writeFileSync(join(here, '02-blue-gem-mj-lower-j.svg'), svg(
  'Blue jewel with gold MJ monogram, J dropped',
  'b',
  `${mj('b', { ...SMALL, jDrop: 0.02 })}
${sparkle('b', 430, 430, 74)}`,
));

writeFileSync(join(here, '03-blue-gem-mj-octagon.svg'), svg(
  'Blue octagonal jewel with gold MJ monogram',
  'c',
  `${mj('c', SMALL)}
${sparkle('c', 420, 420, 68)}`,
  { octagon: true },
));

writeFileSync(join(here, '04-blue-gem-mj-plain.svg'), svg(
  'Blue jewel with gold MJ monogram, no sparkle',
  'd',
  mj('d', SMALL),
));

console.log('Wrote 4 blue-jewel MJ candidates.');
