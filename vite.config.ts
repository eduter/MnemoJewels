import dns from 'node:dns';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// Avoid localhost resolving to ::1 in WSL while the browser uses 127.0.0.1.
dns.setDefaultResultOrder('verbatim');

const BASE = '/MnemoJewels/';

const pwa = VitePWA({
  registerType: 'autoUpdate',
  includeAssets: [
    'favicon.ico',
    'icon.svg',
    'apple-touch-icon-180x180.png',
    'pwa-64x64.png',
    'pwa-192x192.png',
    'pwa-512x512.png',
    'maskable-icon-512x512.png',
  ],
  manifest: {
    id: BASE,
    name: 'MnemoJewels',
    short_name: 'MnemoJewels',
    description: 'Spaced repetition technique for vocabulary acquisition - gamified',
    theme_color: '#0c0f18',
    background_color: '#0c0f18',
    display: 'standalone',
    scope: BASE,
    start_url: BASE,
    icons: [
      { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    // App shell: everything needed to boot and play with an already-imported
    // deck. Deck JSON files are excluded on purpose (each is >1 MB, and the
    // imported cards already live in localStorage); they are cached at runtime
    // below instead.
    globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff,woff2,ttf}'],
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    runtimeCaching: [
      {
        // A deck is fetched once, when it is picked in Settings. Cache it so it
        // can be re-imported (or its cards rebuilt) without a network, and so
        // revisiting a deck you already downloaded is instant.
        urlPattern: ({ url }) => url.pathname.startsWith(`${BASE}decks/`),
        handler: 'CacheFirst',
        options: {
          cacheName: 'mnemojewels-decks',
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

export default defineConfig({
  base: BASE,
  plugins: [pwa],
  build: {
    outDir: 'dist',
  },
  server: {
    host: true,
    port: 5173,
    // Allow the sandbox preview host to reach the dev server.
    allowedHosts: ['.prod-runtime.all-hands.dev'],
  },
  preview: {
    host: true,
    port: 4173,
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.spec.ts'],
  },
});
