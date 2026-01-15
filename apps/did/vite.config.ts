import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'did_module',
      filename: 'remoteEntry.js',
      exposes: {
        './logic': './src/logic.ts',
      },
      shared: ['react', 'react-dom']
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
