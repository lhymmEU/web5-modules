import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 3001,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3001,
    strictPort: true,
  },
  define: {
    'process.env': {},
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        bridge: resolve(__dirname, 'bridge.html'),
      },
    },
  },
})
