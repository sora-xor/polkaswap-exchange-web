import js from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier/recommended';
import pluginPromise from 'eslint-plugin-promise';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import ts from 'typescript-eslint';

export default [
  {
    files: [
      'src/**/*.js',
      'src/**/*.cjs',
      'src/**/*.mjs',
      'src/**/*.ts',
      'src/**/*.cts',
      'src/**/*.mts',
      'src/**/*.vue',
    ],
  },

  {
    ignores: [
      'node_modules/',
      'dist/**/*',
      'out/**/*',
      'packages/**',
      'vendor/**',
      '*.config.js',
      '.ipfs-workspace/**',
      // Vendored wallet bundle (compiled .mjs chunks) takes minutes to lint and should stay untouched.
      'src/lib/soraneo-wallet/lib/**',
    ],
  },

  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  pluginPromise.configs['flat/recommended'],
  {
    rules: {
      'promise/always-return': 'off',
      'promise/catch-or-return': 'off',
      'promise/param-names': 'off',
    },
  },

  pluginImport.flatConfigs.recommended,
  {
    rules: {
      'import/named': 'off',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-unresolved': 'off',
      'import/order': 'off',
    },
  },

  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-empty': 'off',
      'no-unused-expressions': 'off',
      'no-redeclare': 'off',
      'no-control-regex': 'off',
      'no-case-declarations': 'off',
      'no-var': 'off',
      'prefer-const': 'off',
    },
  },

  ...ts.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['off'],
      '@typescript-eslint/no-explicit-any': ['off'],
      '@typescript-eslint/explicit-function-return-type': ['off'],
      '@typescript-eslint/no-use-before-define': ['off'],
      '@typescript-eslint/no-empty-function': ['off'],
      '@typescript-eslint/no-var-requires': ['off'],
      '@typescript-eslint/no-wrapper-object-types': ['off'],
      '@typescript-eslint/no-unused-expressions': ['off'],
      '@typescript-eslint/no-require-imports': ['off'],
      '@typescript-eslint/no-this-alias': ['off'],
      '@typescript-eslint/no-empty-object-type': ['off'],
      '@typescript-eslint/no-duplicate-enum-values': ['off'],
      '@typescript-eslint/no-unsafe-function-type': ['off'],
      '@typescript-eslint/no-non-null-asserted-optional-chain': ['off'],
    },
  },
  {
    files: [
      'src/app/**/*.{ts,tsx,vue}',
      'src/platform/**/*.{ts,tsx,vue}',
      'src/security/**/*.{ts,tsx,vue}',
      'src/services/realtime/**/*.{ts,tsx,vue}',
      'src/shared/**/*.{ts,tsx,vue}',
      'src/features/bridge/**/*.{ts,tsx,vue}',
      'src/features/wallet/**/*.{ts,tsx,vue}',
      'src/stores/bridge/**/*.{ts,tsx,vue}',
      'src/stores/wallet/**/*.{ts,tsx,vue}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': ['error'],
    },
  },
  {
    rules: {
      'prefer-const': 'off',
      'no-var': 'off',
    },
  },

  // vue
  ...vue.configs['flat/recommended'],
  {
    files: ['*.vue', '**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
  },
  {
    rules: {
      'vue/html-closing-bracket-newline': [
        'error',
        {
          singleline: 'never',
          multiline: 'always',
        },
      ],
      'vue/html-indent': ['warn', 2],
      'vue/no-v-html': 'off',
      'vue/v-slot-style': 'off',
      'vue/attributes-order': 'off',
      'vue/no-template-shadow': 'off',
      'vue/no-deprecated-slot-attribute': 'off',
      'vue/no-v-model-argument': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      'vue/order-in-components': 'off',
      'vue/no-side-effects-in-computed-properties': 'off',
      'vue/no-deprecated-dollar-listeners-api': 'off',
    },
  },
  {
    files: ['tests/**/*.{js,ts,tsx,vue}'],
    rules: {
      'vue/one-component-per-file': 'off',
      'vue/require-prop-types': 'off',
    },
  },
  {
    files: ['src/lib/soramitsu-ui/components/Skeleton/index.ts'],
    rules: {
      'vue/one-component-per-file': 'off',
    },
  },

  // prettier
  prettier,
  {
    rules: {
      'prettier/prettier': 'warn',
    },
  },
];
