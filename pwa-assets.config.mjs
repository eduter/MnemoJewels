import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// The app sits on a dark background (see stylesheet/main.css), so the maskable
// and Apple icons pad the jewel onto the same near-black navy instead of the
// generator's default white. Transparent icons keep the rounded tile on
// transparency so the icon shape is preserved on any launcher.
const DARK = '#0c0f18';

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
    basePath: '/MnemoJewels/',
  },
  preset: {
    ...minimal2023Preset,
    transparent: {
      sizes: [64, 192, 512],
      favicons: [[48, 'favicon.ico']],
      // The icon already carries its own margin (the jewel fills ~85% of the
      // canvas), so no extra padding here.
      padding: 0,
      resizeOptions: { fit: 'contain', background: 'transparent' },
    },
    maskable: {
      sizes: [512],
      padding: 0.2,
      resizeOptions: { fit: 'contain', background: DARK },
    },
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: { fit: 'contain', background: DARK },
    },
  },
});
