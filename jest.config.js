module.exports = {
  preset: '@vue/cli-plugin-unit-jest/presets/typescript-and-babel',
  setupFiles: ['./tests/unit/setup.js'],
  verbose: true,
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/?!(@polkadot/util)'],
};
