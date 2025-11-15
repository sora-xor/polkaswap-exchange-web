// The purpose of this file is to test how "exports" field in the package.json resolves
/* eslint-disable @typescript-eslint/no-require-imports */

const path = require('path')

const PKG_BASE = '@soramitsu-ui/theme'

function resolveEntry(relative = '') {
  const absPath = require.resolve(`${PKG_BASE}${relative}`)
  return path.relative(path.resolve(__dirname, '../'), absPath)
}

test.each([
  // ['', 'dist/lib.cjs.js'],
  ['/sass', 'src/sass/lib.scss'],
  ['/sass/util.scss', 'src/sass/util.scss'],
  ['/fonts/Sora', 'src/fonts/Sora/index.css'],
])('%o is mapped to %o', (alias, expected) => {
  expect(resolveEntry(alias)).toEqual(expected)
})
