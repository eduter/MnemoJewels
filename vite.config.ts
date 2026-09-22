import dns from 'node:dns';
import { defineConfig } from 'vitest/config';

// Avoid localhost resolving to ::1 in WSL while the browser uses 127.0.0.1.
dns.setDefaultResultOrder('verbatim');

export default defineConfig({
  base: '/MnemoJewels/',
  build: {
    outDir: 'dist',
  },
  server: {
    host: true,
    port: 5173,
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
