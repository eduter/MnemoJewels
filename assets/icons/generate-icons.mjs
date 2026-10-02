// Generates the blue-jewel + gold "MJ" icon candidates.
//
// Two things are reused from the game rather than redrawn:
//   * the jewel face is the actual public/images/jewel.svg (the bevel/gloss/facet
//     overlay the game paints over a coloured button or tile), tinted blue;
//   * the monogram is cut from the app's logo font (Russo One) and given the same
//     thick black outline the on-screen logo uses (text-shadow in logo.css).
//
// The monogram is emitted as outlines rather than <text> with @font-face:
// standalone SVGs (launcher icons, raw GitHub image tags, the asset generator)
// do not load webfonts and would fall back to a default face.
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

// --- the game's jewel, lifted verbatim from public/images/jewel.svg ---------
const jewelSrc = readFileSync(join(root, 'public', 'images', 'jewel.svg'), 'utf8');
const JEWEL_DEFS = jewelSrc.match(/<defs[^>]*>([\s\S]*?)<\/defs>/)[1];
const JEWEL_BODY = jewelSrc.match(/<g\s+inkscape:label="Layer 1"[\s\S]*?>\n([\s\S]*?)\n  <\/g>/)[1];

// The jewel is authored on a 610x140 artboard, translated up by 912.36 on the
// layer. Drop editor-only attributes, scope the ids per icon, and tint the
// opaque corner facets (the white gradients stay white so the gloss still reads).
function gameJewel(prefix, tint) {
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
  return {
    defs: scrub(JEWEL_DEFS),
    body: scrub(JEWEL_BODY).replaceAll('fill:#ffffff', `fill:${tint}`),
  };
}

// --- the MJ monogram --------------------------------------------------------
// J is nudged down and left so its hook tucks under the M's right leg. That
// keeps the pair about as wide as it is tall - a squarer mark, which suits an
// icon better than the wide default setting.
function monogram({ size, jx = 800, jy = 120, cx, cy }) {
  const combined = new opentype.Path();
  combined.extend(font.getPath('M', 0, 0, EM));
  combined.extend(font.getPath('J', jx, jy, EM));
  const bb = combined.getBoundingBox();
  const w = bb.x2 - bb.x1;
  const s = size / w;
  const mx = (bb.x1 + bb.x2) / 2;
  const my = (bb.y1 + bb.y2) / 2;
  return {
    d: combined.toPathData(2),
    transform: `translate(${cx} ${cy}) scale(${s.toFixed(4)}) translate(${-mx.toFixed(2)} ${-my.toFixed(2)})`,
    width: w * s,
    height: (bb.y2 - bb.y1) * s,
  };
}

const OUTER = '170,151 342,151 406,215 406,297 342,361 170,361 106,297 106,215';
const TABLE = '188,177 324,177 380,233 380,279 324,335 188,335 132,279 132,233';

function svg(label, prefix, body, { octagon = false } = {}) {
  const jewel = gameJewel(prefix, '#2f6fe0');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="${prefix}-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#232a40"/>
      <stop offset="100%" stop-color="#0c0f18"/>
    </linearGradient>
    <linearGradient id="${prefix}-blue" x1="0" y1="0" x2="0.15" y2="1">
      <stop offset="0%" stop-color="#5b93ef"/>
      <stop offset="55%" stop-color="#2f6fe0"/>
      <stop offset="100%" stop-color="#1c4aa8"/>
    </linearGradient>
    <linearGradient id="${prefix}-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe98a"/>
      <stop offset="55%" stop-color="#f1c101"/>
      <stop offset="100%" stop-color="#b69202"/>
    </linearGradient>
    <clipPath id="${prefix}-clip">${octagon
      ? `<polygon points="${OUTER}"/>`
      : `<rect x="96" y="96" width="320" height="320" rx="64"/>`}</clipPath>
${jewel.defs}
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#${prefix}-bg)"/>
${octagon
    ? `  <polygon points="${OUTER}" fill="url(#${prefix}-blue)"/>`
    : `  <rect x="96" y="96" width="320" height="320" rx="64" fill="url(#${prefix}-blue)"/>`}
  <g clip-path="url(#${prefix}-clip)">
    <g transform="translate(96 96) scale(${(320 / 610).toFixed(5)} ${(320 / 140).toFixed(5)})">
      <g transform="translate(0,-912.36217)">
${jewel.body}
      </g>
    </g>
  </g>
${octagon ? `  <polygon points="${OUTER}" fill="none" stroke="#0c0f18" stroke-width="10"/>` : ''}
${body}
</svg>
`;
}

// The black outline is a stroke on the same path, scaled to the monogram, so it
// stays proportional the way the logo's text-shadow does. Painted first, it
// reads as a thick shadow behind the gold.
function mj(prefix, opts, { outline = 78, dx = 0, dy = 9 } = {}) {
  const m = monogram(opts);
  const s = Number(m.transform.match(/scale\(([\d.]+)\)/)[1]);
  return `  <path d="${m.d}" transform="${m.transform} translate(${dx / s} ${dy / s})" fill="none" stroke="#000000" stroke-width="${outline / s}" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="${m.d}" transform="${m.transform}" fill="url(#${prefix}-gold)"/>`;
}

// --- 01: the requested direction -------------------------------------------
writeFileSync(join(here, '01-blue-gem-mj.svg'), svg(
  'Blue jewel with gold MJ monogram',
  'a',
  mj('a', { size: 210, cx: 256, cy: 258 }),
));

// --- 02: larger monogram ----------------------------------------------------
writeFileSync(join(here, '02-blue-gem-mj-large.svg'), svg(
  'Blue jewel with large gold MJ monogram',
  'b',
  mj('b', { size: 250, cx: 256, cy: 258 }),
));

// --- 03: octagonal jewel face ----------------------------------------------
writeFileSync(join(here, '03-blue-gem-mj-octagon.svg'), svg(
  'Blue octagonal jewel with gold MJ monogram',
  'c',
  mj('c', { size: 200, cx: 256, cy: 258 }),
  { octagon: true },
));

// --- 04: tighter set - J tucked further under the M -------------------------
writeFileSync(join(here, '04-blue-gem-mj-tight.svg'), svg(
  'Blue jewel with tight gold MJ monogram',
  'd',
  mj('d', { size: 224, jx: 700, jy: 150, cx: 256, cy: 258 }),
));

console.log('Wrote 4 blue-jewel MJ candidates.');
