import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import sitemap from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      manifest: {
        "name": "Joule-Calc",
        "short_name": "Joule-Calc",
        "description": "Joule-Calc è un calcolatore di Joule con storico, calcolo inverso della velocità e compensazione ottica (MOA/MRAD).",
        "lang": "it",
        "dir": "ltr",
        "start_url": "/",
        "scope": "/",
        "id": "/",
        "display": "standalone",
        "display_override": [
          "window-controls-overlay"
        ],
        "orientation": "portrait",
        "theme_color": "#ffffff",
        "background_color": "#f3f4f6",
        "icons": [
          {
            "src": "/icon-192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": "/icon-512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": "/icon-192-maskable.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "maskable"
          },
          {
            "src": "/icon-512-maskable.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable"
          },
          {
            "src": "/ic_launcher_monochrome.png",
            "sizes": "432x432",
            "type": "image/png",
            "purpose": "monochrome"
          }
        ],
        "shortcuts": [
          {
            "name": "Calcola Joule",
            "short_name": "Joule",
            "description": "Apri il calcolatore di energia (Joule)",
            "url": "/#joule",
            "icons": [
              {
                "src": "/icon-192-maskable.png",
                "sizes": "192x192",
                "type": "image/png"
              }
            ]
          },
          {
            "name": "Calcola Velocità",
            "short_name": "Velocità",
            "description": "Apri il calcolatore di velocità target",
            "url": "/#velocity",
            "icons": [
              {
                "src": "/icon-192-maskable.png",
                "sizes": "192x192",
                "type": "image/png"
              }
            ]
          },
          {
            "name": "Compensa Ottica",
            "short_name": "Ottica",
            "description": "Apri il calcolatore per compensare l'ottica",
            "url": "/#compensation",
            "icons": [
              {
                "src": "/icon-192-maskable.png",
                "sizes": "192x192",
                "type": "image/png"
              }
            ]
          }
        ],
        "screenshots": [
          {
            "src": "/screenshots/screenshot-mobile.png",
            "sizes": "460x919",
            "type": "image/png",
            "form_factor": "narrow",
            "label": "Vista del calcolatore Joule su dispositivo mobile"
          },
          {
            "src": "/screenshots/screenshot-desktop.png",
            "sizes": "1323x954",
            "type": "image/png",
            "form_factor": "wide",
            "label": "Vista completa dell'app su desktop con calcolatore e storico"}
        ],
        "protocol_handlers": [
          {
            "protocol": "web+joule",
            "url": "/?url=%s"
          }
        ],
        "iarc_rating_id": "not_applicable",
        "related_applications": [],
        "prefer_related_applications": false,
        "share_target": {
          "action": "/",
          "method": "GET",
          "enctype": "application/x-www-form-urlencoded",
          "params": {
            "title": "title",
            "text": "text",
            "url": "shared_url"
          }
        },
        "launch_handler": {
          "client_mode": ["focus-existing", "navigate-new"]
        },
        "categories": ["sports", "utilities"],
        "scope_extensions": []
      },
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'logo-96x96.png',
        'screenshots/*.png',
        'sounds/click.mp3',
        '**/*.{js,css,html,png,jpg,jpeg,gif,svg,webp,mp3}' // Catch all common assets
      ],
      workbox: {
        navigateFallbackDenylist: [
          /sitemap\.xml$/,
          /robots\.txt$/,
          /ads\.txt$/,
          /google.*\.html$/,
        ],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
            },
          },
          {
            urlPattern: ({ url }) => url.origin === self.location.origin,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      }
    }),
    sitemap({ hostname: 'https://joule-calc.web.app' })
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
        'regolare-ottica': resolve(__dirname, 'guides/regolare-ottica.html'),
        'guida-hop-up': resolve(__dirname, 'guides/guida-hop-up.html'),
        glossary: resolve(__dirname, 'glossary.html'),
        'guida-cronografo': resolve(__dirname, 'guides/guida-cronografo.html'),
      },
      
    },
  },
})