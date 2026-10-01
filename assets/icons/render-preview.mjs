// Renders the icon candidates in assets/icons/ to PNG previews so they can be
// compared at real PWA sizes. Run with: node assets/icons/render-preview.mjs
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const names = (await readdir(here)).filter(f => f.endsWith('.svg')).sort();

async function raster(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

async function circular(svg, size) {
  const icon = await raster(svg, size);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
  return sharp(icon).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

// Contact sheet: a grid of candidates, each shown at 192px plus a 96px
// circular (maskable) crop.
const ICON = 192;
const CIRCLE = 96;
const CELL_W = 320;
const CELL_H = 270;
const COLS = 3;
const PAD = 24;
const rows = Math.ceil(names.length / COLS);
const sheetW = PAD + COLS * CELL_W + PAD;
const sheetH = PAD + rows * CELL_H + PAD;
const parts = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}" viewBox="0 0 ${sheetW} ${sheetH}">`,
  `<rect width="${sheetW}" height="${sheetH}" fill="#15161a"/>`,
];
for (let i = 0; i < names.length; i++) {
  const svg = await readFile(join(here, names[i]), 'utf8');
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = PAD + col * CELL_W;
  const y = PAD + row * CELL_H;
  const icon = await raster(svg, ICON);
  const circle = await circular(svg, CIRCLE);
  parts.push(`<text x="${x}" y="${y + 22}" fill="#f1c101" font-family="sans-serif" font-size="20" font-weight="bold">${names[i]}</text>`);
  parts.push(`<image x="${x}" y="${y + 34}" width="${ICON}" height="${ICON}" href="data:image/png;base64,${icon.toString('base64')}"/>`);
  parts.push(`<image x="${x + ICON + 16}" y="${y + 82}" width="${CIRCLE}" height="${CIRCLE}" href="data:image/png;base64,${circle.toString('base64')}"/>`);
  parts.push(`<text x="${x + ICON + 16}" y="${y + 200}" fill="#c8c864" font-family="sans-serif" font-size="15">maskable</text>`);
}
parts.push('</svg>');
await writeFile(join(here, 'contact-sheet.png'), await sharp(Buffer.from(parts.join(''))).png().toBuffer());

// Self-contained HTML gallery (references the SVGs next to it).
const sections = names.map(name => `
    <section>
      <h2>${name}</h2>
      <div class="row">
        ${[48, 64, 96, 192, 512].map(s => `<img src="${name}" width="${s}" height="${s}" alt="">`).join('\n        ')}
      </div>
      <div class="row maskable">
        <div class="mask"><img src="${name}" alt=""></div>
        <span>maskable / circular crop</span>
      </div>
    </section>`).join('\n');
await writeFile(join(here, 'preview.html'), `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>MnemoJewels icon candidates</title>
<style>
  body { margin: 0; padding: 32px; background: #15161a; color: #e8e8e8; font-family: sans-serif; }
  h1 { color: #f1c101; }
  section { border-top: 1px solid #333; padding: 16px 0; }
  h2 { font-size: 16px; color: #c8c864; font-weight: normal; }
  .row { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
  .maskable { align-items: center; margin-top: 16px; color: #999; }
  .mask { width: 192px; height: 192px; border-radius: 50%; overflow: hidden; outline: 2px dashed #555; }
  .mask img { width: 100%; height: 100%; }
</style></head>
<body>
  <h1>MnemoJewels icon candidates</h1>
${sections}
</body></html>
`);

console.log(`Rendered ${names.length} candidates -> preview.html, contact-sheet.png`);
