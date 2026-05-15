// @vitest-environment node
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');
const srcRoot = path.join(repoRoot, 'src');
const testsRoot = path.join(repoRoot, 'tests');
const scriptsRoot = path.join(repoRoot, 'scripts');

const runtimeFilePattern = /\.(ts|vue)$/;
const textFilePattern = /\.(ts|vue|mjs|json|md)$/;

const walletPackage = `@${'wallet'}`;
const walletAliasRe = new RegExp(`${walletPackage}(?!connect)(?:${path.posix.sep}|['"\`])`);
const sharedWalletFacadeSegment = ['shared', 'ui', 'wallet-components'].join('/');
const sharedWalletModuleSegment = ['shared', 'ui', 'wallet'].join('/');
const walletCoreSegment = ['utils', 'walletCore'].join('/');
const walletShimSegment = ['shims', 'wallet'].join('/');
const deletedRegistrySegment = ['components', 'registry'].join('/');
const deletedMstWarningBridgeSegment = ['components', 'App', 'BrowserNotification', 'MSTWarningBridge.vue'].join('/');
const oldBridgePageComponentsSegment = ['components', 'pages', 'Bridge'].join('/');
const legacySegment = `${path.posix.sep}legacy${path.posix.sep}`;
const deletedBridgeCompatImports = new Set([
  '@/stores/bridge/history',
  '@/stores/bridge/form',
  '@/stores/bridge/transactions',
  '@/stores/bridge/sync',
  '@/stores/router/sync',
]);
const allowedViewImports = new Set(['@/views/Sccp.vue']);
const allowedViewPrefixes = ['@/views/utils/', '@/views/Explore/poolsTable'];
const allowedModuleViewImports = new Set(['@/modules/pool/views/Pool.vue']);
const routerHelperFiles = [
  path.join(srcRoot, 'router', 'index.ts'),
  path.join(srcRoot, 'router', 'lazy.ts'),
  path.join(srcRoot, 'modules', 'dashboard', 'router.ts'),
  path.join(srcRoot, 'modules', 'pool', 'router.ts'),
  path.join(srcRoot, 'modules', 'staking', 'router.ts'),
  path.join(srcRoot, 'modules', 'vault', 'router.ts'),
];

const deletedRuntimeFiles = [
  path.join(srcRoot, 'shared', 'ui', 'wallet-components.ts'),
  path.join(srcRoot, 'shared', 'ui', 'wallet.ts'),
  path.join(srcRoot, 'lib', 'soraneo-wallet', 'src', 'components', 'registry.ts'),
  path.join(srcRoot, 'utils', 'walletCore.ts'),
  path.join(srcRoot, 'stores', 'bridge', 'history.ts'),
  path.join(srcRoot, 'stores', 'bridge', 'form.ts'),
  path.join(srcRoot, 'stores', 'bridge', 'transactions.ts'),
  path.join(srcRoot, 'stores', 'bridge', 'sync.ts'),
  path.join(srcRoot, 'stores', 'router', 'sync.ts'),
  path.join(srcRoot, 'components', 'App', 'BrowserNotification', 'MSTWarningBridge.vue'),
  path.join(scriptsRoot, 'refactors', 'lazyWalletCore.mjs'),
  path.join(scriptsRoot, 'refactors', 'lazyWalletCoreVue.mjs'),
  path.join(srcRoot, 'views', 'AddLiquidity.vue'),
  path.join(srcRoot, 'views', 'AssetOwnerContainer.vue'),
  path.join(srcRoot, 'views', 'Bridge.vue'),
  path.join(srcRoot, 'views', 'BridgeContainer.vue'),
  path.join(srcRoot, 'views', 'BridgeTransaction.vue'),
  path.join(srcRoot, 'views', 'BridgeTransactionsHistory.vue'),
  path.join(srcRoot, 'views', 'Burn.vue'),
  path.join(srcRoot, 'views', 'CedeStore.vue'),
  path.join(srcRoot, 'views', 'DepositOptions.vue'),
  path.join(srcRoot, 'views', 'DepositTxHistory.vue'),
  path.join(srcRoot, 'views', 'Explore', 'Books.vue'),
  path.join(srcRoot, 'views', 'Explore', 'Container.vue'),
  path.join(srcRoot, 'views', 'Explore', 'Demeter.vue'),
  path.join(srcRoot, 'views', 'Explore', 'Pools.vue'),
  path.join(srcRoot, 'views', 'Explore', 'Tokens.vue'),
  path.join(srcRoot, 'views', 'OrderBook.vue'),
  path.join(srcRoot, 'views', 'PointSystem.vue'),
  path.join(srcRoot, 'views', 'PointSystemV2.vue'),
  path.join(srcRoot, 'views', 'PointSystemWrapper.vue'),
  path.join(srcRoot, 'views', 'ReferralBonding.vue'),
  path.join(srcRoot, 'views', 'ReferralProgram.vue'),
  path.join(srcRoot, 'views', 'Rewards.vue'),
  path.join(srcRoot, 'views', 'RewardsTabs.vue'),
  path.join(srcRoot, 'views', 'StakingContainer.vue'),
  path.join(srcRoot, 'views', 'Stats.vue'),
  path.join(srcRoot, 'views', 'Swap.vue'),
  path.join(srcRoot, 'views', 'Wallet.vue'),
  path.join(srcRoot, 'modules', 'dashboard', 'views', 'AssetOwner.vue'),
  path.join(srcRoot, 'modules', 'dashboard', 'views', 'AssetOwnerDetails.vue'),
  path.join(srcRoot, 'modules', 'pool', 'views', 'PoolContainer.vue'),
  path.join(srcRoot, 'modules', 'staking', 'views', 'Staking.vue'),
  path.join(srcRoot, 'modules', 'staking', 'demeter', 'views', 'DataContainer.vue'),
  path.join(srcRoot, 'modules', 'staking', 'demeter', 'views', 'Pool.vue'),
  path.join(srcRoot, 'modules', 'staking', 'sora', 'views', 'DataContainer.vue'),
  path.join(srcRoot, 'modules', 'staking', 'sora', 'views', 'Overview.vue'),
  path.join(srcRoot, 'modules', 'staking', 'sora', 'views', 'SelectValidators.vue'),
  path.join(srcRoot, 'modules', 'staking', 'sora', 'views', 'ValidatorsType.vue'),
  path.join(srcRoot, 'modules', 'vault', 'views', 'VaultDetails.vue'),
  path.join(srcRoot, 'modules', 'vault', 'views', 'Vaults.vue'),
  path.join(srcRoot, 'modules', 'vault', 'views', 'VaultsContainer.vue'),
];

const configFiles = [
  path.join(repoRoot, 'package.json'),
  path.join(repoRoot, 'tsconfig.json'),
  path.join(repoRoot, 'vite.config.mjs'),
  path.join(repoRoot, 'electron.vite.config.ts'),
  path.join(testsRoot, 'README.md'),
  path.join(testsRoot, 'setup', 'vitest.setup.ts'),
];

const importSpecifierRe = /from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const deletedLazyHelperRe =
  /\b(?:lazyView|poolLazyView|stakingLazyView|demeterStakingLazyView|soraStakingLazyView|vaultLazyView|dashboardLazyView)\b/;

const relativeToRepo = (file: string): string => path.relative(repoRoot, file);

const fileExists = async (file: string): Promise<boolean> => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

const collectFiles = async (
  directory: string,
  predicate: (file: string) => boolean,
  excludeSegments: string[] = []
): Promise<string[]> => {
  if (!(await fileExists(directory))) {
    return [];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(directory, entry.name);

      if (excludeSegments.some((segment) => resolved.includes(segment))) {
        return [];
      }

      if (entry.isDirectory()) {
        return collectFiles(resolved, predicate, excludeSegments);
      }

      return predicate(resolved) ? [resolved] : [];
    })
  );

  return nested.flat();
};

const collectImports = (source: string): string[] =>
  [...source.matchAll(importSpecifierRe)]
    .map((match) => match[1] ?? match[2])
    .filter((specifier): specifier is string => Boolean(specifier));

const hasDeletedBoundaryImport = (specifier: string): boolean => {
  const normalized = specifier.replaceAll('\\', '/');
  const normalizedPath = normalized.split('?')[0] ?? normalized;
  const isDeletedViewImport =
    normalizedPath.startsWith('@/views/') &&
    !allowedViewImports.has(normalizedPath) &&
    !allowedViewPrefixes.some((prefix) => normalizedPath.startsWith(prefix));
  const isDeletedModuleViewImport =
    normalizedPath.includes('/views/') &&
    normalizedPath.startsWith('@/modules/') &&
    !allowedModuleViewImports.has(normalizedPath);

  return (
    deletedBridgeCompatImports.has(normalizedPath) ||
    isDeletedViewImport ||
    isDeletedModuleViewImport ||
    normalizedPath.includes(sharedWalletFacadeSegment) ||
    normalizedPath.includes(sharedWalletModuleSegment) ||
    normalizedPath.includes(walletCoreSegment) ||
    normalizedPath.includes(walletShimSegment) ||
    normalizedPath.includes(deletedRegistrySegment) ||
    normalizedPath.includes(deletedMstWarningBridgeSegment) ||
    normalizedPath.includes(oldBridgePageComponentsSegment) ||
    normalizedPath.includes(legacySegment)
  );
};

describe('direct-import architecture guards', () => {
  it('removes all deleted runtime boundary files', async () => {
    const featureFiles = await collectFiles(path.join(srcRoot, 'features'), (file) => runtimeFilePattern.test(file));
    const legacyFiles = featureFiles.filter((file) => file.includes(`${path.sep}legacy${path.sep}`));
    const shimFiles = await collectFiles(
      path.join(srcRoot, 'shims'),
      (file) => path.basename(file).startsWith('wallet') && file.endsWith('.ts')
    );
    const lingeringDeletedFiles = (
      await Promise.all(
        deletedRuntimeFiles.map(async (file) => ((await fileExists(file)) ? relativeToRepo(file) : null))
      )
    ).filter((file): file is string => Boolean(file));

    expect(legacyFiles.map(relativeToRepo)).toEqual([]);
    expect(shimFiles.map(relativeToRepo)).toEqual([]);
    expect(lingeringDeletedFiles).toEqual([]);
  });

  it('keeps runtime source off deleted wallet and legacy entrypoints', async () => {
    const files = await collectFiles(srcRoot, (file) => runtimeFilePattern.test(file));
    const offenders: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');
      const blockedImports = collectImports(source).filter(hasDeletedBoundaryImport);

      if (blockedImports.length) {
        offenders.push(`${relativeToRepo(file)} -> ${blockedImports.join(', ')}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps tests, configs, and scripts off removed aliases and wrappers', async () => {
    const testFiles = await collectFiles(testsRoot, (file) => textFilePattern.test(file), [
      `${path.sep}coverage${path.sep}`,
    ]);
    const scriptFiles = await collectFiles(scriptsRoot, (file) => textFilePattern.test(file));
    const files = [...testFiles, ...scriptFiles, ...configFiles];
    const offenders: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');
      const hasDeletedWrapperReference =
        walletAliasRe.test(source) ||
        source.includes(sharedWalletFacadeSegment) ||
        source.includes(sharedWalletModuleSegment) ||
        source.includes(walletCoreSegment) ||
        source.includes(walletShimSegment) ||
        source.includes(deletedRegistrySegment) ||
        source.includes(deletedMstWarningBridgeSegment);
      const blockedImports = collectImports(source).filter(hasDeletedBoundaryImport);

      if (hasDeletedWrapperReference || blockedImports.length) {
        offenders.push(`${relativeToRepo(file)}${blockedImports.length ? ` -> ${blockedImports.join(', ')}` : ''}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('removes dead lazy-view helpers and router compat seams', async () => {
    const offenders: string[] = [];

    for (const file of routerHelperFiles) {
      const source = await readFile(file, 'utf8');

      if (deletedLazyHelperRe.test(source)) {
        offenders.push(relativeToRepo(file));
      }
    }

    expect(offenders).toEqual([]);
  });
});
