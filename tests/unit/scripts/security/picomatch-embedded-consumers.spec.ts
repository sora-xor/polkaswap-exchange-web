import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

const requirePackage = createRequire(import.meta.url);
const rejection = /Repeated glob alternatives must be prefix-free ASCII literals/;

describe('tools that ship a private copy of Picomatch', () => {
  it('applies safe Prettier overrides and rejects ambiguous repetition when loading a project configuration', async () => {
    const prettier: typeof import('prettier') = requirePackage('prettier');
    const dir = await mkdtemp(join(tmpdir(), 'ps-prettier-glob-'));
    const config = join(dir, '.prettierrc');
    const target = join(dir, 'redblue.ts');
    try {
      await writeFile(config, JSON.stringify({ overrides: [{ files: '+(red|blue).ts', options: { tabWidth: 7 } }] }));
      expect(await prettier.resolveConfig(target, { config, useCache: false })).toEqual({ tabWidth: 7 });
      expect(await prettier.resolveConfig(join(dir, 'other.ts'), { config, useCache: false })).toEqual({});

      await writeFile(config, JSON.stringify({ overrides: [{ files: '+(red|RED).ts', options: { tabWidth: 7 } }] }));
      await expect(prettier.resolveConfig(target, { config, useCache: false })).rejects.toThrow(rejection);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('filters Rollup transform hooks through its embedded matcher', async () => {
    const { rollup }: typeof import('rollup') = requirePackage('rollup');
    const target = 'example/redblue.js';
    /** Compile one in-memory entry and return the generated JavaScript. */
    async function render(include: string): Promise<string> {
      const build = await rollup({
        input: target,
        plugins: [
          {
            name: 'glob-filter-fixture',
            resolveId: (id) => (id === target ? id : null),
            load: () => 'export default "initial";',
            transform: {
              filter: { id: { include } },
              handler: () => 'export default "transformed";',
            },
          },
        ],
      });
      try {
        const { output } = await build.generate({ format: 'es' });
        return output[0].code;
      } finally {
        await build.close();
      }
    }

    expect(await render('**/+(red|blue).js')).toContain('"transformed"');
    expect(await render('**/green.js')).toContain('"initial"');
    await expect(render('**/+(red|RED).js')).rejects.toThrow(rejection);
  });

  it.each([
    ['rollup', 'dist/shared/rollup.js', 1],
    ['rollup', 'dist/es/shared/node-entry.js', 1],
    ['rollup', 'dist/shared/index.js', 2],
    ['rollup', 'dist/es/shared/watch.js', 2],
    ['prettier', 'index.mjs', 1],
    ['playwright', 'lib/matchers/expect.js', 1],
  ] as const)('retains the guard at every embedded parser entry in %s/%s', async (name, path, expectedCopies) => {
    const root = dirname(requirePackage.resolve(name + '/package.json'));
    const source = await readFile(join(root, path), 'utf8');
    // These distributed bundles have independent copies, including ESM, CJS and watch entrypoints.
    const compilers = [...source.matchAll(/const extglobOpen = [^\n]+=> \{([\s\S]*?)const token\d* =/g)];
    expect(compilers).toHaveLength(expectedCopies);
    for (const [, entry] of compilers) expect(entry).toMatch(rejection);
  });
});
