import { describe, expect, it } from 'vitest';

/** Compiles a fragment against the wallet mixins with the real Sass compiler, in a child process like the other style specs. */
function compileWalletMixin(fragment: string): string {
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

  return child.stdout ? JSON.parse(child.stdout).css : '';
}

describe('wallet focus-outline mixin', () => {
  const field = compileWalletMixin('.field { @include wallet.focus-outline($focusWithin: true, $withOffset: true); }');

  it('puts the ring of a field around the whole field, inside its edge', () => {
    expect(field).toMatch(
      /\.field:focus-within\s*\{\s*outline:\s*2px solid var\(--s-color-focus-ring, var\(--s-color-outline\)\);\s*outline-offset:\s*-2px;\s*\}/
    );
  });

  it('keeps the bare inputs inside a field from drawing the app-wide square ring as well', () => {
    // The app-wide ring has `!important`, so the override needs it too.
    expect(field).toMatch(/\.field :where\(input, textarea\):focus-visible\s*\{\s*outline:\s*none !important;\s*\}/);
  });

  it('leaves the ring of a plain focusable element as it was', () => {
    const item = compileWalletMixin('.item { @include wallet.focus-outline($borderRadius: 8px); }');

    expect(item).toMatch(
      /\.item:focus:not\(:active\)\s*\{\s*outline:\s*1px solid var\(--s-color-outline\);\s*border-radius:\s*8px;/
    );
    expect(item).not.toContain(':where(input');
  });

  it('leaves the inner ring of an icon inside a button as it was', () => {
    const icon = compileWalletMixin('i { @include wallet.focus-outline($inner: true, $borderRadius: 50%); }');

    expect(icon).toMatch(/i\s*\{\s*outline:\s*1px solid var\(--s-color-outline\);\s*border-radius:\s*50%;/);
    expect(icon).not.toContain(':where(input');
  });
});
