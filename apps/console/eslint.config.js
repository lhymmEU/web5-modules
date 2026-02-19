import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactConfig from '@web5-modules/eslint-config/react'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig([
  globalIgnores(['dist']),
  ...reactConfig({ tsconfigRootDir: __dirname }),
])
