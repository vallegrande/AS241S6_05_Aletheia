/**
 * vite.dash-preview.config.js — servidor de preview del dashboard con la API
 * mockeada (src/preview/mock-client.js). No afecta al dev server normal.
 *
 * Uso:  npx vite --config vite.dash-preview.config.js
 * Luego: http://localhost:5199/preview.html
 *
 * El mock reemplaza src/lib/api/client al RESOLVER la ruta (resolveId), porque
 * los imports son relativos ('../../api/client') y un alias de texto no matchea.
 */
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { fileURLToPath } from 'node:url'
import { dirname, resolve as pathResolve } from 'node:path'

const MOCK = fileURLToPath(new URL('./src/preview/mock-client.js', import.meta.url))
const ROOT = fileURLToPath(new URL('.', import.meta.url))

function mockClientPlugin() {
  return {
    name: 'mock-api-client',
    enforce: 'pre',
    resolveId(source, importer) {
      // En Vite dev los imports llegan como '../../api/client' (importer URL,
      // no ruta de disco): se matchea el especificador relativo directamente.
      if (/^(\.\.\/)+api\/client$/.test(source.replace(/\\/g, '/'))) return MOCK
      if (importer) {
        try {
          let base = importer.replace(/^\/@fs\//, '/')
          if (/^\/src\//.test(base)) base = pathResolve(ROOT, '.' + base)
          const norm = pathResolve(dirname(base), source).replace(/\\/g, '/')
          if (/\/src\/lib\/api\/client(\.ts)?$/.test(norm)) return MOCK
        } catch {
          /* import externo: se ignora */
        }
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [svelte(), mockClientPlugin()],
  publicDir: 'static',
  server: {
    port: 5199,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
