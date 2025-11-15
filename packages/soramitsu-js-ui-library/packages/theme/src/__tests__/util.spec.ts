import { describe, expect, test } from '@jest/globals'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

function compile(fragment: string) {
  const script = `const { readFileSync } = require('node:fs')
const path = require('node:path')
const sass = require('sass')

const payload = JSON.parse(readFileSync(0, 'utf8'))
const loadPath = path.resolve(payload.cwd, '../sass')

try {
  const result = sass.compileString("@use 'util' as util;\\n" + payload.fragment, {
    style: 'expanded',
    loadPaths: [loadPath],
  })

  process.stdout.write(JSON.stringify({ css: result.css }))
} catch (error) {
  process.stderr.write(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
}
`

  const payload = JSON.stringify({ fragment, cwd: __dirname })
  const child = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', input: payload })

  if (child.status !== 0) {
    throw new Error(child.stderr || `Sass compilation failed with exit code ${child.status}`)
  }

  return child.stdout ? JSON.parse(child.stdout) : { css: '' }
}

describe('map-filter-non-null-values', () => {
  test('keeps null entries only', () => {
    const result = compile(`
      @use 'sass:meta';
      $values: (
        'keep': null,
        'drop-string': '',
        'drop-zero': 0,
        'drop-false': false,
      );

      $filtered: util.map-filter-non-null-values($values);
      :root { content: meta.inspect($filtered); }
    `)

    expect(result.css).toContain('"keep": null')
    expect(result.css).not.toContain('drop-string')
    expect(result.css).not.toContain('drop-zero')
    expect(result.css).not.toContain('drop-false')
  })

  test('ignores already empty maps', () => {
    const result = compile(`
      @use 'sass:meta';
      $values: ();
      $filtered: util.map-filter-non-null-values($values);
      :root { content: meta.inspect($filtered); }
    `)

    expect(result.css).toContain('()')
  })
})
