import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import electronViteConfig from '@/../electron.vite.config.ts';

const repoRoot = path.resolve(__dirname, '../../../..');
const srcRoot = path.join(repoRoot, 'src');
const mixinsRoot = path.join(srcRoot, 'components', 'mixins');
const compatRoot = path.join(srcRoot, 'components', 'compat');
const walletLibRoot = path.join(srcRoot, 'lib', 'soraneo-wallet', 'lib');
const packageJsonPath = path.join(repoRoot, 'package.json');
const tsconfigPath = path.join(repoRoot, 'tsconfig.json');

const excludedPaths = [`${path.sep}lib${path.sep}`, `${path.sep}stubs${path.sep}`];
const blockedPatterns = [
  'vue-property-decorator',
  'vue-class-component',
  '@Singleton',
  '@/store/decorators',
  '@/store/direct-vuex',
  "from 'direct-vuex'",
  '@/components/compat',
];

const collectFiles = async (
  directory: string,
  predicate: (name: string) => boolean = () => true,
  excludeSegments: string[] = excludedPaths
): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(directory, entry.name);

      if (excludeSegments.some((segment) => resolved.includes(segment))) {
        return [];
      }

      if (entry.isDirectory()) {
        return collectFiles(resolved, predicate, excludeSegments);
      }

      if (!predicate(entry.name)) {
        return [];
      }

      return [resolved];
    })
  );

  return files.flat();
};

const collectSourceFiles = async (directory: string): Promise<string[]> =>
  collectFiles(directory, (name) => /\.(ts|vue)$/.test(name));

describe('Vue 3 modernization', () => {
  it('keeps app-owned source free of class/decorator imports', async () => {
    const files = await collectSourceFiles(srcRoot);
    const violations: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');

      if (blockedPatterns.some((pattern) => source.includes(pattern))) {
        violations.push(path.relative(repoRoot, file));
      }
    }

    expect(violations).toEqual([]);
  });

  it('does not keep app-owned mixin files under src/components/mixins', async () => {
    const files = await collectSourceFiles(mixinsRoot).catch(() => []);

    expect(files.map((file) => path.relative(repoRoot, file))).toEqual([]);
  });

  it('does not keep app-owned compat adapter files under src/components/compat', async () => {
    const files = await collectSourceFiles(compatRoot).catch(() => []);

    expect(files.map((file) => path.relative(repoRoot, file))).toEqual([]);
  });

  it('does not restore the external direct-vuex package dependency', async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies?.['direct-vuex']).toBeUndefined();
    expect(packageJson.devDependencies?.['direct-vuex']).toBeUndefined();
  });

  it('does not restore the legacy Vue class/decorator package dependencies', async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies?.['vue-class-component']).toBeUndefined();
    expect(packageJson.devDependencies?.['vue-class-component']).toBeUndefined();
    expect(packageJson.dependencies?.['vue-property-decorator']).toBeUndefined();
    expect(packageJson.devDependencies?.['vue-property-decorator']).toBeUndefined();
  });

  it('resolves @wallet/lib through the migrated wallet source tree', async () => {
    const tsconfig = JSON.parse(await readFile(tsconfigPath, 'utf8')) as {
      compilerOptions?: {
        experimentalDecorators?: boolean;
        paths?: Record<string, string[]>;
      };
    };

    expect(tsconfig.compilerOptions?.paths?.['@wallet/lib']).toEqual(['src/lib/soraneo-wallet/src/index.ts']);
    expect(tsconfig.compilerOptions?.paths?.['@wallet/lib/*']).toEqual(['src/lib/soraneo-wallet/src/*']);
    expect(tsconfig.compilerOptions?.experimentalDecorators).not.toBe(true);
  });

  it('keeps the electron renderer on the migrated wallet source tree', async () => {
    const aliases = Array.isArray(electronViteConfig.renderer?.resolve?.alias)
      ? electronViteConfig.renderer.resolve.alias
      : [];
    const walletAlias = aliases.find((entry) => entry.find === '@wallet/lib');

    expect(String(walletAlias?.replacement)).toContain('/src/lib/soraneo-wallet/src');
  });

  it('keeps vendored wallet lib limited to the prebuilt CSS asset', async () => {
    const files = await collectFiles(walletLibRoot, () => true, []).catch(() => []);
    const blockedArtifacts = files.filter((file) => {
      const basename = path.basename(file);

      return /\.(?:d\.ts|mjs|js|map|html)$/.test(file) || basename === 'env.json' || basename === 'favicon.ico';
    });

    expect(files.map((file) => path.relative(repoRoot, file))).toContain(
      'src/lib/soraneo-wallet/lib/soraneo-wallet-web.css'
    );
    expect(blockedArtifacts.map((file) => path.relative(repoRoot, file))).toEqual([]);
  });
});
