import { defineConfig, loadEnv } from 'vite'
import federation from '@originjs/vite-plugin-federation'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const KEYSTORE_MODULE_URL = env.VITE_KEYSTORE_MODULE_URL || 'http://localhost:3001/assets/remoteEntry.js';

  return {
    plugins: [
      federation({
        name: 'pds_module',
        filename: 'remoteEntry.js',
        exposes: {
          './logic': './src/logic.ts',
          './constants': './src/constants.ts',
        },
        remotes: {
          keystore: KEYSTORE_MODULE_URL,
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
      target: 'esnext',
      cssCodeSplit: false
    }
  }
})
