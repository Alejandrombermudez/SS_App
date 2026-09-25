import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Solo en `npm run dev`: sirve DB/export/ssm-export.json (datos reales, fuera del repo) para la
// pantalla de importación. `apply: 'serve'` garantiza que nunca entra al build de producción.
function devAccessExport(): Plugin {
  const file = resolve(__dirname, '../DB/export/ssm-export.json')
  return {
    name: 'dev-access-export',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dev/access-export.json', (_req, res) => {
        if (!existsSync(file)) {
          res.statusCode = 404
          res.end('No existe DB/export/ssm-export.json')
          return
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(readFileSync(file))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    devAccessExport(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Servicio Secreto de Motocicletas',
        short_name: 'SS Motos',
        description: 'Gestión de servicios, clientes y motocicletas del taller',
        theme_color: '#0A192F',
        background_color: '#020C1B',
        lang: 'es',
        id: '/',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // La librería de PDF es grande y solo se usa al descargar: no se precachea en la
        // instalación, se guarda la primera vez que se usa.
        globIgnores: ['**/InvoicePdf-*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js'),
            handler: 'CacheFirst',
            options: { cacheName: 'lazy-chunks', expiration: { maxEntries: 30 } },
          },
        ],
      },
    }),
  ],
})
