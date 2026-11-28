import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

/** Exercise the installed consumer's own dependency resolution outside Vite's aliases. */
function runGlobProbe<T>(source: string): T {
  return JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '--eval', source], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 10_000,
    })
  ) as T;
}

describe('js-beautify scoped matcher upgrades', () => {
  it('formats nested JavaScript matches with EditorConfig while preserving excluded directories and other extensions', () => {
    const result = runGlobProbe<{ formatted: string[]; excluded: string[]; untouched: string }>(`
      import { execFileSync } from 'node:child_process';
      import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
      import { tmpdir } from 'node:os';
      import { dirname, join } from 'node:path';
      import { createRequire } from 'node:module';
      const require = createRequire(import.meta.url);
      const packagePath = require.resolve('js-beautify/package.json');
      const manifest = require(packagePath);
      const cli = join(dirname(packagePath), manifest.bin['js-beautify']);
      const root = mkdtempSync(join(tmpdir(), 'polkaswap-glob-format-'));
      const original = 'function value(){return 1;}';
      const matched = ['first.js', 'nested/second.js'];
      const excluded = ['node_modules/ignored.js', '.git/ignored.js'];
      try {
        writeFileSync(join(root, '.editorconfig'), [
          'root = true', '[*.js]', 'indent_style = space', 'indent_size = 2', 'insert_final_newline = true',
        ].join('\\n'));
        for (const file of [...matched, ...excluded, 'nested/keep.txt']) {
          const path = join(root, file);
          mkdirSync(dirname(path), { recursive: true });
          writeFileSync(path, original);
        }
        execFileSync(process.execPath, [cli, '--replace', '--editorconfig', '**/*.js'], {
          cwd: root, encoding: 'utf8', timeout: 5_000,
        });
        console.log(JSON.stringify({
          formatted: matched.map(file => readFileSync(join(root, file), 'utf8')),
          excluded: excluded.map(file => readFileSync(join(root, file), 'utf8')),
          untouched: readFileSync(join(root, 'nested/keep.txt'), 'utf8'),
        }));
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    `);

    expect(result.formatted).toHaveLength(2);
    for (const source of result.formatted) expect(source.trim()).toBe('function value() {\n  return 1;\n}');
    expect(result.excluded).toEqual(['function value(){return 1;}', 'function value(){return 1;}']);
    expect(result.untouched).toBe('function value(){return 1;}');
  });

  it.each(['parse', 'parseSync'])(
    'preserves EditorConfig brace matches, relative paths and nested overrides using %s',
    (api) => {
      const result = runGlobProbe<Record<string, Record<string, string | number | boolean>>>(`
      import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
      import { tmpdir } from 'node:os';
      import { join } from 'node:path';
      import { createRequire } from 'node:module';
      const require = createRequire(import.meta.url);
      const consumerRequire = createRequire(require.resolve('js-beautify/package.json'));
      const editorconfig = consumerRequire('editorconfig');
      const root = mkdtempSync(join(tmpdir(), 'polkaswap-editorconfig-'));
      try {
        mkdirSync(join(root, 'src/nested'), { recursive: true });
        mkdirSync(join(root, 'src/generated'), { recursive: true });
        writeFileSync(join(root, '.editorconfig'), [
          'root = true',
          '[*]', 'charset = utf-8', 'indent_style = space', 'indent_size = 2',
          '[*.{js,ts}]', 'indent_size = 4',
          '[src/**]', 'end_of_line = lf',
          '[src/generated/**]', 'indent_size = unset', 'trim_trailing_whitespace = false',
        ].join('\\n'));
        writeFileSync(join(root, 'src/nested/.editorconfig'), '[*.ts]\\nindent_size = 3\\n');
        const settings = {};
        for (const file of ['main.js', 'src/view.ts', 'src/nested/view.ts', 'src/generated/bundle.js', 'notes.txt']) {
          settings[file] = await editorconfig.${api}(join(root, file), { unset: true });
        }
        console.log(JSON.stringify(settings));
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    `);

      const base = { charset: 'utf-8', indent_style: 'space' };
      expect(result).toEqual({
        'main.js': { ...base, indent_size: 4, tab_width: 4 },
        'src/view.ts': { ...base, indent_size: 4, tab_width: 4, end_of_line: 'lf' },
        'src/nested/view.ts': { ...base, indent_size: 3, tab_width: 3, end_of_line: 'lf' },
        'src/generated/bundle.js': { ...base, end_of_line: 'lf', trim_trailing_whitespace: false },
        'notes.txt': { ...base, indent_size: 2, tab_width: 2 },
      });
    }
  );

  it.each(['glob', 'globStream'])('stops %s directory traversal when cancellation arrives during a read', (api) => {
    const result = runGlobProbe<{ message: string; reads: number; readsAfterAbort: number }>(`
      import fs from 'node:fs';
      import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
      import { tmpdir } from 'node:os';
      import { join } from 'node:path';
      import { createRequire } from 'node:module';
      const require = createRequire(import.meta.url);
      const consumerRequire = createRequire(require.resolve('js-beautify/package.json'));
      const { ${api} } = consumerRequire('glob');
      const root = mkdtempSync(join(tmpdir(), 'polkaswap-glob-abort-'));
      const controller = new AbortController();
      let reads = 0;
      let readsAfterAbort = 0;
      const countedFs = {
        ...fs,
        readdir(path, options, callback) {
          reads++;
          if (controller.signal.aborted) readsAfterAbort++;
          fs.readdir(path, options, (error, entries) => {
            // Abort before returning the first directory's children to the walker.
            if (!controller.signal.aborted) controller.abort(new Error('cancel fixture traversal'));
            callback(error, entries);
          });
        },
      };
      try {
        for (const directory of ['a/one/deep', 'b/two/deep', 'c/three/deep']) {
          mkdirSync(join(root, directory), { recursive: true });
          writeFileSync(join(root, directory, 'file.js'), 'fixture');
        }
        let message = '';
        try {
          const walk = ${api}('**/*.js', { cwd: root, fs: countedFs, signal: controller.signal });
          ${api === 'glob' ? 'await walk;' : 'for await (const entry of walk) { void entry; }'}
        } catch (error) {
          message = error.message;
        }
        // A rejected walk must not continue recursively reading in the background.
        await new Promise(resolve => setTimeout(resolve, 50));
        console.log(JSON.stringify({ message, reads, readsAfterAbort }));
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    `);

    expect(result).toEqual({ message: 'cancel fixture traversal', reads: 1, readsAfterAbort: 0 });
  });
});
