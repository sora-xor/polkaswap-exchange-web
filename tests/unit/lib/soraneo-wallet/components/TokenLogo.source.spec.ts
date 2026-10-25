import path from 'node:path';

import { describe, expect, it } from 'vitest';

function compileWalletMixin(fragment: string) {
  const { spawnSync } = eval('require')('node:child_process') as typeof import('node:child_process');
  const script = `const { readFileSync } = require('node:fs')
const path = require('node:path')
const sass = require('sass')

const payload = JSON.parse(readFileSync(0, 'utf8'))
const mixinsPath = path.resolve(payload.repoRoot, 'src/lib/soraneo-wallet/src/styles/_mixins.scss')

try {
  const result = sass.compileString("@use '" + mixinsPath.replace(/\\\\/g, '/') + "' as wallet;\\n" + payload.fragment, {
    style: 'expanded',
    loadPaths: [path.resolve(payload.repoRoot, 'src')],
  })

  process.stdout.write(JSON.stringify({ css: result.css }))
} catch (error) {
  process.stderr.write(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
}
`;

  const payload = JSON.stringify({ fragment, repoRoot: process.cwd() });
  const child = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', input: payload });

  if (child.status !== 0) {
    throw new Error(child.stderr || `Sass compilation failed with exit code ${child.status}`);
  }

  return child.stdout ? JSON.parse(child.stdout) : { css: '' };
}

describe('wallet asset logo styles', () => {
  it('keeps the fallback question-mark placeholder centered like production', () => {
    const result = compileWalletMixin(`
      .probe {
        @include wallet.asset-logo-styles;
      }
    `);

    expect(result.css).toContain('display: flex;');
    expect(result.css).toContain('justify-content: center;');
    expect(result.css).toContain('align-items: center;');
    expect(result.css).toContain('border-radius: 50%;');
  });
});
