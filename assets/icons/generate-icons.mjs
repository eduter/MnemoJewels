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

// --- faithful monogram placement --------------------------------------------
// Taken straight from the tuned reference (assets/icons/jewel-mj.html):
//   .letters { top: 93px; left: 104px; font-size: 231px }
//   .letter.j { top: 56px; left: -79px }
// The letter box is placed at (left, top) with line-height:1; Russo One's
// ascender is 0.926em, so the baseline sits that far below the box top.
const FONT_SIZE = 231;
const ASCENT = font.ascender / font.unitsPerEm;
const M_ORIGIN = { x: 104, y: 93 + ASCENT * FONT_SIZE };
// The two spans in the reference are separated by a newline, which collapses to a
// single space — so the J's natural x is the M's origin plus the M's advance plus
// one space. Missing that space is a ~69px error. The reference then shifts the J
// left 79px and down 56px.
const J_ORIGIN = {
  x: M_ORIGIN.x + font.getAdvanceWidth('M', FONT_SIZE) + font.getAdvanceWidth(' ', FONT_SIZE) - 79,
  y: M_ORIGIN.y + 56,
};

// jewel.svg already chamfers its own corners: in the 610x140 gem the bevel runs
// from (24,0) to (0,24). The nine-slice scales the caps uniformly (480/140), so
// on the icon that bevel sits at 24 * 480/140 = ~82px. Cutting the blue on that
// same line is what makes the corner read as the jewel's own facet rather than a
// second, shallower edge floating over it.
const CORNER = Math.round(24 * (JEWEL_SIZE / JEWEL_H));
const JEWEL_MIN = JEWEL_X;
const JEWEL_MAX = JEWEL_X + JEWEL_SIZE;

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
// Two separate glyph paths at the font's own size, placed exactly where the
// reference CSS puts them: the M at M_ORIGIN, the J offset by J_OFFSET. Keeping
// them apart (rather than unioning) is what lets the SVG reproduce all eight
// logo shadows: the two gold-coloured ones fall between the letters and would be
// overpainted if the two fills were merged into one path.
// The logo's text-shadow stack (stylesheet/logo.css), in declaration order.
// CSS paints the first shadow on top, so the SVG draws them reversed (later
// siblings paint on top) using each entry's own drop-shadow filter, which
// reproduces CSS's per-shadow blur exactly. The two entries between the glyph
// and its gold are kept in place rather than merged away.
const LOGO_SHADOWS = [
  [-0.02, -0.02, 0.02, '#b69202'],
  [0.01, 0.01, 0.02, '#b69202'],
  [-0.05, -0.05, 0, '#000'],
  [-0.05, 0.05, 0, '#000'],
  [0.05, -0.05, 0, '#000'],
  [0.05, 0.05, 0, '#000'],
  [0.05, 0.07, 0.06, '#000'],
  [-0.05, 0.07, 0.06, '#000'],
];

function monogram() {
  const m = font.getPath('M', M_ORIGIN.x, M_ORIGIN.y, FONT_SIZE).toPathData(2);
  const j = font.getPath('J', J_ORIGIN.x, J_ORIGIN.y, FONT_SIZE).toPathData(2);
  const em = FONT_SIZE;
  const glyphs = `    <path d="${m}" fill="#f1c101"/>\n    <path d="${j}" fill="#f1c101"/>`;
  const layers = [];
  for (const [dx, dy, blur, color] of [...LOGO_SHADOWS].reverse()) {
    const style = `filter:drop-shadow(${(dx * em).toFixed(2)}px ${(dy * em).toFixed(2)}px ${(blur * em).toFixed(2)}px ${color})`;
    layers.push(`  <g style="${style}">\n${glyphs}\n  </g>`);
  }
  // The gold fill goes on top of everything shadowed.
  layers.push(`  <path d="${m}" fill="#f1c101"/>\n  <path d="${j}" fill="#f1c101"/>`);
  return layers.join('\n');
}

// The blue jewel's octagon outline: a 480px square with each corner cut by
// CORNER on the diagonal.
function octagon(id) {
  const a = JEWEL_MIN;
  const b = JEWEL_MAX;
  const c = CORNER;
  return `  <clipPath id="${id}"><path d="M${a + c} ${a} H${b - c} L${b} ${a + c} V${b - c} L${b - c} ${b} H${a + c} L${a} ${b - c} V${a + c} Z"/></clipPath>`;
}

// A jewel-only SVG (no monogram, no background) for the standalone HTML scratch
// pad: the same square nine-slice, so the letters can be positioned over it in CSS.
function standaloneJewel() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Square blue jewel">
  <defs>
${scrub(JEWEL_DEFS, 'j')}
${octagon('j-oct')}
  </defs>
  <g clip-path="url(#j-oct)">
${nineSlice('j', JEWEL_X, JEWEL_Y, JEWEL_SIZE, JEWEL_SIZE)}
${sparkle('j', 1.6)}
  </g>
</svg>
`;
}

function svg(label, prefix, { sparkleOnTop = false }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="${prefix}-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#171c2b"/>
      <stop offset="100%" stop-color="#0c0f18"/>
    </linearGradient>
    <clipPath id="${prefix}-frame"><rect width="512" height="512" rx="112"/></clipPath>
${octagon(`${prefix}-oct`)}
${scrub(JEWEL_DEFS, prefix)}
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#${prefix}-bg)"/>
  <g clip-path="url(#${prefix}-frame)">
    <g clip-path="url(#${prefix}-oct)">
${nineSlice(prefix, JEWEL_X, JEWEL_Y, JEWEL_SIZE, JEWEL_SIZE)}
${sparkleOnTop ? '' : `${sparkle(prefix, 1.6)}\n`}    </g>
${monogram()}
${sparkleOnTop ? `${sparkle(prefix, 1.6)}\n` : ''}  </g>
</svg>
`;
}
// jewel-square.svg backs the hand-tuned reference in jewel-mj.html, which is
// edited by hand — the generator never writes that HTML.
writeFileSync(join(here, 'jewel-square.svg'), standaloneJewel());

// --- the two faithful versions ----------------------------------------------
// Identical except for the sparkle's layer: `01` leaves the jewel's own shine
// where it sits in the gem; `02` floats it over everything, monogram included.
writeFileSync(join(here, '01-blue-gem-mj.svg'), svg(
  'Blue jewel with gold MJ monogram',
  'a',
  { sparkleOnTop: false },
));

writeFileSync(join(here, '02-blue-gem-mj-sparkle-top.svg'), svg(
  'Blue jewel with gold MJ monogram, sparkle on top',
  'b',
  { sparkleOnTop: true },
));

console.log('Wrote the two blue-jewel MJ versions.');
