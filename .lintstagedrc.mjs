import { createEslintFixCommand } from './scripts/lint-staged/eslint-task.mjs';

const ESLINT_GLOB = '{*.{js,jsx,vue,ts,tsx},!(out)/**/*.{js,jsx,vue,ts,tsx}}';

export default {
  [ESLINT_GLOB]: (files) => createEslintFixCommand(files),
};
