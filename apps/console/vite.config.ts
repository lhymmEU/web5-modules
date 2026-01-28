import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  const DID_MODULE_URL = env.DID_MODULE_URL || 'http://localhost:3002/assets/remoteEntry.js';
  const PDS_MODULE_URL = env.PDS_MODULE_URL || 'http://localhost:3003/assets/remoteEntry.js';
  const KEYSTORE_MODULE_URL = env.KEYSTORE_MODULE_URL || 'http://localhost:3001/assets/remoteEntry.js';

  return {
    plugins: [
      react(),
      federation({
        name: 'console_host',
        remotes: {
          did_module: DID_MODULE_URL,
          pds_module: PDS_MODULE_URL,
          keystore: KEYSTORE_MODULE_URL,
        },
        shared: {
          '@ckb-ccc/ccc': {
            version: '0.0.0-canary-20260109065952'
          },
          'web5-api': {
            version: '0.0.27'
          }
        }
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
  }
})
