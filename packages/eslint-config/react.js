import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import baseConfig from './base.js'

/**
 * Returns ESLint config for React apps with optional TypeScript project-aware linting.
 * @param {{ tsconfigRootDir?: string }} [options]
 * @returns {import('typescript-eslint').ConfigArray}
 */
export default function reactConfig(options = {}) {
  return [
    ...baseConfig,
    {
      files: ['**/*.{ts,tsx}'],
      extends: [
        reactHooks.configs.flat.recommended,
        reactRefresh.configs.vite,
      ],
      languageOptions: {
        parserOptions: options.tsconfigRootDir
          ? {
              project: ['./tsconfig.app.json', './tsconfig.node.json'],
              tsconfigRootDir: options.tsconfigRootDir,
            }
          : undefined,
      },
    },
  ]
}
