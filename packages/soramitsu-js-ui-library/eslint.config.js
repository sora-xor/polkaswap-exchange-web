const { FlatCompat } = require('@eslint/eslintrc')
const vue = require('eslint-plugin-vue')
const vueAccessibility = require('eslint-plugin-vuejs-accessibility')
const cypress = require('eslint-plugin-cypress')

const sanitizeGlobals = (globals) =>
  Object.fromEntries(Object.entries(globals ?? {}).map(([key, value]) => [key.trim(), value]))

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const baseExtends = compat.extends('alloy', 'alloy/typescript')

const vueAccessibilityFlatConfig = vueAccessibility.configs['flat/recommended'].map((config) =>
  config?.languageOptions?.globals
    ? {
        ...config,
        languageOptions: {
          ...config.languageOptions,
          globals: sanitizeGlobals(config.languageOptions.globals),
        },
      }
    : config,
)

const projectConfig = compat.config({
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  globals: {
    defineProps: 'readonly',
    defineEmits: 'readonly',
    defineExpose: 'readonly',
    withDefaults: 'readonly',
  },
  rules: {
    'vue/html-indent': ['warn', 2],
    'vue/quote-props': ['warn', 'always'],
    'spaced-comment': ['error', 'always', { markers: ['/'] }],
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/no-unused-vars': ['off'],
    'vue/require-default-prop': 'off',
    'vuejs-accessibility/no-static-element-interactions': 'off',
  },
  overrides: [
    {
      files: ['**/packages/ui/**/*.{ts,vue,js}'],
      extends: ['./packages/ui/.eslintrc-auto-import.json'],
    },
    {
      files: ['**/*.spec.{js,ts}'],
      env: {
        jest: true,
      },
    },
    {
      files: ['**/packages/ui/stories/**/*.stories.ts', '**/*.cy.{js,ts}'],
      rules: {
        'vue/one-component-per-file': 'off',
      },
    },
    {
      files: ['**/packages/ui/stories/**/*.stories.ts'],
      rules: {
        '@typescript-eslint/consistent-type-assertions': 'off',
        'vue/require-prop-types': 'off',
      },
    },
    {
      files: ['**/*.spec.ts', '**/*.spec.cy.ts'],
      rules: {
        'max-nested-callbacks': 'off',
        'cypress/unsafe-to-chain-command': 'off',
      },
    },
    {
      files: ['**/ui/src/components/Select/**/*.vue'],
      rules: {
        'vuejs-accessibility/click-events-have-key-events': 'off',
      },
    },
    {
      files: ['**/STextField.vue', '**/SSwitch.vue'],
      rules: {
        'vuejs-accessibility/label-has-for': 'off',
      },
    },
    {
      files: ['eslint.config.js'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
    {
      files: ['**/scripts/**/*.cjs'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
    {
      files: ['**/components/Table/types.ts'],
      rules: {
        'max-params': 'off',
      },
    },
  ],
})

const cypressRecommended = cypress.configs.recommended
const cypressLanguageOptions = cypressRecommended.languageOptions
  ? {
      ...cypressRecommended.languageOptions,
      globals: sanitizeGlobals(cypressRecommended.languageOptions.globals),
    }
  : undefined

const cypressOverride = {
  files: ['**/cypress/**/*.{j,t}s', '**/*.cy.{js,ts}', 'cypress.config.ts'],
  plugins: cypressRecommended.plugins,
  rules: cypressRecommended.rules,
  ...(cypressLanguageOptions ? { languageOptions: cypressLanguageOptions } : {}),
}

module.exports = [
  {
    ignores: [
      'node_modules',
      'dist',
      'dist-ts',
      '**/dist/**',
      '**/dist-ts/**',
      'storybook-static',
      '**/storybook-static/**',
      'packages/ui/test/after-build/esm-tree-shaken-dist',
      'packages/ui/.cypress-cache',
      '**/.cypress-cache/**',
      'auto-imports.d.ts',
    ],
  },
  ...baseExtends,
  ...vue.configs['flat/recommended'],
  ...vueAccessibilityFlatConfig,
  cypressOverride,
  ...projectConfig,
]
