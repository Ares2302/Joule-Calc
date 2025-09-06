import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import manifest from './public/manifest.json'

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
})