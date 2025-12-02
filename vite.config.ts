import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/sourcemap_compile/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      'source-map/lib/mappings.wasm': resolve(__dirname, 'node_modules/source-map/lib/mappings.wasm'),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  assetsInclude: ['**/*.wasm'],
})

