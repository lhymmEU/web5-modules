import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'console_host',
      remotes: {
        did_module: 'http://localhost:3002/assets/remoteEntry.js',
        pds_module: 'http://localhost:3003/assets/remoteEntry.js',
        keystore: 'http://localhost:3001/assets/remoteEntry.js',
      },
      shared: ['@ckb-ccc/ccc', 'web5-api']
    })
  ],
  server: {
    port: 3000,
    strictPort: true,
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
  build: {
    target: 'esnext'
  }
})
