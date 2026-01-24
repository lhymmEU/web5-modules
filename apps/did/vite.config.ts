import { defineConfig } from 'vite'
import federation from '@originjs/vite-plugin-federation'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    federation({
      name: 'did_module',
      filename: 'remoteEntry.js',
      exposes: {
        './logic': './src/logic.ts',
      },
      shared: ['@ckb-ccc/ccc']
    })
  ],
  server: {
    port: 3002,
    strictPort: true,
  },
  preview: {
    port: 3002,
    strictPort: true,
  },
  build: {
    target: 'esnext'
  }
})
