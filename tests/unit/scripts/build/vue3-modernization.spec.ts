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
const viteConfigPath = path.join(repoRoot, 'vite.config.mjs');
const isAllowedWalletShimFile = (relativePath: string) =>
  relativePath.startsWith(path.join('src', 'shims', 'wallet')) && relativePath.endsWith('.ts');

const excludedPaths = [`${path.sep}lib${path.sep}`, `${path.sep}stubs${path.sep}`];
const blockedPatterns = [
  'vue-property-decorator',
  'vue-class-component',
  '@Singleton',
  '@/store/decorators',
  '@/store/direct-vuex',
  "from 'direct-vuex'",
  "from 'vuex'",
  'from "vuex"',
  '@/components/compat',
  '@/utils/app-store',
  '@/utils/legacy-store',
  '@/compat/store',
  '@/store/bridge',
  '@/stores/compat',
  '@wallet/src',
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

  it('keeps app-owned source off the legacy WALLET_TYPES namespace', async () => {
    const files = await collectSourceFiles(srcRoot);
    const legacyWalletTypeNamespaceImports: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');

      if (/WALLET_TYPES/.test(source)) {
        legacyWalletTypeNamespaceImports.push(path.relative(repoRoot, file));
      }
    }

    expect(legacyWalletTypeNamespaceImports).toEqual([]);
  });

  it('keeps app-owned source off @wallet indexer namespaces and accessors', async () => {
    const files = await collectSourceFiles(srcRoot);
    const legacyWalletIndexerImports: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');

      if (
        /^import\s+[^;]*\b(?:getCurrentIndexer|SUBQUERY_TYPES|INDEXER_TYPES)\b[^;]*from ['"]@wallet['"]/m.test(source)
      ) {
        legacyWalletIndexerImports.push(path.relative(repoRoot, file));
      }
    }

    expect(legacyWalletIndexerImports).toEqual([]);
  });

  it('keeps app-owned source off legacy @wallet helper and component accessors', async () => {
    const files = await collectSourceFiles(srcRoot);
    const legacyWalletHelperImports: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');

      if (
        /^import\s+\*\s+as\s+walletModule\s+from ['"]@wallet['"]/m.test(source) ||
        /^import\s+[^;]*\b(?:beforeTransactionSign|getExplorerLinks|getAssetsSubset|groupRewardsByAssetsList|connection|AlertsApiService|initWallet|waitForCore|components)\b[^;]*from ['"]@wallet['"]/m.test(
          source
        )
      ) {
        legacyWalletHelperImports.push(path.relative(repoRoot, file));
      }
    }

    expect(legacyWalletHelperImports).toEqual([]);
  });

  it('keeps app-owned source off the @wallet api and accountUtils entrypoints', async () => {
    const files = await collectSourceFiles(srcRoot);
    const legacyWalletApiImports: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');

      if (/^import\s+[^;]*\b(?:api|accountUtils)\b[^;]*from ['"]@wallet['"]/m.test(source)) {
        legacyWalletApiImports.push(path.relative(repoRoot, file));
      }
    }

    expect(legacyWalletApiImports).toEqual([]);
  });

  it('keeps app-owned source off deep vendored wallet source imports', async () => {
    const files = await collectSourceFiles(srcRoot);
    const deepWalletSourceImports: string[] = [];

    for (const file of files) {
      const relative = path.relative(repoRoot, file);

      if (isAllowedWalletShimFile(relative)) {
        continue;
      }

      const source = await readFile(file, 'utf8');

      if (/@\/lib\/soraneo-wallet\/src\//.test(source)) {
        deepWalletSourceImports.push(relative);
      }
    }

    expect(deepWalletSourceImports).toEqual([]);
  });

  it('keeps app-owned source off the legacy WALLET_CONSTS UI enum namespace', async () => {
    const files = await collectSourceFiles(srcRoot);
    const legacyWalletUiEnumUsage: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');

      if (
        /WALLET_CONSTS\.(?:PaginationButton|FontSizeRate|FontWeightRate|LogoSize|ExplorerType|HiddenValue)/.test(source)
      ) {
        legacyWalletUiEnumUsage.push(path.relative(repoRoot, file));
      }
    }

    expect(legacyWalletUiEnumUsage).toEqual([]);
  });

  it('keeps app-owned source off the legacy WALLET_CONSTS namespace outside the wallet shim', async () => {
    const files = await collectSourceFiles(srcRoot);
    const legacyWalletConstsUsage: string[] = [];

    for (const file of files) {
      if (path.relative(repoRoot, file) === path.join('src', 'shims', 'wallet.ts')) {
        continue;
      }

      const source = await readFile(file, 'utf8');

      if (/WALLET_CONSTS/.test(source)) {
        legacyWalletConstsUsage.push(path.relative(repoRoot, file));
      }
    }

    expect(legacyWalletConstsUsage).toEqual([]);
  });

  it('does not keep app-owned mixin files under src/components/mixins', async () => {
    const files = await collectSourceFiles(mixinsRoot).catch(() => []);

    expect(files.map((file) => path.relative(repoRoot, file))).toEqual([]);
  });

  it('does not keep app-owned compat adapter files under src/components/compat', async () => {
    const files = await collectSourceFiles(compatRoot).catch(() => []);

    expect(files.map((file) => path.relative(repoRoot, file))).toEqual([]);
  });

  it('keeps app-owned runtime imports off non-style @wallet/lib entrypoints', async () => {
    const files = await collectSourceFiles(srcRoot);
    const runtimeWalletLibImports: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');

      if (/^import (?!type\b).*['"]@wallet\/lib(?!\/soraneo-wallet-web\.css)/m.test(source)) {
        runtimeWalletLibImports.push(path.relative(repoRoot, file));
      }
    }

    expect(runtimeWalletLibImports).toEqual([]);
  });

  it('keeps app-owned source off package-style @wallet/lib type and const paths', async () => {
    const files = await collectSourceFiles(srcRoot);
    const packageStyleWalletTypeImports: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');

      if (
        /@wallet\/lib\/types\//.test(source) ||
        /@wallet\/lib\/services\/indexer\/(?:types|subquery\/types|subsquid\/types)/.test(source) ||
        /@wallet\/lib\/consts/.test(source)
      ) {
        packageStyleWalletTypeImports.push(path.relative(repoRoot, file));
      }
    }

    expect(packageStyleWalletTypeImports).toEqual([]);
  });

  it('keeps app-owned source off the legacy @wallet/core and @wallet/internal entrypoints', async () => {
    const files = await collectSourceFiles(srcRoot);
    const legacyWalletEntrypoints: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');

      if (/@wallet\/(?:core|internal)/.test(source)) {
        legacyWalletEntrypoints.push(path.relative(repoRoot, file));
      }
    }

    expect(legacyWalletEntrypoints).toEqual([]);
  });

  it('does not restore the external direct-vuex package dependency', async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies?.['direct-vuex']).toBeUndefined();
    expect(packageJson.devDependencies?.['direct-vuex']).toBeUndefined();
  });

  it('does not restore the Vuex package dependency', async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies?.['vuex']).toBeUndefined();
    expect(packageJson.devDependencies?.['vuex']).toBeUndefined();
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

    expect(tsconfig.compilerOptions?.paths?.['@wallet/*']).toBeUndefined();
    expect(tsconfig.compilerOptions?.paths?.['@wallet/lib']).toEqual(['src/lib/soraneo-wallet/src/index.ts']);
    expect(tsconfig.compilerOptions?.paths?.['@wallet/lib/*']).toEqual(['src/lib/soraneo-wallet/src/*']);
    expect(tsconfig.compilerOptions?.paths?.['@wallet/vuex']).toBeUndefined();
    expect(tsconfig.compilerOptions?.experimentalDecorators).not.toBe(true);
  });

  it('keeps the electron renderer on the migrated wallet source tree', async () => {
    const aliases = Array.isArray(electronViteConfig.renderer?.resolve?.alias)
      ? electronViteConfig.renderer.resolve.alias
      : [];
    const walletAlias = aliases.find((entry) => entry.find === '@wallet/lib');

    expect(String(walletAlias?.replacement)).toContain('/src/lib/soraneo-wallet/src');
  });

  it('does not keep the removed @wallet/vuex alias in the main Vite config', async () => {
    const viteConfigSource = await readFile(viteConfigPath, 'utf8');

    expect(viteConfigSource).not.toContain('@wallet/vuex');
    expect(viteConfigSource).not.toContain('@wallet/src');
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
