import { defineConfig } from 'vite'
import federation from '@originjs/vite-plugin-federation'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    federation({
      name: 'pds_module',
      filename: 'remoteEntry.js',
      exposes: {
        './logic': './src/logic.ts',
        './constants': './src/constants.ts',
      },
      remotes: {
        keystore: 'http://localhost:3001/assets/remoteEntry.js',
      },
      shared: {
        'web5-api': {
          version: '0.0.27'
        }
      }
    })
  ],
  server: {
    port: 3003,
    strictPort: true,
  },
  preview: {
    port: 3003,
    strictPort: true,
  },
  build: {
    target: 'esnext'
  }
})
