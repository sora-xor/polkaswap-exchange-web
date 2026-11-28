import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const requireFromProject = createRequire(import.meta.url);

/** Resolve from the named consumer so this exercises its actual installed dependency. */
function requireFromConsumer(consumer: string) {
  return createRequire(requireFromProject.resolve(consumer));
}

describe('installed glob matcher consumers', () => {
  it('preserves Micromatch callbacks, scanning, captures and path matching', () => {
    const micromatch = requireFromProject('micromatch');
    const results: [string, boolean][] = [];
    const files = ['src/Wallet.vue', 'src/Wallet.ts', 'other/Wallet.vue'];
    const matches = micromatch(files, 'src/*.{ts,vue}', {
      onResult: ({ output, isMatch }: { output: string; isMatch: boolean }) => results.push([output, isMatch]),
    });

    expect(matches).toEqual(files.slice(0, 2));
    expect(results).toEqual([
      ['src/Wallet.vue', true],
      ['src/Wallet.ts', true],
      ['other/Wallet.vue', false],
    ]);
    expect(micromatch.scan('src/**/*.vue')).toMatchObject({ base: 'src', glob: '**/*.vue', isGlob: true });
    // capture() imports Picomatch's lib/utils subpath for platform-specific path handling.
    expect(micromatch.capture('src/*.vue', 'src/Wallet.vue')).toEqual(['Wallet']);
  });

  it('preserves watcher negation and Rollup module inclusion/exclusion', () => {
    const anymatch = requireFromProject('anymatch');
    const { createFilter } = requireFromProject('@rollup/pluginutils');
    const watched = anymatch(['**/*.vue', '!**/generated/**']);
    const included = createFilter('**/*.{vue,ts}', '**/generated/**', { resolve: false });

    expect(['src/Wallet.vue', 'generated/Wallet.vue', 'src/Wallet.css'].filter(watched)).toEqual(['src/Wallet.vue']);
    expect(['src/Wallet.vue', 'src/util.ts', 'src/generated/util.ts', 'logo.svg'].filter(included)).toEqual([
      'src/Wallet.vue',
      'src/util.ts',
    ]);
  });

  it('discovers nested files through Tinyglobby and its actual fdir matcher', async () => {
    const { glob } = requireFromProject('tinyglobby');
    const { fdir } = requireFromConsumer('tinyglobby')('fdir');
    const root = await mkdtemp(join(tmpdir(), 'polkaswap-matcher-'));
    try {
      await mkdir(join(root, 'src', 'generated'), { recursive: true });
      for (const file of ['src/Wallet.vue', 'src/swap.ts', 'src/generated/schema.ts', 'src/logo.svg']) {
        await writeFile(join(root, file), 'fixture');
      }
      const matches = await glob('src/**/*.{vue,ts}', { cwd: root, ignore: ['**/generated/**'] });
      expect(matches.sort()).toEqual(['src/Wallet.vue', 'src/swap.ts']);
      const crawled = await new fdir()
        .withRelativePaths()
        .withPathSeparator('/')
        .glob('**/*.vue')
        .crawl(root)
        .withPromise();
      expect(crawled).toEqual(['src/Wallet.vue']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.each(['micromatch', '@rollup/pluginutils'])(
    'supports unambiguous literal repeats and refuses unsupported alternatives for %s',
    (consumer) => {
      const matcher = requireFromConsumer(consumer)('picomatch');
      for (const options of [{}, { maxExtglobRecursion: false }]) {
        const select = matcher('images/+(dark|light).svg', options);
        expect(select('images/darklightdark.svg')).toBe(true);
        expect(select('images/photo.svg')).toBe(false);
        const layers = matcher('images/theme-*(dark|light).svg', options);
        expect(layers('images/theme-.svg')).toBe(true);
        expect(layers('images/theme-lightdark.svg')).toBe(true);
        // One wildcard can absorb concatenated filename segments without an outer repetition.
        const logo = matcher.makeRe('images/+(logo-*.svg)', options);
        expect(logo.test('images/logo-large.svglogo-small.svg')).toBe(true);
        expect(logo.source).not.toMatch(/\)[+*]/);
        // Case folding must not turn two supposedly separate alternatives into the same literal.
        expect(() => matcher.makeRe('images/+(dark|DARK).svg', options)).toThrow(SyntaxError);
        expect(() => matcher.makeRe('images/*(icon|icons).svg', options)).toThrow(SyntaxError);
        expect(() => matcher.makeRe('images/+(logo-*|icon-*)', options)).toThrow(SyntaxError);
      }
    }
  );
});
