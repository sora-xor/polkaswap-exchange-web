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
    ignores: ['node_modules/', 'dist/**/*'],
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
    },
  },

  pluginImport.flatConfigs.recommended,
  {
    rules: {
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-unresolved': 'off',
      'import/order': [
        'error',
        {
          'newlines-between': 'always',

          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },

          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
            },
          ],
          // Uncomment this line, to group all types imports at the end
          // pathGroupsExcludedImportTypes: ['type'],

          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        },
      ],
    },
  },

  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-empty': 'off',
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
    },
  },

  // vue
  ...vue.configs['flat/vue2-recommended'],
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
