import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import manifest from './public/manifest.json'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    VitePWA({
      manifest,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo-96x96.png', 'screenshots/*.png'],
      pwaAssets: {
        disabled: true,
      },
      includeManifestIcons: true,
      workbox: {
        // opzioni di workbox
        // Dice a Workbox di non gestire le richieste di navigazione per questi file specifici.
        // In questo modo, le richieste per sitemap, robots.txt, etc., andranno sempre alla rete,
        // risolvendo il problema del reindirizzamento a index.html con F5.
        navigateFallbackDenylist: [
          /sitemap\.xml$/,
          /robots\.txt$/,
          /ads\.txt$/,
          /google.*\.html$/, // Anche per il file di verifica di Google
        ],
      }
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        contact: resolve(__dirname, 'contact.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        guides: resolve(__dirname, 'guides.html'),
        'guida-introduttiva': resolve(__dirname, 'guides/guida-introduttiva.html'),
        'scegliere-pallini': resolve(__dirname, 'guides/scegliere-pallini.html'),
      },
    },
  },
})