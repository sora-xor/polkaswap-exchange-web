// @vitest-environment node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../..');
const srcRoot = path.join(repoRoot, 'src');
const walletSrcRoot = path.join(srcRoot, 'lib', 'soraneo-wallet', 'src');
const walletLibRoot = path.join(srcRoot, 'lib', 'soraneo-wallet', 'lib');
const appMixinsRoot = path.join(srcRoot, 'components', 'mixins');
const walletMixinsRoot = path.join(walletSrcRoot, 'components', 'mixins');
const compatRoot = path.join(srcRoot, 'components', 'compat');
const packageJsonPath = path.join(repoRoot, 'package.json');

const excludedSegments = [`${path.sep}lib${path.sep}`, `${path.sep}stubs${path.sep}`];

const collectFiles = async (
  directory: string,
  predicate: (name: string) => boolean,
  exclude: string[] = excludedSegments
): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(directory, entry.name);

      if (exclude.some((segment) => resolved.includes(segment))) {
        return [];
      }

      if (entry.isDirectory()) {
        return collectFiles(resolved, predicate, exclude);
      }

      return predicate(entry.name) ? [resolved] : [];
    })
  );

  return files.flat();
};

const collectSourceFiles = async (directory: string, exclude?: string[]): Promise<string[]> =>
  collectFiles(directory, (name) => /\.(ts|vue)$/.test(name), exclude);

describe('Vue 3 modernization', () => {
  it('keeps vendored wallet Vue source off Options API wrappers', async () => {
    const files = await collectFiles(walletSrcRoot, (name) => name.endsWith('.vue'), []);
    const offenders: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');

      if (
        /export\s+default\s+defineComponent\s*\(/.test(source) ||
        /^ {2}(?:data|computed|methods|watch)\s*:/m.test(source)
      ) {
        offenders.push(path.relative(repoRoot, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps app-owned source free of class/decorator imports', async () => {
    const files = await collectSourceFiles(srcRoot);
    const blockedPatterns = [
      'vue-property-decorator',
      'vue-class-component',
      '@Singleton',
      '@/store/decorators',
      '@/store/direct-vuex',
      "from 'direct-vuex'",
      'from "direct-vuex"',
      "from 'vuex'",
      'from "vuex"',
      '@/components/compat',
      '@/utils/app-store',
      '@/utils/legacy-store',
      '@/compat/store',
      '@/store/bridge',
      '@/stores/compat',
    ];
    const offenders: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');

      if (blockedPatterns.some((pattern) => source.includes(pattern))) {
        offenders.push(path.relative(repoRoot, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('does not keep mixin and compat directories in app or vendored wallet source', async () => {
    const appMixins = await collectSourceFiles(appMixinsRoot).catch(() => []);
    const walletMixins = await collectSourceFiles(walletMixinsRoot, []).catch(() => []);
    const compatFiles = await collectSourceFiles(compatRoot).catch(() => []);

    expect(appMixins.map((file) => path.relative(repoRoot, file))).toEqual([]);
    expect(walletMixins.map((file) => path.relative(repoRoot, file))).toEqual([]);
    expect(compatFiles.map((file) => path.relative(repoRoot, file))).toEqual([]);
  });

  it('does not restore legacy Vuex and decorator dependencies', async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies?.['direct-vuex']).toBeUndefined();
    expect(packageJson.devDependencies?.['direct-vuex']).toBeUndefined();
    expect(packageJson.dependencies?.vuex).toBeUndefined();
    expect(packageJson.devDependencies?.vuex).toBeUndefined();
    expect(packageJson.dependencies?.['vue-class-component']).toBeUndefined();
    expect(packageJson.devDependencies?.['vue-class-component']).toBeUndefined();
    expect(packageJson.dependencies?.['vue-property-decorator']).toBeUndefined();
    expect(packageJson.devDependencies?.['vue-property-decorator']).toBeUndefined();
  });

  it('keeps vendored wallet lib limited to the prebuilt CSS asset', async () => {
    const files = await collectFiles(walletLibRoot, () => true, []).catch(() => []);
    const blockedArtifacts = files.filter((file) => {
      const basename = path.basename(file);

      return /\.(?:d\.ts|mjs|js|map|html)$/.test(file) || basename === 'env.json' || basename === 'favicon.ico';
    });

    expect(files.map((file) => path.relative(repoRoot, file))).toContain(
      path.join('src', 'lib', 'soraneo-wallet', 'lib', 'soraneo-wallet-web.css')
    );
    expect(blockedArtifacts.map((file) => path.relative(repoRoot, file))).toEqual([]);
  });
});
