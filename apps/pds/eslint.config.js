import { defineConfig, globalIgnores } from 'eslint/config'
import baseConfig from '@web5-modules/eslint-config/base'

export default defineConfig([
  globalIgnores(['dist']),
  ...baseConfig,
])
