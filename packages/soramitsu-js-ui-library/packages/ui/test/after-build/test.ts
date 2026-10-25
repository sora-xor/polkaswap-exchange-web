import { test, expect } from 'vitest'
import path from 'path'
import fs from 'fs'

const resolve = (...paths: string[]) => path.resolve(__dirname, ...paths)

const ESM_TREE_SHAKING_TEST_LIB_DIR = 'esm-tree-shaking-test-lib'
const LIB_BUNDLE_ESM_FILE = resolve('../../dist/lib.mjs')
const LIB_BUNDLE_CJS_FILE = resolve('../../dist/lib.cjs')

test('ESM build should be tree-shakeable', async () => {
  const { build } = await import('vite')

  await build({
    root: resolve(ESM_TREE_SHAKING_TEST_LIB_DIR),
    build: {
      lib: {
        entry: 'entry.ts',
        formats: ['es'],
        fileName: 'output',
      },
      rollupOptions: {
        // there is no need to check whether Vue itself is tree-shakeable
        external: ['vue'],
      },
      minify: false,
    },
  })

  const outputContents = fs.readFileSync(resolve(ESM_TREE_SHAKING_TEST_LIB_DIR, 'dist/output.mjs'), {
    encoding: 'utf-8',
  })

  expect(outputContents).toMatchInlineSnapshot(`
    "function somePureFunction() {
      return 42;
    }
    console.log(somePureFunction());
    "
  `)
})

test('ESM/CJS builds should not have a `data-testid` attribute', () => {
  for (const file of [LIB_BUNDLE_CJS_FILE, LIB_BUNDLE_ESM_FILE]) {
    const contents = fs.readFileSync(file, { encoding: 'utf-8' })
    expect(contents).not.toMatch(/data-testid/)
  }
})
