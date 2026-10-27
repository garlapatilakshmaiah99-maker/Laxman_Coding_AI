
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: ['favicon.ico'],

      manifest: {
        name: 'Laxman Coding AI',
        short_name: 'Laxman AI',
        description:
          'Your personal offline AI coding assistant.',
        theme_color: '#0b1020',
        background_color: '#0b1020',
        display: 'standalone',
        scope: '/',
        start_url: '/',
      },

      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff2}',
        ],

        // Allow the 6 MB browser AI bundle to be cached.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,

        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
});
