// Generates the blue-jewel + gold "MJ" icon candidates.
//
// The monogram is cut from the app's own logo font (Russo One, public/fonts/
// russo_one.ttf) and converted to an SVG path. Embedding the glyphs as paths
// (rather than <text> with a @font-face) means the icons render identically
// everywhere - launchers, image tags in a README/PR, and the asset generator -
// none of which fetch a webfont for a standalone SVG.
//
// Run with: node assets/icons/generate-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const here = dirname(fileURLToPath(import.meta.url));
const fontPath = join(here, '..', '..', 'public', 'fonts', 'russo_one.ttf');
const buf = readFileSync(fontPath);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

const EM = 1000;

/** "MJ" as path data plus a transform that centres it at (cx, cy) at `width`. */
function monogram(width, cx, cy) {
  const path = font.getPath('MJ', 0, 0, EM);
  const bb = path.getBoundingBox();
  const w = bb.x2 - bb.x1;
  const s = width / w;
  const mx = (bb.x1 + bb.x2) / 2;
  const my = (bb.y1 + bb.y2) / 2;
  return {
    d: path.toPathData(2),
    transform: `translate(${cx} ${cy}) scale(${s.toFixed(4)}) translate(${-mx.toFixed(2)} ${-my.toFixed(2)})`,
    height: (bb.y2 - bb.y1) * s,
  };
}

// The same emerald-cut octagons as the original red jewel, in blue.
const OUTER = '170,151 342,151 406,215 406,297 342,361 170,361 106,297 106,215';
const TABLE = '188,177 324,177 380,233 380,279 324,335 188,335 132,279 132,233';
// Four-point sparkle, the "little shine" from the earlier gem.
const sparkle = (x, y, r) =>
  `<path d="M ${x} ${y - r} Q ${x + r * 0.11} ${y - r * 0.36} ${x + r} ${y} ` +
  `Q ${x + r * 0.11} ${y + r * 0.36} ${x} ${y + r} ` +
  `Q ${x - r * 0.11} ${y + r * 0.36} ${x - r} ${y} ` +
  `Q ${x - r * 0.11} ${y - r * 0.36} ${x} ${y - r} Z" fill="#ffffff"/>`;

const defs = (p) => `
    <linearGradient id="${p}-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#232a40"/>
      <stop offset="100%" stop-color="#0c0f18"/>
    </linearGradient>
    <radialGradient id="${p}-outer" cx="34%" cy="22%" r="95%">
      <stop offset="0%" stop-color="#9cc4ff"/>
      <stop offset="42%" stop-color="#2f6fe0"/>
      <stop offset="100%" stop-color="#123a86"/>
    </radialGradient>
    <linearGradient id="${p}-table" x1="0" y1="0" x2="0.15" y2="1">
      <stop offset="0%" stop-color="#eaf2ff"/>
      <stop offset="52%" stop-color="#7fb2ff"/>
      <stop offset="100%" stop-color="#3a7ae0"/>
    </linearGradient>
    <linearGradient id="${p}-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe98a"/>
      <stop offset="55%" stop-color="#f1c101"/>
      <stop offset="100%" stop-color="#b69202"/>
    </linearGradient>
    <clipPath id="${p}-clip"><polygon points="${TABLE}"/></clipPath>`;

function svg(label, prefix, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${label}">
  <defs>${defs(prefix)}
  </defs>
${body}
</svg>
`;
}

const bg = (p) => `  <rect width="512" height="512" rx="112" fill="url(#${p}-bg)"/>`;
const jewel = (p) => `  <polygon points="${OUTER}" fill="url(#${p}-outer)"/>
  <polygon points="${TABLE}" fill="url(#${p}-table)"/>`;

// --- 01: gold MJ on the blue table, sparkle top-right -----------------------
{
  const m = monogram(200, 256, 258);
  writeFileSync(join(here, '01-blue-gem-mj.svg'), svg(
    'Blue jewel with gold MJ monogram',
    'a',
    `${bg('a')}
${jewel('a')}
  <g clip-path="url(#a-clip)">
    <ellipse cx="200" cy="180" rx="150" ry="46" fill="#ffffff" opacity="0.18"/>
  </g>
  <path d="${m.d}" transform="${m.transform} translate(4 5)" fill="#0b2a63" opacity="0.45"/>
  <path d="${m.d}" transform="${m.transform}" fill="url(#a-gold)"/>
${sparkle(404, 128, 34)}
${sparkle(352, 168, 14)}`,
  ));
}

// --- 02: larger, text-forward monogram --------------------------------------
{
  const m = monogram(244, 256, 258);
  writeFileSync(join(here, '02-blue-gem-mj-large.svg'), svg(
    'Blue jewel with large gold MJ monogram',
    'b',
    `${bg('b')}
${jewel('b')}
  <g clip-path="url(#b-clip)">
    <ellipse cx="196" cy="176" rx="160" ry="44" fill="#ffffff" opacity="0.16"/>
  </g>
  <path d="${m.d}" transform="${m.transform} translate(4 5)" fill="#0b2a63" opacity="0.45"/>
  <path d="${m.d}" transform="${m.transform}" fill="url(#b-gold)"/>
${sparkle(410, 120, 30)}`,
  ));
}

// --- 03: embossed / faceted - gold MJ with a gold rim on the jewel ----------
{
  const m = monogram(200, 256, 258);
  writeFileSync(join(here, '03-blue-gem-mj-embossed.svg'), svg(
    'Blue faceted jewel with embossed gold MJ monogram',
    'c',
    `${bg('c')}
${jewel('c')}
  <polygon points="${TABLE}" fill="none" stroke="url(#c-gold)" stroke-width="7" opacity="0.85"/>
  <g clip-path="url(#c-clip)">
    <ellipse cx="200" cy="180" rx="150" ry="46" fill="#ffffff" opacity="0.16"/>
    <path d="M 132 279 L 188 335" stroke="#ffffff" stroke-width="3" opacity="0.25"/>
    <path d="M 380 279 L 324 335" stroke="#0b2a63" stroke-width="3" opacity="0.25"/>
  </g>
  <path d="${m.d}" transform="${m.transform} translate(4 5)" fill="#0b2a63" opacity="0.5"/>
  <path d="${m.d}" transform="${m.transform}" fill="url(#c-gold)"/>
${sparkle(404, 128, 30)}`,
  ));
}

// --- 04: flat and minimal - no sparkle, gloss band only ---------------------
{
  const m = monogram(200, 256, 258);
  writeFileSync(join(here, '04-blue-gem-mj-flat.svg'), svg(
    'Blue jewel with gold MJ monogram, flat',
    'd',
    `${bg('d')}
${jewel('d')}
  <g clip-path="url(#d-clip)">
    <polygon points="132,177 380,177 380,214 132,246" fill="#ffffff" opacity="0.20"/>
  </g>
  <path d="${m.d}" transform="${m.transform} translate(3 4)" fill="#0b2a63" opacity="0.4"/>
  <path d="${m.d}" transform="${m.transform}" fill="url(#d-gold)"/>`,
  ));
}

console.log('Wrote 4 blue-jewel MJ candidates.');
